import { describe, expect, it } from 'vitest';

import type { TraceCell } from './gpu-trace.ts';
import {
  MAX_CPU,
  checkLines,
  cpuUse,
  frameOptions,
  gpuGuardFaults,
  maximumShare,
  frameStats,
  frameTable,
  framesPerSecond,
  stateTimes,
  meetsTarget,
  sumByFrame,
  traceFrames,
  xctrace,
} from './measure-frame.ts';

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

describe('meetsTarget', () => {
  it('needs 95% of the frames within 4 ms, and at least one frame', () => {
    const passing = [...Array.from({ length: 19 }, () => 3.9), 9];
    const failing = [...Array.from({ length: 18 }, () => 3.9), 9, 9];
    expect(meetsTarget(passing)).toBe(true);
    expect(meetsTarget(failing)).toBe(false);
    expect(meetsTarget([])).toBe(false);
  });
});

describe('frameTable', () => {
  it('gives a Markdown row for each measure, with a verdict only for a target', () => {
    const lines = frameTable([
      { name: 'Main thread', times: [1, 2, 3], target: true },
      { name: 'GPU', times: [5, 6, 3], target: true },
      { name: 'Old GPU', times: [5, 6, 3], target: false },
    ]);
    expect(lines).toEqual([
      '| Measure | Frames | p50 (ms) | p95 (ms) | Max (ms) | Within 4 ms | Target |',
      '|---|---|---|---|---|---|---|',
      '| Main thread | 3 | 2.00 | 3.00 | 3.00 | 100.0% | pass |',
      '| GPU | 3 | 5.00 | 6.00 | 6.00 | 33.3% | fail |',
      '| Old GPU | 3 | 5.00 | 6.00 | 6.00 | 33.3% | information |',
    ]);
  });
});

describe('frameTable with a note', () => {
  it('fails a target row with a note, whatever its times are', () => {
    const lines = frameTable([{ name: 'GPU', times: [1, 2, 3], target: true, note: 'self-check' }]);
    expect(lines[2]).toBe('| GPU | 3 | 2.00 | 3.00 | 3.00 | 100.0% | fail (self-check) |');
  });
});

describe('checkLines', () => {
  const check = {
    frames: 650,
    spanSec: 3.25,
    droppedCanvas: { buffers: 649, ms: 454.3 },
    droppedOther: { buffers: 1298, ms: 649 },
    merged: 2,
  };

  it('prints the frames against the expected count, the merges, and the dropped time', () => {
    const [count, dropped, ...rest] = checkLines(check, 196, []);
    expect(count).toContain('650 WebGL frames in 3.250 s');
    expect(count).toContain('637 frames expected (2.0%). Merged frames: 2.');
    expect(dropped).toContain('canvas buffers 0.700 ms (649 buffers)');
    expect(dropped).toContain('other buffers 1.000 ms (1298 buffers)');
    expect(rest).toEqual([]);
  });

  it('adds a warning with the faults', () => {
    expect(checkLines(check, 200, ['A fault.']).at(-1)).toBe(
      'Warning: the self-check fails, so the GPU row fails. A fault.',
    );
  });
});

describe('frameOptions', () => {
  it('gives the defaults of the frame target', () => {
    expect(frameOptions([])).toEqual({
      demo: 'perf-60',
      scale: 2,
      headed: false,
      free: false,
      maxCpu: MAX_CPU,
      waitSec: 300,
      metal: true,
      gpuOnly: false,
      keep: undefined,
    });
  });

  it('reads each flag', () => {
    const flags = ['--demo=bach', '--scale=1', '--free', '--max-cpu=25', '--wait=5', '--no-metal'];
    expect(frameOptions([...flags, '--keep=out', '--headed'])).toEqual({
      demo: 'bach',
      scale: 1,
      headed: true,
      free: true,
      maxCpu: 25,
      waitSec: 5,
      metal: false,
      gpuOnly: false,
      keep: 'out',
    });
  });

  it('refuses an unknown flag and a value that is not a positive number', () => {
    expect(() => frameOptions(['--uncapped'])).toThrow(/Unknown flag/);
    expect(() => frameOptions(['perf-60'])).toThrow(/Unknown argument/);
    expect(() => frameOptions(['--max-cpu=high'])).toThrow(/positive number/);
    expect(() => frameOptions(['--max-load=8'])).toThrow(/Unknown flag/);
    expect(() => frameOptions(['--scale=0'])).toThrow(/positive number/);
  });

  it('reads --gpu-only, and refuses it with --no-metal', () => {
    expect(frameOptions(['--gpu-only']).gpuOnly).toBe(true);
    expect(() => frameOptions(['--gpu-only', '--no-metal'])).toThrow(/--gpu-only needs/);
  });

  it('refuses a value flag with no value and a switch with a value', () => {
    expect(() => frameOptions(['--keep'])).toThrow(/needs a value/);
    expect(() => frameOptions(['--demo='])).toThrow(/needs a value/);
    expect(() => frameOptions(['--headed=1'])).toThrow(/takes no value/);
  });
});

describe('cpuUse', () => {
  it('gives the busy time of all cores over their whole time, in percent', () => {
    const core = (busy: number, idle: number) => ({
      model: 'M1 Max',
      speed: 24,
      times: { user: busy / 2, nice: 0, sys: busy / 2, idle, irq: 0 },
    });
    const before = [core(100, 900), core(0, 1000)];
    const after = [core(400, 1600), core(100, 2900)];
    // Busy 300 + 100 of 300 + 700 + 100 + 1900.
    expect(cpuUse(before, after)).toBeCloseTo(13.333, 3);
    expect(cpuUse(before, before)).toBe(0);
  });
});

describe('stateTimes', () => {
  it('adds the time of each GPU performance state', () => {
    const cell = (fmt: string, raw = ''): TraceCell => ({ fmt, raw });
    const table = {
      columns: ['start', 'duration', 'gpu-performance-state'],
      rows: [
        [cell('0'), cell('1 ms', '1000000'), cell('Minimum')],
        [cell('1'), cell('3 ms', '3000000'), cell('Maximum')],
        [cell('4'), cell('1 ms', '1000000'), cell('Minimum')],
      ],
    };
    expect(stateTimes(table)).toEqual(
      new Map([
        ['Minimum', 2],
        ['Maximum', 3],
      ]),
    );
    expect(stateTimes({ ...table, rows: [] }).size).toBe(0);
    expect(() => stateTimes({ ...table, columns: ['start'] })).toThrow(/state/);
  });
});

describe('gpuGuardFaults', () => {
  const states = (maximum: number, minimum: number) =>
    new Map([
      ['Minimum', minimum],
      ['Maximum', maximum],
    ]);

  it('gives the share of the state time in "Maximum"', () => {
    expect(maximumShare(states(2924, 1))).toBeCloseTo(0.99966, 5);
    expect(maximumShare(new Map())).toBe(0);
  });

  it('passes a trace at "Maximum" with little other GPU work', () => {
    expect(gpuGuardFaults(states(2700, 300), 0.1)).toEqual([]);
  });

  it('fails a lower clock and other GPU work above 10%', () => {
    expect(gpuGuardFaults(states(2600, 400), 0.02)).toEqual([
      'The GPU was in its "Maximum" state for 86.7% of the state time, below 90%.',
    ]);
    expect(gpuGuardFaults(states(3000, 0), 0.27)).toEqual([
      'Other processes used the GPU in 27% of the trace, above 10%.',
    ]);
    expect(gpuGuardFaults(new Map(), 0)).toHaveLength(1);
  });
});

describe('framesPerSecond', () => {
  it('counts the frame gaps in the time between the first and the last stamp', () => {
    expect(framesPerSecond([0, 16, 32, 48, 64])).toBe(62.5);
    expect(framesPerSecond([5])).toBe(0);
  });
});

describe('xctrace', () => {
  it('starts no run after the stop of the measure', async () => {
    const stop = new AbortController();
    stop.abort();
    await expect(xctrace(['version'], 10_000, () => undefined, stop.signal)).rejects.toThrow(
      expect.objectContaining({ name: 'AbortError' }),
    );
  });
});
