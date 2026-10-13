/**
 * Prints the GPU row of `pnpm frame` for each kept Metal trace (the report
 * `2026-10-13-frame-time.md`, sections 7 and 10). Run from the repository root:
 * `node docs/research/2026-10-13-frame-time/gpu-rows.ts <dir>/metal-gpu-intervals.xml...`.
 *
 * The probe takes the GPU process of Chrome with the most intervals in each trace, and splits its
 * WebGL work into frames with `webglFrameTimes()` of `tools/gpu-trace.ts`. The drawing buffer is
 * 2880 × 1800, as in each run of the report.
 */
import { readFile } from 'node:fs/promises';

import { gpuIntervals, parseTraceTable, webglFrameTimes } from '../../../tools/gpu-trace.ts';
import { frameStats } from '../../../tools/measure-frame.ts';

for (const file of process.argv.slice(2)) {
  const intervals = gpuIntervals(parseTraceTable(await readFile(file, 'utf8')));
  const counts = new Map<string, number>();
  for (const interval of intervals) {
    if (interval.process.includes('(GPU)')) {
      counts.set(interval.process, (counts.get(interval.process) ?? 0) + 1);
    }
  }
  const gpuProcess = [...counts.entries()].toSorted((a, b) => b[1] - a[1])[0]?.[0] ?? '';
  const stats = frameStats(webglFrameTimes(intervals, gpuProcess, [2880, 1800]));
  const within = `${(stats.within * 100).toFixed(1)}%`;
  const values = [stats.p50, stats.p95, stats.max].map((ms) => ms.toFixed(2));
  console.log(`${file}: ${stats.count} frames, p50 / p95 / max ${values.join(' / ')} ms, ${within}`);
}
