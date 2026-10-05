import { describe, expect, it } from 'vitest';

import { frameStats, sumByFrame, traceFrames } from './measure-frame.ts';

describe('frameStats', () => {
  it('gives the nearest rank percentiles, the max, and the part within 4 ms', () => {
    const times = Array.from({ length: 20 }, (_, i) => i * 0.25 + 0.25);
    expect(frameStats(times)).toEqual({ count: 20, p50: 2.5, p95: 4.75, max: 5, within: 0.8 });
  });

  it('gives zeros for no frames', () => {
    expect(frameStats([])).toEqual({ count: 0, p50: 0, p95: 0, max: 0, within: 0 });
  });
});

describe('sumByFrame', () => {
  it('adds each slice to the frame of its start, and drops slices outside the frames', () => {
    const starts = [1000, 2000, 3000];
    const slices = [
      { ts: 500, dur: 9000 },
      { ts: 1000, dur: 300 },
      { ts: 1999, dur: 200 },
      { ts: 2500, dur: 1000 },
      { ts: 3000, dur: 4000 },
    ];
    expect(sumByFrame(starts, slices)).toEqual([0.5, 1]);
  });
});

describe('traceFrames', () => {
  it('reads the frames of the main thread and the GPU tasks of the GPU process', () => {
    const meta = (pid: number, tid: number, name: string) => ({
      name: 'thread_name',
      ph: 'M',
      pid,
      tid,
      ts: 0,
      args: { name },
    });
    const slice = (name: string, pid: number, tid: number, ts: number, dur: number) => ({
      name,
      ph: 'X',
      pid,
      tid,
      ts,
      dur,
    });
    const events = [
      meta(1, 10, 'CrRendererMain'),
      meta(2, 20, 'CrGpuMain'),
      meta(3, 30, 'CrRendererMain'),
      slice('FireAnimationFrame', 1, 10, 0, 2000),
      slice('FireAnimationFrame', 1, 10, 16_000, 3000),
      slice('FireAnimationFrame', 1, 10, 32_000, 1000),
      slice('ThreadControllerImpl::RunTask', 1, 10, 0, 2500),
      slice('ThreadControllerImpl::RunTask', 1, 10, 10_000, 500),
      slice('ThreadControllerImpl::RunTask', 1, 10, 16_000, 3500),
      slice('ThreadControllerImpl::RunTask', 3, 30, 1000, 9000),
      slice('GPUTask', 2, 20, 2000, 1500),
      slice('GPUTask', 2, 20, 18_000, 1000),
      slice('GPUTask', 1, 10, 18_000, 7000),
    ];
    expect(traceFrames(events)).toEqual({
      callback: [2, 3],
      main: [3, 3.5],
      gpuTask: [1.5, 1],
      spanSec: 0.032,
    });
  });
});
