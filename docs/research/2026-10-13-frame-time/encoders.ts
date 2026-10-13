/**
 * Prints the profile of the encoders of the WebGL frames in a Metal System Trace (the report
 * `2026-10-13-frame-time.md`, section 3). Run from the repository root:
 * `node docs/research/2026-10-13-frame-time/encoders.ts <metal-gpu-intervals.xml>`.
 *
 * `pnpm frame --keep=<dir>` writes the file `<dir>/metal-gpu-intervals.xml`: the GPU intervals of
 * the phase with no frame cap. The probe takes the GPU process of Chrome with the most intervals,
 * splits its WebGL work into frames (`webglFrames()` of `tools/gpu-trace.ts`), and splits each
 * frame into its command buffers in the order of their start. It prints the busy time of each
 * command buffer. Then it gives each encoder a key: the index of its command buffer, its label with
 * no process, and its channel. For each key, it prints the part of the frames that hold it, and the
 * mean and the p95 of its time in those frames. The encoders below `MIN_MS` get one sum row for
 * each command buffer.
 */
import { readFile } from 'node:fs/promises';

import { busyMs, gpuIntervals, parseTraceTable, webglFrames } from '../../../tools/gpu-trace.ts';
import type { GpuInterval } from '../../../tools/gpu-trace.ts';
import { frameStats } from '../../../tools/measure-frame.ts';

/** The smallest mean time of an encoder that gets a row of its own, in milliseconds. */
const MIN_MS = 0.02;

const [file] = process.argv.slice(2);
if (!file) {
  throw new Error('Give the file metal-gpu-intervals.xml of `pnpm frame --keep=<dir>`.');
}
const intervals = gpuIntervals(parseTraceTable(await readFile(file, 'utf8')));

const counts = new Map<string, number>();
for (const interval of intervals) {
  if (interval.process.includes('(GPU)')) {
    counts.set(interval.process, (counts.get(interval.process) ?? 0) + 1);
  }
}
const gpuProcess = [...counts.entries()].toSorted((a, b) => b[1] - a[1])[0]?.[0];
if (!gpuProcess) {
  throw new Error('The trace has no GPU process of Chrome.');
}
// The drawing buffer of `pnpm frame`: 1440 × 900 at the device scale 2.
const frames = webglFrames(intervals, gpuProcess, [2880, 1800]);

// The command buffers of a frame, in the order of their first interval. The first one holds the
// clear of the drawing buffer.
const buffersOf = (frame: readonly GpuInterval[]): GpuInterval[][] => {
  const byBuffer = new Map<string, GpuInterval[]>();
  for (const interval of frame) {
    byBuffer.set(interval.commandBuffer, [
      ...(byBuffer.get(interval.commandBuffer) ?? []),
      interval,
    ]);
  }
  const start = (list: readonly GpuInterval[]): number => Math.min(...list.map((i) => i.startNs));
  return [...byBuffer.values()].toSorted((a, b) => start(a) - start(b));
};

const times = new Map<string, number[]>();
const busy = new Map<number, number[]>();
const order: string[] = [];
for (const frame of frames) {
  const sums = new Map<string, number>();
  for (const [index, buffer] of buffersOf(frame).entries()) {
    busy.set(index + 1, [...(busy.get(index + 1) ?? []), busyMs(buffer)]);
    for (const interval of buffer) {
      const label = interval.label.split(/\s+\(\s/)[0] ?? interval.label;
      const write = interval.surfaces.includes('Write') ? ' (canvas)' : '';
      const key = `B${index + 1} ${label.replace(/^Command Buffer \d+:/, '').replace(/\s+/g, ' ').trim()} ${interval.channel}${write}`;
      sums.set(key, (sums.get(key) ?? 0) + interval.durationNs / 1e6);
      if (!order.includes(key)) {
        order.push(key);
      }
    }
  }
  for (const [key, ms] of sums) {
    times.set(key, [...(times.get(key) ?? []), ms]);
  }
}

const mean = (list: readonly number[]): number =>
  list.reduce((sum, ms) => sum + ms, 0) / Math.max(1, list.length);
const share = (list: readonly number[]): string =>
  `${((list.length / Math.max(1, frames.length)) * 100).toFixed(0)}%`;
console.log(`${gpuProcess}: ${frames.length} WebGL frames`);
console.log('| Command buffer | Frames | Busy mean (ms) | Busy p95 (ms) |');
console.log('|---|---|---|---|');
for (const [index, list] of busy) {
  console.log(
    `| ${index} | ${share(list)} | ${mean(list).toFixed(2)} | ${frameStats(list).p95.toFixed(2)} |`,
  );
}
console.log('');
console.log(
  `Encoders with a mean of at least ${MIN_MS} ms. B<k> is the command buffer k of the frame.`,
);
console.log('| Encoder | Frames | Mean (ms) | p95 (ms) |');
console.log('|---|---|---|---|');
const small = new Map<string, number>();
for (const key of order.toSorted((a, b) => Number(a.slice(1, 2)) - Number(b.slice(1, 2)))) {
  const list = times.get(key) ?? [];
  if (mean(list) < MIN_MS) {
    const buffer = key.split(' ')[0] ?? '';
    small.set(
      buffer,
      (small.get(buffer) ?? 0) + (mean(list) * list.length) / Math.max(1, frames.length),
    );
    continue;
  }
  console.log(
    `| ${key} | ${share(list)} | ${mean(list).toFixed(3)} | ${frameStats(list).p95.toFixed(3)} |`,
  );
}
for (const [buffer, ms] of small) {
  console.log(
    `| ${buffer}, all smaller encoders (sum, mean of all frames) | | ${ms.toFixed(3)} | |`,
  );
}
