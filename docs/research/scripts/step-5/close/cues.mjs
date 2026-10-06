// Captures the cues of the conductor (design 5.4): 15 s of the Boulanger demo from the count-in,
// in a close view of the bear from the orchestra side, at 20 frames each second.
// Usage: node docs/research/scripts/step-5/close/cues.mjs <output folder>
// Run `node tools/patch-demos.ts` first, so that public/demos/ holds the demo. The script starts
// its own Vite server and Google Chrome, and stops both at the end. Then cues-gif.py writes the
// GIF of docs/reviews/step-5/.
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const root = join(import.meta.dirname, '..', '..', '..', '..', '..');
const out = process.argv[2];
if (!out) {
  throw new Error('Give the output folder.');
}
const page = 'docs/research/scripts/step-5/close/capture.html';
/** The first song time: the count-in of the Boulanger demo is 1.017 s. */
const FROM = -1.1;
const SECONDS = 15;
const FPS = 20;

const server = await createServer({ root, logLevel: 'error', server: { port: 4184, strictPort: false } });
await server.listen();
const base = server.resolvedUrls?.local[0] ?? 'http://localhost:4184/';
// Google Chrome, with ANGLE on Metal for the GPU of the Mac, as capture.mjs.
const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});
try {
  await mkdir(out, { recursive: true });
  const tab = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await tab.goto(`${base}${page}?demo=boulanger-matin`);
  await tab.waitForSelector('#stage[data-ready]', { timeout: 60_000 });
  const conductor = await tab.evaluate(() => window.capture.conductor);
  // The camera of the conductor shot of docs/research/cinematic-camera.md: from the orchestra
  // side, 35° to the left of the bear and 24° up, so that the hands show above the desk.
  const target = [conductor[0], conductor[1] + 1.4, conductor[2]];
  for (let k = 0; k < SECONDS * FPS; k++) {
    const songTime = FROM + k / FPS;
    const view = { songTime, wallTime: 20 + songTime, target, distance: 3.4, azimuth: 215, elevation: 24 };
    await tab.evaluate((v) => window.capture.render(v), view);
    await tab.screenshot({ path: join(out, `f${String(k).padStart(3, '0')}.png`) });
  }
  await tab.close();
  console.log(`cues: ${SECONDS * FPS} frames`);
} finally {
  await browser.close();
  await server.close();
}
