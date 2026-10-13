/**
 * Records a CPU profile of the main thread for 10 s of `perf-60.mid` at 60 fps, and prints the
 * self time of the top functions for each frame (the report `2026-10-13-frame-time.md`,
 * section 4). Run from the repository root after `pnpm dev` wrote its files once:
 * `node docs/research/2026-10-13-frame-time/cpu-profile.ts [<out.cpuprofile>]`.
 *
 * The probe starts a Vite dev server on port 4196 or higher and Google Chrome with the flags of
 * `pnpm frame`, plays the demo for 3 s, and samples the main thread every 100 µs.
 */
import { writeFile } from 'node:fs/promises';

import { chromium } from '@playwright/test';
import { createServer } from 'vite';

import { FIRST_PLAY, SAMPLES_READY } from '../../../src/app/dev-hook.ts';
import { chromiumArgs } from '../../../tools/chromium-args.ts';

const [out] = process.argv.slice(2);
const server = await createServer({
  root: '.',
  logLevel: 'error',
  server: { port: 4196, strictPort: false },
});
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', args: chromiumArgs('darwin') });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await page.goto(`${server.resolvedUrls?.local[0] ?? ''}#demo=perf-60`);
  await page.waitForSelector(SAMPLES_READY, { timeout: 120_000 });
  await page.click(FIRST_PLAY);
  await page.waitForTimeout(3000);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 100 });
  await cdp.send('Profiler.start');
  await page.waitForTimeout(10_000);
  const { profile } = await cdp.send('Profiler.stop');
  if (out) {
    await writeFile(out, JSON.stringify(profile));
  }

  const self = new Map<string, number>();
  const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
  for (const [i, id] of (profile.samples ?? []).entries()) {
    const frame = nodes.get(id)?.callFrame;
    const file = frame?.url.split('/').at(-1)?.split('?')[0] ?? '';
    const name = `${frame?.functionName || '(anonymous)'} ${file}:${(frame?.lineNumber ?? 0) + 1}`;
    self.set(name, (self.get(name) ?? 0) + (profile.timeDeltas?.[i] ?? 0) / 1000);
  }
  const frames = ((profile.endTime - profile.startTime) / 1e6) * 60;
  console.log(`Self time for each frame (ms), ${frames.toFixed(0)} frames at 60 fps:`);
  for (const [name, ms] of [...self].toSorted((a, b) => b[1] - a[1]).slice(0, 25)) {
    console.log(`${(ms / frames).toFixed(3)}  ${name}`);
  }
} finally {
  await browser.close();
  await server.close();
}
