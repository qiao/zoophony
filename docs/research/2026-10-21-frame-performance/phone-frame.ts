/**
 * Measures the frame rate of the default demo at the low tier in a phone view of Google Chrome
 * with a CPU throttle, as a proxy for a phone (design 9.7, the report
 * `2026-10-21-frame-performance.md`). Run from the repository root after `pnpm frame` wrote its
 * files once: `node docs/research/2026-10-21-frame-performance/phone-frame.ts [<throttle>]`.
 *
 * The page is 390 × 844 CSS pixels at the device scale 3, with touch, so the app starts at the low
 * tier (design 2.6). The probe plays the demo for 4 s, then counts the frames of the page for
 * 10 s with `requestAnimationFrame`. The CPU throttle (default 4) slows the main thread of the page
 * only. The GPU stays the GPU of the development Mac.
 */
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

import { FIRST_PLAY, SAMPLES_READY } from '../../../src/app/dev-hook.ts';
import { chromiumArgs } from '../../../tools/chromium-args.ts';

const throttle = Number(process.argv[2] ?? 4);
const server = await createServer({
  root: '.',
  logLevel: 'error',
  server: { port: 4197, strictPort: false },
});
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', args: chromiumArgs('darwin') });
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  await page.goto(`${server.resolvedUrls?.local[0] ?? ''}#demo=boulanger-matin`);
  await page.waitForSelector(SAMPLES_READY, { timeout: 120_000 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  await page.tap(FIRST_PLAY);
  await page.waitForTimeout(4000);
  const result: unknown = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const times: number[] = [];
        const step = (time: number): void => {
          times.push(time);
          if (time - (times[0] ?? time) < 10_000) {
            requestAnimationFrame(step);
          } else {
            const gaps = times.slice(1).map((t, i) => t - (times[i] ?? t));
            const sorted = gaps.toSorted((a, b) => a - b);
            const rank = (q: number): number => sorted[Math.ceil(q * sorted.length) - 1] ?? 0;
            const canvas = document.querySelector('canvas');
            resolve({
              fps: (gaps.length / ((times.at(-1) ?? 0) - (times[0] ?? 0))) * 1000,
              p50: rank(0.5),
              p95: rank(0.95),
              over33: gaps.filter((gap) => gap > 1000 / 30 + 1).length / gaps.length,
              buffer: canvas ? [canvas.width, canvas.height] : [],
              song: window.zoophony?.songTime ?? 0,
            });
          }
        };
        requestAnimationFrame(step);
      }),
  );
  console.log(`CPU throttle ${throttle}x, 390 x 844 at the device scale 3:`);
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
  await server.close();
}
