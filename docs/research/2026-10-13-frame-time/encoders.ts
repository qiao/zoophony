/**
 * Prints the profile of the encoders of the WebGL frames in a Metal System Trace (the report
 * `2026-10-13-frame-time.md`, section 3). Run from the repository root:
 * `node docs/research/2026-10-13-frame-time/encoders.ts <metal-gpu-intervals.xml>`.
 *
 * `pnpm frame --keep=<dir>` writes the file `<dir>/metal-gpu-intervals.xml`: the GPU intervals of
 * the phase with no frame cap. The probe takes the GPU process of Chrome with the most intervals,
 * splits its WebGL work into frames (`webglFrames()` of `tools/gpu-trace.ts`), and gives each
 * encoder of a frame a key: its label with no process, and its channel. For each key, it prints
 * the part of the frames that hold it, and the mean and the p95 of its time in those frames.
 */
import { readFile } from 'node:fs/promises';

import { gpuIntervals, parseTraceTable, webglFrames } from '../../../tools/gpu-trace.ts';
import { frameStats } from '../../../tools/measure-frame.ts';

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

const times = new Map<string, number[]>();
const order: string[] = [];
for (const frame of frames) {
  const sums = new Map<string, number>();
  for (const interval of frame) {
    const label = interval.label.split(/\s+\(/)[0] ?? interval.label;
    const key = `${label} ${interval.channel}${interval.surfaces ? ' (canvas)' : ''}`;
    sums.set(key, (sums.get(key) ?? 0) + interval.durationNs / 1e6);
    if (!order.includes(key)) {
      order.push(key);
    }
  }
  for (const [key, ms] of sums) {
    times.set(key, [...(times.get(key) ?? []), ms]);
  }
}

console.log(`${gpuProcess}: ${frames.length} WebGL frames`);
console.log('| Encoder | Frames | Mean (ms) | p95 (ms) |');
console.log('|---|---|---|---|');
for (const key of order) {
  const list = times.get(key) ?? [];
  const mean = list.reduce((sum, ms) => sum + ms, 0) / Math.max(1, list.length);
  const share = `${((list.length / Math.max(1, frames.length)) * 100).toFixed(0)}%`;
  console.log(`| ${key} | ${share} | ${mean.toFixed(2)} | ${frameStats(list).p95.toFixed(2)} |`);
}
