/**
 * Renders gallery close views of one animal with a line camera at a given height, at 2x, from a
 * built site (`pnpm exec vite build --outDir <dist dir>`). The query `only` takes a species, or an
 * instrument for a species with several instruments, as the badger. Usage:
 * node docs/research/2026-10-20-badger-mesh/face-shots.ts <dist dir> <out dir> <only> <target m> <zoom> <name>=<azimuth>,<elevation>[,rest|stand]...
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { openShot, startSite } from '../../../tools/screenshots.ts';

const [dist, out, species, target, zoom, ...views] = process.argv.slice(2);
if (!dist || !out || !species || !target || !zoom) {
  throw new Error('usage');
}
await mkdir(out, { recursive: true });
const root = resolve(import.meta.dirname, '../../..');
const site = await startSite(root, 4310, resolve(dist));
try {
  for (const spec of views) {
    const [name, rest] = spec.split('=');
    const [azimuth, elevation, mode] = (rest ?? '').split(',');
    const query = new URLSearchParams({
      page: 'species',
      only: species,
      zoom,
      azimuth: azimuth ?? '0',
      elevation: elevation ?? '5',
      target,
      x: '0',
      z: '0',
    });
    if (mode === 'rest') query.set('rest', '');
    if (mode === 'stand') query.set('stand', '');
    const path = `/gallery.html?${query.toString()}`;
    const page = await openShot(
      site.browser,
      new URL(path.slice(1), site.base).href,
      { file: '', path, width: 400, height: 400, ready: 'canvas[data-ready="species"]' },
      2,
    );
    await page.addStyleTag({ content: '#controls, #labels { display: none; }' });
    await page.waitForTimeout(500);
    const png = await page.screenshot({ type: 'png' });
    await writeFile(join(out, `${name}.png`), png);
    await page.close();
    console.log(join(out, `${name}.png`));
  }
} finally {
  await site.close();
}
