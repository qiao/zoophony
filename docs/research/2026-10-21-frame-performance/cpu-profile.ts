/**
 * Records a CPU profile of the main thread for 10 s of `perf-60.mid` at 60 fps in Cinematic mode,
 * after a seek to 32 s, and prints the self time and the total time of the top functions for each
 * frame (the report `2026-10-21-frame-performance.md`). Run from the repository root after
 * `pnpm frame` wrote its files once:
 * `node docs/research/2026-10-21-frame-performance/cpu-profile.ts [<out.cpuprofile>]`.
 *
 * The probe starts a Vite dev server on port 4196 or higher and Google Chrome with the flags of
 * `pnpm frame`, and samples the main thread every 100 µs. The total time of a function holds the
 * time of the functions that it calls, and counts each sample one time for each function.
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
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  await page.goto(`${server.resolvedUrls?.local[0] ?? ''}#demo=perf-60`);
  await page.waitForSelector(SAMPLES_READY, { timeout: 120_000 });
  await page.click(FIRST_PLAY);
  await page.waitForTimeout(3000);
  await page.$eval('.seek', (element) => {
    if (element instanceof HTMLInputElement) {
      element.value = '32';
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await page.waitForTimeout(1000);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 100 });
  await cdp.send('Profiler.start');
  await page.waitForTimeout(10_000);
  const { profile } = await cdp.send('Profiler.stop');
  if (out) {
    await writeFile(out, JSON.stringify(profile));
  }

  const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
  const parent = new Map<number, number>();
  for (const node of profile.nodes) {
    for (const child of node.children ?? []) {
      parent.set(child, node.id);
    }
  }
  const nameOf = (id: number): string => {
    const frame = nodes.get(id)?.callFrame;
    const file = frame?.url.split('/').at(-1)?.split('?')[0] ?? '';
    return `${frame?.functionName || '(anonymous)'} ${file}:${(frame?.lineNumber ?? 0) + 1}`;
  };
  const self = new Map<string, number>();
  const total = new Map<string, number>();
  for (const [i, id] of (profile.samples ?? []).entries()) {
    const ms = (profile.timeDeltas?.[i] ?? 0) / 1000;
    const name = nameOf(id);
    self.set(name, (self.get(name) ?? 0) + ms);
    const seen = new Set<string>();
    for (let at: number | undefined = id; at !== undefined; at = parent.get(at)) {
      const up = nameOf(at);
      if (!seen.has(up)) {
        seen.add(up);
        total.set(up, (total.get(up) ?? 0) + ms);
      }
    }
  }
  const frames = ((profile.endTime - profile.startTime) / 1e6) * 60;
  const top = (map: Map<string, number>, count: number): string[] =>
    [...map]
      .toSorted((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([name, ms]) => `${(ms / frames).toFixed(3)}  ${name}`);
  console.log(`Self time for each frame (ms), ${frames.toFixed(0)} frames at 60 fps:`);
  console.log(top(self, 30).join('\n'));
  console.log(`\nTotal time for each frame (ms):`);
  console.log(top(total, 45).join('\n'));
} finally {
  await browser.close();
  await server.close();
}
