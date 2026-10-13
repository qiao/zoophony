/**
 * Counts the console messages of 8 s of `perf-60.mid` at 60 fps, such as the performance warning
 * of Chrome for a pixel buffer that lost its CPU copy (the report `2026-10-13-frame-time.md`,
 * section 4). Run from the repository root after `pnpm dev` wrote its files once:
 * `node docs/research/2026-10-13-frame-time/console-warnings.ts`.
 */
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

import { FIRST_PLAY, SAMPLES_READY } from '../../../src/app/dev-hook.ts';
import { chromiumArgs } from '../../../tools/chromium-args.ts';

const server = await createServer({
  root: '.',
  logLevel: 'error',
  server: { port: 4195, strictPort: false },
});
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', args: chromiumArgs('darwin') });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const counts = new Map<string, number>();
  page.on('console', (message) => {
    const key = `${message.type()}: ${message.text()}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  await page.goto(`${server.resolvedUrls?.local[0] ?? ''}#demo=perf-60`);
  await page.waitForSelector(SAMPLES_READY, { timeout: 120_000 });
  await page.click(FIRST_PLAY);
  await page.waitForTimeout(8000);
  for (const [text, count] of counts) {
    console.log(count, text.slice(0, 300));
  }
} finally {
  await browser.close();
  await server.close();
}
