// Captures the views page (with the capture patch of views-patch.py) at 2 times its size, and
// the default view of a demo at 1440 x 900 (2 device pixels for each CSS pixel), before play
// and after 6 s of play. Run it from the root of the repository, with vite on <base-url>.
//
//   node capture.mjs <base-url> <out-prefix> [views|first|play|all] [demo-id]
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(join(process.cwd(), 'package.json'));
const { chromium } = require('@playwright/test');

const [base, prefix, what = 'all', demo = 'boulanger'] = process.argv.slice(2);
const browser = await chromium.launch({
  args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});
try {
  if (what === 'views' || what === 'all') {
    const page = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 3 });
    await page.goto(base + 'views.html');
    await page.waitForSelector('canvas[data-ready="views"]', { timeout: 120000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${prefix}-views.png` });
    await page.close();
  }
  if (what === 'first' || what === 'all') {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    await page.goto(base + '#demo=' + demo);
    await page.waitForSelector(`canvas[data-demo="${demo}"]`, { timeout: 180000 });
    await page.waitForTimeout(1500);
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `${prefix}-first-${demo}.png` });
    await page.close();
  }
  if (what === 'play' || what === 'all') {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    await page.goto(base + '#demo=' + demo);
    await page.waitForSelector('body[data-samples="ready"]', { timeout: 180000 });
    await page.click('.first-screen .play');
    await page.waitForTimeout(6000);
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `${prefix}-play-${demo}.png` });
    await page.close();
  }
} finally {
  await browser.close();
}
