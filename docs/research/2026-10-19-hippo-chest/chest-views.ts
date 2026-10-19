// Renders large close views of the hippo bassist at chosen angles, zooms, and times.
// Usage: node docs/research/2026-10-19-hippo-chest/chest-views.ts <dist dir> <out dir> <name>:<azimuth>:<elevation>:<zoom>:<time>[:<move>]...
// <move> is lift50 or lower50. The notes are those of the role bassist of close-views.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { chromium } from '@playwright/test';
import { preview } from 'vite';

import { chromiumArgs } from '../../../tools/chromium-args.ts';
import { openShot } from '../../../tools/screenshots.ts';

const NOTES = ['0.5 2 G2', '3 0.25 E1', '3.25 0.25 G2', '3.5 0.25 E1'].join('\n');
const [dist, out, ...specs] = process.argv.slice(2);
if (!dist || !out || specs.length === 0) {
  console.error('usage: node docs/research/2026-10-19-hippo-chest/chest-views.ts <dist> <out> <spec>...');
  process.exit(1);
}
await mkdir(out, { recursive: true });
const server = await preview({ root: process.cwd(), build: { outDir: dist }, preview: { port: 4311, strictPort: false, open: false } });
const site = server.resolvedUrls?.local[0] ?? '';
const browser = await chromium.launch({ args: chromiumArgs(process.platform) });
try {
  for (const spec of specs) {
    const [name, az, el, zoom, time, move] = spec.split(':');
    const query = new URLSearchParams({
      page: 'species',
      only: 'hippo',
      zoom: zoom ?? '1',
      azimuth: az ?? '0',
      elevation: el ?? '20',
    });
    query.set('body', '');
    if (move === 'rest') query.set('rest', '');
    if (move?.startsWith('lift')) query.set('lift', String(Number(move.slice(4)) / 100));
    if (move?.startsWith('lower')) query.set('lower', String(Number(move.slice(5)) / 100));
    const path = `/gallery.html?${query.toString()}`;
    const page = await openShot(
      browser,
      new URL(path.slice(1), site).href,
      { file: '', path, width: 600, height: 750, ready: 'canvas[data-ready="species"]' },
      2,
    );
    await page.addStyleTag({ content: '#controls, #labels { display: none; }' });
    await page.evaluate(
      ({ t, notes }) => {
        const input = document.querySelector('#notes');
        if (input instanceof HTMLTextAreaElement) {
          input.value = notes;
          input.dispatchEvent(new Event('input'));
        }
        const slider = document.querySelector('#time');
        if (slider instanceof HTMLInputElement) {
          slider.value = String(t);
          slider.dispatchEvent(new Event('input'));
        }
      },
      { t: Number(time ?? '0.55'), notes: NOTES },
    );
    await page.waitForTimeout(400);
    await writeFile(join(out, `${name}.png`), await page.screenshot({ type: 'png' }));
    await page.close();
    console.log(`wrote ${name}`);
  }
} finally {
  await browser.close();
  await server.close();
}
