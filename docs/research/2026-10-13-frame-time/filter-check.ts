/**
 * Runs the self-check of the GPU row (`checkFrames()` of `tools/gpu-trace.ts`) on kept Metal
 * traces with the filter of a commit (the report `2026-10-13-frame-retro.md`). Run from the
 * repository root:
 * `node docs/research/2026-10-13-frame-time/filter-check.ts <ref> <dir>[:<w>x<h>]...`.
 *
 * The probe writes `tools/gpu-trace.ts` of `<ref>` into a temporary folder, and splits the WebGL
 * work of the GPU process with the most intervals into frames with its `webglFrames()`. The kept
 * traces have no frame rate of the page during the trace. Thus the expected count is half the
 * count of the command buffers that write the canvas in the span of the frames: each frame writes
 * the canvas in two command buffers. The drawing buffer is 2880 × 1800, or the size after the
 * colon of an argument, such as `:2160x1350`.
 */
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  checkFrames,
  frameCheckFaults,
  gpuIntervals,
  parseTraceTable,
} from '../../../tools/gpu-trace.ts';
import type { GpuInterval } from '../../../tools/gpu-trace.ts';

/** The `webglFrames()` of a commit: the old ones take no canvas size. */
type Frames = (
  intervals: readonly GpuInterval[],
  process: string,
  canvas: readonly [number, number],
) => GpuInterval[][];

const [ref = 'HEAD', ...dirs] = process.argv.slice(2);
const folder = await mkdtemp(join(tmpdir(), 'zoophony-filter-'));
try {
  const file = join(folder, 'gpu-trace.ts');
  await writeFile(file, execFileSync('git', ['show', `${ref}:tools/gpu-trace.ts`]));
  // SAFETY: each version of the module exports webglFrames() with these first arguments.
  const { webglFrames } = (await import(file)) as { webglFrames: Frames };
  console.log(
    `| Trace | Filter | Dropped canvas ms per frame | Frames / expected | Merged | Verdict |`,
  );
  console.log('|---|---|---|---|---|---|');
  for (const arg of dirs) {
    const [dir = '', size = '2880x1800'] = arg.split(':');
    const [width = 0, height = 0] = size.split('x').map(Number);
    const canvas: [number, number] = [width, height];
    const xml = await readFile(join(dir, 'metal-gpu-intervals.xml'), 'utf8');
    const intervals = gpuIntervals(parseTraceTable(xml));
    const counts = new Map<string, number>();
    for (const interval of intervals) {
      if (interval.process.includes('(GPU)')) {
        counts.set(interval.process, (counts.get(interval.process) ?? 0) + 1);
      }
    }
    const gpu = [...counts.entries()].toSorted((a, b) => b[1] - a[1])[0]?.[0] ?? '';
    const frames = webglFrames(intervals, gpu, canvas);
    const check = checkFrames(intervals, gpu, canvas, frames);
    const expected = canvasWrites(intervals, gpu, canvas, frames) / 2;
    const faults = frameCheckFaults(check, expected);
    const perFrame = check.frames > 0 ? check.droppedCanvas.ms / check.frames : 0;
    const name = dir.split('/').filter(Boolean).at(-1) ?? dir;
    const cells = [
      name,
      ref,
      perFrame.toFixed(3),
      `${check.frames} / ${expected}`,
      String(check.merged),
      faults.length === 0 ? 'pass' : 'fail',
    ];
    console.log(`| ${cells.join(' | ')} |`);
  }
} finally {
  await rm(folder, { recursive: true, force: true });
}

/**
 * Counts the command buffers of the process that write the canvas between the start of the first
 * frame and the end of the last frame. An encoder writes the canvas when it writes a surface of the
 * size of the drawing buffer and touches no surface of another size.
 *
 * @param intervals The GPU intervals of the trace.
 * @param process The process.
 * @param canvas The size of the drawing buffer.
 * @param frames The frames of the filter, for the span.
 * @returns The count.
 */
function canvasWrites(
  intervals: readonly GpuInterval[],
  process: string,
  canvas: readonly [number, number],
  frames: readonly GpuInterval[][],
): number {
  const size = `${canvas[0]}×${canvas[1]}`;
  const start = Math.min(...(frames[0] ?? []).map((interval) => interval.startNs));
  const end = Math.max(...(frames.at(-1) ?? []).map((i) => i.startNs + i.durationNs));
  const writers = new Set<string>();
  for (const interval of intervals) {
    const sizes = [...interval.surfaces.matchAll(/\((\d+×\d+)/g)].map((m) => m[1]);
    const writes = (interval.surfaces.split('Write Surface:')[1] ?? '').includes(`(${size}`);
    const inSpan = interval.startNs >= start && interval.startNs < end;
    if (interval.process === process && inSpan && writes && sizes.every((s) => s === size)) {
      writers.add(interval.commandBuffer);
    }
  }
  return writers.size;
}
