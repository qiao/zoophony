/**
 * Renders the gallery cat of the built site (`dist/` of the worktree): the head close from the front with the pea
 * eyes, standing in the rest pose. Usage: `node docs/research/2026-10-16-cat-mesh/head-close.ts <out dir> [target m]`.
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { openShot, startSite } from '../../../tools/screenshots.ts';

const out = process.argv[2] ?? 'scratch/head';
const target = process.argv[3] ?? '0.70';
const site = await startSite(join(import.meta.dirname, '..', '..', '..'), 4321);
try {
  for (const [name, query] of [
    ['head-front', `zoom=6&target=${target}&x=-0.13&azimuth=0&elevation=4`],
    ['head-q35', `zoom=6&target=${target}&x=-0.13&azimuth=35&elevation=4`],
    ['body-front', 'body&zoom=1&azimuth=0&elevation=6'],
  ] as const) {
    const url = new URL(`gallery.html?page=species&only=cat&stand&rest&${query}`, site.base).href;
    const page = await openShot(site.browser, url, {
      file: '',
      path: url,
      width: 600,
      height: 600,
      ready: 'canvas[data-ready="species"]',
    });
    await page.addStyleTag({ content: '#controls, #labels { display: none; }' });
    await page.waitForTimeout(400);
    await writeFile(join(out, `${name}.png`), await page.screenshot({ type: 'png' }));
    await page.close();
    console.log(`wrote ${name}.png`);
  }
} finally {
  await site.close();
}
