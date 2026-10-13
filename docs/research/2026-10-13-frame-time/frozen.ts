/**
 * Writes frozen frames of the stage as PNG files, for a check that a change keeps each pixel (the
 * report `2026-10-13-frame-time.md`, section 6). Run from the repository root after `pnpm dev`
 * wrote its files once: `node docs/research/2026-10-13-frame-time/frozen.ts <out dir>
 * [--shots=play,conductor,perf-wide]`. Then compare the files of two runs with `cmp`.
 *
 * Each shot opens a demo in Google Chrome at 1440 × 900 and the device scale 2, plays it, pauses,
 * seeks to its song time, and then holds `performance.now()` and the time of each frame at
 * 1,000,000 ms. The effects that read the wall time, such as the film grain and the motes, then
 * draw the same frame in each run.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { chromium } from '@playwright/test';
import { createServer } from 'vite';

import { FIRST_PLAY, SAMPLES_READY } from '../../../src/app/dev-hook.ts';
import { chromiumArgs } from '../../../tools/chromium-args.ts';

/** The shots: the demo, the song time of the pause, and Free mode at the default view. */
const SHOTS = {
  play: { demo: 'boulanger-matin', seek: 30, free: true },
  conductor: { demo: 'boulanger-matin', seek: 73, free: false },
  'perf-wide': { demo: 'perf-60', seek: 5, free: false },
} as const;

/** The script that holds the time of the page after `window.freezeTime()`. */
const FREEZE = `(() => {
  const realNow = performance.now.bind(performance);
  let frozen = null;
  performance.now = () => frozen ?? realNow();
  window.freezeTime = () => { frozen = 1e6; };
  const request = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => request((t) => cb(frozen ?? t));
})();`;

const [out, ...flags] = process.argv.slice(2);
if (!out) {
  throw new Error('Give the output folder.');
}
await mkdir(out, { recursive: true });
const only = flags.find((flag) => flag.startsWith('--shots='))?.slice(8).split(',');
const server = await createServer({
  root: '.',
  logLevel: 'error',
  server: { port: 4192, strictPort: false },
});
await server.listen();
const base = server.resolvedUrls?.local[0] ?? '';
const browser = await chromium.launch({ channel: 'chrome', args: chromiumArgs('darwin') });
try {
  for (const [name, shot] of Object.entries(SHOTS)) {
    if (only && !only.includes(name)) {
      continue;
    }
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    await page.addInitScript(FREEZE);
    await page.goto(`${base}#demo=${shot.demo}`);
    await page.waitForSelector(SAMPLES_READY, { timeout: 120_000 });
    await page.click(FIRST_PLAY);
    await page.waitForTimeout(1500);
    await page.click('.close-drawer').catch(() => undefined);
    if (shot.free) {
      await page.getByRole('button', { name: 'Reset view' }).click();
    }
    await page.mouse.move(720, 450);
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    });
    await page.keyboard.press(' ');
    await page.waitForTimeout(500);
    await page.$eval(
      '.seek',
      (element, value) => {
        if (element instanceof HTMLInputElement) {
          element.value = String(value);
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }
      },
      shot.seek,
    );
    await page.waitForTimeout(1500);
    await page.evaluate('window.freezeTime()');
    await page.mouse.move(0, 0);
    await page.waitForTimeout(4000);
    await writeFile(join(out, `${name}.png`), await page.screenshot({ type: 'png' }));
    const song = await page.evaluate(() => window.zoophony?.songTime ?? 0);
    console.log(`${name}: song time ${song.toFixed(2)} s`);
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
