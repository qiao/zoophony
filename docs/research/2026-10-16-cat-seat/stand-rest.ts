/**
 * Renders the gallery species standing in the rest pose from the front and the right side:
 * node docs/research/2026-10-16-cat-seat/stand-rest.ts <out dir> <species>...
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { openShot, startSite } from '../../../tools/screenshots.ts';

const [out = 'scratch/stand', ...species] = process.argv.slice(2);
await mkdir(out, { recursive: true });
const site = await startSite(join(import.meta.dirname, '..', '..', '..'), 4333);
try {
  for (const s of species) {
    for (const [name, az] of [['front', 0], ['side', 90]] as const) {
      const url = new URL(`gallery.html?page=species&only=${s}&stand&rest&body&zoom=1&azimuth=${az}&elevation=4`, site.base).href;
      const page = await openShot(site.browser, url, { file: '', path: url, width: 420, height: 640, ready: 'canvas[data-ready="species"]' });
      await page.addStyleTag({ content: '#controls, #labels { display: none; }' });
      await page.waitForTimeout(400);
      await writeFile(join(out, `stand-${s}-${name}.png`), await page.screenshot({ type: 'png' }));
      await page.close();
    }
  }
} finally {
  await site.close();
}
