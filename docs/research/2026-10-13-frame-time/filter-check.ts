/**
 * Runs the self-check of the GPU row (`checkFrames()` of `tools/gpu-trace.ts`) on kept Metal
 * traces with the filter of a commit (the report `2026-10-13-frame-retro.md`). Run from the
 * repository root:
 * `node docs/research/2026-10-13-frame-time/filter-check.ts <ref> <dir>[:<w>x<h>]...`.
 *
 * The probe writes `tools/gpu-trace.ts` of `<ref>` into a temporary folder, and splits the WebGL
 * work of the GPU process with the most intervals into frames with its `webglFrames()`. The
 * expected count comes from the command buffers that write the canvas (`canvasWriteFrames()`),
 * as in `pnpm frame`: each frame writes the canvas in two command buffers. The drawing buffer is 2880 × 1800, or the size after the
 * colon of an argument, such as `:2160x1350`.
 */
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  canvasWriteFrames,
  checkFrames,
  droppedPerFrame,
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
    `| Trace | Filter | Dropped canvas ms per frame | Frames / expected | Merged | Span (s) | Verdict |`,
  );
  console.log('|---|---|---|---|---|---|---|');
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
    const expected = canvasWriteFrames(check);
    const faults = frameCheckFaults(check, expected);
    const perFrame = droppedPerFrame(check, check.droppedCanvas);
    const name = dir.split('/').filter(Boolean).at(-1) ?? dir;
    const cells = [
      name,
      ref,
      perFrame.toFixed(3),
      `${check.frames} / ${expected}`,
      String(check.merged),
      check.spanSec.toFixed(3),
      faults.length === 0 ? 'pass' : 'fail',
    ];
    console.log(`| ${cells.join(' | ')} |`);
  }
} finally {
  await rm(folder, { recursive: true, force: true });
}
