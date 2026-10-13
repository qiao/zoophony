/**
 * Prints the main-thread time of each frame of a Chrome trace, and the frames above 4 ms with
 * the gap to the spike before (the report `2026-10-13-frame-time.md`, section 4). Run from the
 * repository root: `node docs/research/2026-10-13-frame-time/main-spikes.ts <main-trace.json>`.
 *
 * `pnpm frame --keep=<dir>` writes the file `<dir>/main-trace.json`: the Chrome trace of the
 * phase at 60 fps. The probe uses `traceFrames()` of `tools/measure-frame.ts`, the function of the
 * main-thread row of `pnpm frame`. A spike every 9 frames is a read of the title backdrop
 * (`src/app/backdrop-probe.ts`), which starts every 0.15 s.
 */
import { readFile } from 'node:fs/promises';

import { FRAME_LIMIT_MS, frameStats, traceFrames } from '../../../tools/measure-frame.ts';

const [file] = process.argv.slice(2);
if (!file) {
  throw new Error('Give the file main-trace.json of `pnpm frame --keep=<dir>`.');
}
const { traceEvents } = JSON.parse(await readFile(file, 'utf8'));
const { main } = traceFrames(traceEvents);
const stats = frameStats(main);
console.log(
  `${stats.count} frames: p50 ${stats.p50.toFixed(2)} ms, p95 ${stats.p95.toFixed(2)} ms, ` +
    `max ${stats.max.toFixed(2)} ms, ${(stats.within * 100).toFixed(1)}% within ${FRAME_LIMIT_MS} ms`,
);

const gaps = new Map<number, number>();
let last = -1;
for (const [i, ms] of main.entries()) {
  if (ms > FRAME_LIMIT_MS) {
    if (last >= 0) {
      gaps.set(i - last, (gaps.get(i - last) ?? 0) + 1);
    }
    last = i;
  }
}
const spikes = main.filter((ms) => ms > FRAME_LIMIT_MS).length;
const common = [...gaps.entries()].toSorted((a, b) => b[1] - a[1]).slice(0, 5);
console.log(`${spikes} frames above ${FRAME_LIMIT_MS} ms. Most common gaps (frames: count):`);
console.log(common.map(([gap, count]) => `${gap}: ${count}`).join(', ') || 'none');

const period = [...gaps.entries()].toSorted((a, b) => b[1] - a[1])[0]?.[0] ?? 9;
const phases = Array.from({ length: period }, (_, phase) =>
  main.filter((_, i) => i % period === phase),
);
console.log(`Mean main-thread time of each phase of a cycle of ${period} frames (ms):`);
console.log(
  phases
    .map((list) => (list.reduce((sum, ms) => sum + ms, 0) / Math.max(1, list.length)).toFixed(2))
    .join(' '),
);
