// Captures the row of the other animals of the views page at 3 times the size, and the default
// view after 6 s of play at 1440 x 900 (2 device pixels for each CSS pixel). Run it from the
// root of the repository, with `pnpm dev` on <base-url>.
//
//   node capture.mjs <base-url> <out-prefix> [views|play|both]
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(join(process.cwd(), 'package.json'));
const { chromium } = require('@playwright/test');

const [base, prefix, what = 'both'] = process.argv.slice(2);
const browser = await chromium.launch({
  args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});
try {
  if (what === 'views' || what === 'both') {
    const page = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 3 });
    await page.goto(base + 'views.html');
    await page.waitForSelector('canvas[data-ready="views"]', { timeout: 120000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${prefix}-views.png`, clip: { x: 0, y: 650, width: 1024, height: 330 } });
    await page.close();
  }
  if (what === 'play' || what === 'both') {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    await page.goto(base);
    await page.waitForSelector('body[data-samples="ready"]', { timeout: 180000 });
    await page.click('.first-screen .play');
    await page.waitForTimeout(6000);
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `${prefix}-play.png` });
    await page.close();
  }
  if (what.startsWith('first')) {
    // The default view of a demo before play: first or first:<demo-id>.
    const id = what.split(':')[1] ?? 'boulanger';
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    await page.goto(base + '#demo=' + id);
    await page.waitForSelector(`canvas[data-demo="${id}"]`, { timeout: 180000 });
    await page.waitForTimeout(1500);
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `${prefix}-first-${id}.png` });
    await page.close();
  }
} finally {
  await browser.close();
}
