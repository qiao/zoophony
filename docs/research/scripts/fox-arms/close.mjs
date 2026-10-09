// Captures the red foxes of the default view during play, at 3 device pixels for each CSS pixel.
// Run it from the root of the repository, with `pnpm dev` or `vite preview` on <base-url>.
//
//   node docs/research/scripts/fox-arms/close.mjs <base-url> <out-prefix> [seconds...]
//
// For each play time (default 6 and 8 s), it writes <out-prefix>-<seconds>s.png: the box of the
// second violins, from (280, 330) to (560, 530) of the view of 1440 x 900.
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(join(process.cwd(), 'package.json'));
const { chromium } = require('@playwright/test');

const [base, prefix, ...rest] = process.argv.slice(2);
const times = rest.length > 0 ? rest.map(Number) : [6, 8];
const browser = await chromium.launch({
  args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3 });
  await page.goto(base);
  await page.waitForSelector('body[data-samples="ready"]', { timeout: 120000 });
  await page.click('.first-screen .play');
  const start = Date.now();
  for (const seconds of times.toSorted((a, b) => a - b)) {
    await page.waitForTimeout(Math.max(0, seconds * 1000 - (Date.now() - start)));
    await page.screenshot({
      path: `${prefix}-${seconds}s.png`,
      clip: { x: 280, y: 330, width: 280, height: 200 },
    });
  }
  await page.close();
} finally {
  await browser.close();
}
