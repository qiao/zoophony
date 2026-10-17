/**
 * Renders the gallery cat of the built site standing in the rest pose from the front at 600 × 600:
 * node docs/research/2026-10-16-cat-seat/front.ts <out.png> [port]
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { openShot, startSite } from '../../../tools/screenshots.ts';

const out = process.argv[2] ?? 'scratch/front.png';
const site = await startSite(join(import.meta.dirname, '..', '..', '..'), Number(process.argv[3] ?? 4331));
try {
  const url = new URL(
    'gallery.html?page=species&only=cat&stand&rest&body&zoom=1&azimuth=0&elevation=4',
    site.base,
  ).href;
  const page = await openShot(site.browser, url, {
    file: '',
    path: url,
    width: 600,
    height: 600,
    ready: 'canvas[data-ready="species"]',
  });
  await page.addStyleTag({ content: '#controls, #labels { display: none; }' });
  await page.waitForTimeout(400);
  await writeFile(out, await page.screenshot({ type: 'png' }));
  await page.close();
} finally {
  await site.close();
}
