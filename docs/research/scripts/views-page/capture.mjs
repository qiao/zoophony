// Captures the views page of each model sheet at the size of the sheet image. Run it from the
// root of the repository, with `pnpm dev` or `vite preview` on <base-url>.
//
//   node docs/research/scripts/views-page/capture.mjs <base-url> <out-dir> [ids...]
//
// The ids are fox, rabbit, dog, and polar-bear (all by default). Each page is saved as
// <out-dir>/<id>-page.png. The fox page is half of the size of fox-views.png, so the capture has
// 2 device pixels for each CSS pixel.
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(join(process.cwd(), 'package.json'));
const { chromium } = require('@playwright/test');

const SIZES = {
  fox: [1247, 677, 2],
  rabbit: [1280, 720, 1],
  dog: [1280, 720, 1],
  'polar-bear': [1280, 720, 1],
};

const [base, out, ...rest] = process.argv.slice(2);
const ids = rest.length > 0 ? rest : Object.keys(SIZES);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
try {
  for (const id of ids) {
    const [width, height, scale] = SIZES[id];
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
    await page.goto(`${base}/views.html?sheet=${id}`);
    await page.waitForSelector('canvas[data-ready="views"]', { timeout: 120000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(out, `${id}-page.png`) });
    await page.close();
  }
} finally {
  await browser.close();
}
