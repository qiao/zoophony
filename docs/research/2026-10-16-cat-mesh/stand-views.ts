/**
 * Renders the gallery cat of the built site standing in the rest pose from the four sides of the
 * sheet: the front, the left side, the back, and three quarters. Usage:
 * node docs/research/2026-10-16-cat-mesh/stand-views.ts <out dir>
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { openShot, startSite } from '../../../tools/screenshots.ts';

const out = process.argv[2] ?? 'scratch/img/stand';
const site = await startSite(join(import.meta.dirname, '..', '..', '..'), 4323);
try {
  for (const [name, az] of [['front', 0], ['left', -90], ['back', 180], ['q45', -45]] as const) {
    const url = new URL(`gallery.html?page=species&only=cat&stand&rest&body&zoom=1&azimuth=${az}&elevation=4`, site.base).href;
    const page = await openShot(site.browser, url, { file: '', path: url, width: 420, height: 640, ready: 'canvas[data-ready="species"]' });
    await page.addStyleTag({ content: '#controls, #labels { display: none; }' });
    await page.waitForTimeout(400);
    await writeFile(join(out, `stand-${name}.png`), await page.screenshot({ type: 'png' }));
    await page.close();
  }
} finally {
  await site.close();
}
