/**
 * Prints the GPU state rows of kept Metal traces against the span of the trace (the report
 * `2026-10-13-frame-retro.md`, section 4). Run from the repository root:
 * `node docs/research/2026-10-13-frame-time/state-rows.ts <dir>...`.
 *
 * For each folder of `pnpm frame --keep`, the probe gives the span of the GPU intervals, the part
 * of the span that the rows of `gpu-performance-state-intervals` cover, the share of "Maximum" in
 * the time of the rows (`maximumShare()` of `tools/measure-frame.ts`), and the share of "Maximum"
 * in the span.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { gpuIntervals, parseTraceTable } from '../../../tools/gpu-trace.ts';
import { maximumShare, stateTimes } from '../../../tools/measure-frame.ts';

console.log(
  '| Trace | Span (ms) | Rows (ms) | Rows of the span | Maximum of the rows | Maximum of the span |',
);
console.log('|---|---:|---:|---:|---:|---:|');
for (const dir of process.argv.slice(2)) {
  const read = async (name: string) =>
    parseTraceTable(await readFile(join(dir, `${name}.xml`), 'utf8'));
  const intervals = gpuIntervals(await read('metal-gpu-intervals'));
  let start = Infinity;
  let end = -Infinity;
  for (const interval of intervals) {
    start = Math.min(start, interval.startNs);
    end = Math.max(end, interval.startNs + interval.durationNs);
  }
  const span = (end - start) / 1e6;
  const states = stateTimes(await read('gpu-performance-state-intervals'));
  const rows = [...states.values()].reduce((sum, ms) => sum + ms, 0);
  const percent = (part: number): string => `${(part * 100).toFixed(1)}%`;
  const name = dir.split('/').filter(Boolean).at(-1) ?? dir;
  const cells = [
    name,
    span.toFixed(0),
    rows.toFixed(0),
    percent(rows / span),
    percent(maximumShare(states)),
    percent((states.get('Maximum') ?? 0) / span),
  ];
  console.log(`| ${cells.join(' | ')} |`);
}
