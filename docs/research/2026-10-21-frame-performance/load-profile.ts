/**
 * Records a CPU profile of the main thread from the load of `perf-60.mid` to 2 s after the click
 * on play, and prints the total time of the functions of three.js that the load of the agent of
 * `perf-load` named: `computeBoundingSphere()` (the CPU skin of a player at its first render) and
 * `setProgram()` (with the compile of the shaders). Run from the repository root after
 * `pnpm frame` wrote its files once:
 * `node docs/research/2026-10-21-frame-performance/load-profile.ts`.
 *
 * The probe starts a Vite dev server on port 4198 or higher and Google Chrome with the flags of
 * `pnpm frame`, at 1440 × 900 and the device scale 2, and samples the main thread every 200 µs.
 */
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

import { FIRST_PLAY, SAMPLES_READY } from '../../../src/app/dev-hook.ts';
import { chromiumArgs } from '../../../tools/chromium-args.ts';

/** The functions to sum, by name. */
const NAMES = ['computeBoundingSphere', 'setProgram', 'getProgram', 'compile', 'show'];

const server = await createServer({
  root: '.',
  logLevel: 'error',
  server: { port: 4198, strictPort: false },
});
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', args: chromiumArgs('darwin') });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  await cdp.send('Profiler.start');
  await page.goto(`${server.resolvedUrls?.local[0] ?? ''}#demo=perf-60`);
  await page.waitForSelector(SAMPLES_READY, { timeout: 120_000 });
  await page.click(FIRST_PLAY);
  await page.waitForTimeout(2000);
  const { profile } = await cdp.send('Profiler.stop');

  const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
  const parent = new Map<number, number>();
  for (const node of profile.nodes) {
    for (const child of node.children ?? []) {
      parent.set(child, node.id);
    }
  }
  const totals = new Map<string, number>();
  for (const [i, id] of (profile.samples ?? []).entries()) {
    const ms = (profile.timeDeltas?.[i] ?? 0) / 1000;
    const seen = new Set<string>();
    for (let at: number | undefined = id; at !== undefined; at = parent.get(at)) {
      const name = nodes.get(at)?.callFrame.functionName ?? '';
      if (NAMES.includes(name) && !seen.has(name)) {
        seen.add(name);
        totals.set(name, (totals.get(name) ?? 0) + ms);
      }
    }
  }
  console.log('Total time from the load to 2 s after play (ms):');
  for (const name of NAMES) {
    console.log(`${(totals.get(name) ?? 0).toFixed(1)}  ${name}`);
  }
} finally {
  await browser.close();
  await server.close();
}
