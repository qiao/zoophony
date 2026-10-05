// Captures the close views of the re-review of step 5: the contrabass section of demo 1, a blink
// of a hippo in two frames, the front row of the choir of the Handel demo, and the choir in the
// default view of the app.
// Usage: node docs/research/scripts/step-5/close/capture.mjs <output folder>
// The script starts its own Vite server and Google Chrome, and stops both at the end. Then
// encode.py writes the WebP files of docs/reviews/step-5/.
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

/** The frames of each capture, as a function that runs in the page. */
const CAPTURES = {
  // 2.4 s of the two hippos of demo 1 from the front left, at 10 frames each second.
  contrabass: {
    demo: 'beethoven-5',
    frames: () => {
      const basses = window.capture.players.filter((p) => p.instrument === 'contrabass');
      const mean = (k) => basses.reduce((sum, p) => sum + p.position[k], 0) / basses.length;
      return Array.from({ length: 24 }, (_, k) => ({
        name: `f${String(k).padStart(2, '0')}`,
        view: {
          songTime: 6 + k * 0.1,
          wallTime: 16 + k * 0.1,
          target: [mean(0), 1.15, mean(2)],
          distance: 4.6,
          azimuth: -28,
          elevation: 16,
        },
      }));
    },
  },
  // The face of the second hippo 0.4 s before a blink, and at the middle of the blink.
  blink: {
    demo: 'beethoven-5',
    frames: () => {
      const hippo = window.capture.players.filter((p) => p.instrument === 'contrabass')[1];
      const peaks = window.capture.blinkPeaks(hippo.index, 10, 30);
      const blink = peaks[Math.floor(peaks.length / 2)];
      const target = [hippo.position[0], 1.55, hippo.position[2]];
      const view = (wallTime) => ({ songTime: 6.5, wallTime, target, distance: 2.2, azimuth: -38, elevation: 8 });
      return [
        { name: 'open', view: view(blink - 0.4) },
        { name: 'closed', view: view(blink) },
      ];
    },
  },
  // 2.4 s of the front row of the choir from the front, from a sung note at 8 s.
  choir: {
    demo: 'handel-hallelujah',
    frames: () => {
      const singers = window.capture.players.filter((p) => p.instrument === 'choir-folder');
      const nearest = Math.min(...singers.map((p) => p.radius));
      const front = singers.filter((p) => p.radius < nearest + 0.1);
      const middle = front[Math.floor(front.length / 2)];
      return Array.from({ length: 24 }, (_, k) => ({
        name: `f${String(k).padStart(2, '0')}`,
        view: {
          songTime: 8 + k * 0.1,
          wallTime: 30 + k * 0.1,
          target: [middle.position[0], 1.25, middle.position[2]],
          distance: 2,
          azimuth: 10,
          elevation: 8,
        },
      }));
    },
  },
  // The default view of the Handel demo at 1440 x 900: a sung note at 8.3 s, and a rest at 13.8 s.
  'choir-default': {
    demo: 'handel-hallelujah',
    frames: () => [
      { name: 'sung', view: { songTime: 8.3, wallTime: 30 } },
      { name: 'rest', view: { songTime: 13.8, wallTime: 30 } },
    ],
  },
};

const server = await createServer({ root, logLevel: 'error', server: { port: 4183, strictPort: false } });
await server.listen();
const base = server.resolvedUrls?.local[0] ?? 'http://localhost:4183/';
// Google Chrome, with ANGLE on Metal for the GPU of the Mac, as tools/measure-frame.ts.
const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});
try {
  for (const [name, capture] of Object.entries(CAPTURES)) {
    const dir = join(out, name);
    await mkdir(dir, { recursive: true });
    const tab = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await tab.goto(`${base}${page}?demo=${capture.demo}`);
    await tab.waitForSelector('#stage[data-ready]', { timeout: 60_000 });
    const frames = await tab.evaluate(capture.frames);
    for (const frame of frames) {
      await tab.evaluate((view) => window.capture.render(view), frame.view);
      await tab.screenshot({ path: join(dir, `${frame.name}.png`) });
    }
    await tab.close();
    console.log(`${name}: ${frames.length} frames`);
  }
} finally {
  await browser.close();
  await server.close();
}
