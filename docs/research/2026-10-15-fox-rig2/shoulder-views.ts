// Probe: renders the red fox violinist of the gallery close from the front right at the frog and
// the tip of a whole bow, one PNG for each tree, moment, and view. pair.py puts main above the
// working tree.
// Usage: node docs/research/2026-10-15-fox-rig2/shoulder-views.ts <out dir>   (run `pnpm build` first)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Browser } from 'playwright';

import { ROLE_VIEWS, closeViewPath } from '../../../tools/close-views.ts';
import { withRefBuild } from '../../../tools/ref-tree.ts';
import { openShot, startSite, toWebp } from '../../../tools/screenshots.ts';

const out = process.argv[2] ?? 'scratch/shoulder';
mkdirSync(out, { recursive: true });
const base = ROLE_VIEWS['fox-violinist'];
const role = { ...base, camera: { kind: 'body', zoom: 2.2, elevation: 10 } } as typeof base;
const views = [
  { name: 'front-right', azimuth: 40 },
  { name: 'right', azimuth: 80 },
];
const moments = base.moments.filter((m) => m.name === 'frog' || m.name === 'tip');

async function shots(browser: Browser, site: string, label: string): Promise<string[]> {
  const files: string[] = [];
  for (const moment of moments) {
    for (const view of views) {
      const path = closeViewPath(role, view, moment);
      const page = await openShot(browser, new URL(path.slice(1), site).href, {
        file: '',
        path,
        width: 480,
        height: 480,
        ready: 'canvas[data-ready="species"]',
      });
      await page.addStyleTag({ content: '#controls, #labels { display: none; }' });
      await page.evaluate(
        ({ time, notes }) => {
          const input = document.querySelector('#notes');
          if (notes !== null && input instanceof HTMLTextAreaElement) {
            input.value = notes;
            input.dispatchEvent(new Event('input'));
          }
          const slider = document.querySelector('#time');
          if (slider instanceof HTMLInputElement) {
            slider.value = String(time);
            slider.dispatchEvent(new Event('input'));
          }
        },
        { time: moment.time, notes: role.notes },
      );
      await page.waitForTimeout(400);
      const file = join(out, `${label}-${moment.name}-${view.name}.png`);
      writeFileSync(file, await page.screenshot({ type: 'png' }));
      await page.close();
      files.push(file);
    }
  }
  return files;
}

const tree = await startSite(join(import.meta.dirname, '..', '..', '..'), 4321);
try {
  await shots(tree.browser, tree.base, 'tree');
} finally {
  await tree.close();
}
await withRefBuild(
  'main',
  async (dir) => {
    const site = await startSite(dir, 4331);
    try {
      await shots(site.browser, site.base, 'main');
    } finally {
      await site.close();
    }
  },
  undefined,
  ['src/gallery'],
);
void toWebp;
console.log('done', out);
