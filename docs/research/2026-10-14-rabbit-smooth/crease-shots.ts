// Captures the sheet pages of the three studio bodies and the play frame of the default demo from
// a running site, for the facet contrast of each crease angle.
// Usage: node scratch/crease-shots.ts <base url> <out dir> <label> [--no-play]
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { openShot } from '../../../tools/screenshots.ts';
import { VIEW_SHEETS } from '../../../src/gallery/sheets.ts';
import { FIRST_PLAY, SAMPLES_READY } from '../../../src/app/dev-hook.ts';

const [base = '', out = '', label = ''] = process.argv.slice(2);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});
try {
  for (const id of ['rabbit', 'bear', 'polar-bear'] as const) {
    const sheet = VIEW_SHEETS[id];
    const path = `/views.html?sheet=${id}`;
    const page = await openShot(browser, base + path.slice(1), { file: '', path, width: sheet.width, height: sheet.height, ready: '[data-ready="views"]' }, sheet.sheetScale);
    await writeFile(join(out, `${label}-sheet-${id}.png`), await page.screenshot({ type: 'png' }));
    await page.close();
  }
  if (!process.argv.includes('--no-play')) {
    const shot = { file: '', path: '/#demo=boulanger-matin', width: 1440, height: 900, ready: SAMPLES_READY };
    const page = await openShot(browser, base + shot.path.slice(1), shot, 2);
    await page.click(FIRST_PLAY);
    await page.waitForTimeout(1500);
    await page.click('.close-drawer');
    await page.getByRole('button', { name: 'Reset view' }).click();
    await page.mouse.move(720, 450);
    await page.$eval('.seek', (element) => {
      if (element instanceof HTMLInputElement) {
        element.value = '30';
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.waitForTimeout(3500);
    await writeFile(join(out, `${label}-play.png`), await page.screenshot({ type: 'png' }));
    await page.close();
  }
} finally {
  await browser.close();
}
console.log('done', label);
