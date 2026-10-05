import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { chromium } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createServer } from 'vite';

/** The frame target of design 9.7: main-thread time and GPU time, in milliseconds. */
export const FRAME_LIMIT_MS = 4;

/** The part of the frames that must be within {@link FRAME_LIMIT_MS} (design 9.7). */
export const FRAME_SHARE = 0.95;

/** The length of one measurement, in seconds (design 9.7). */
const MEASURE_SEC = 10;

/** The play time before the first measurement, so that the lift and the warm-up end (5.2). */
const WARM_SEC = 3;

/** The trace categories of the main thread, the frames, and the GPU process. */
const TRACE_CATEGORIES = [
  'devtools.timeline',
  'disabled-by-default-devtools.timeline',
  'disabled-by-default-devtools.timeline.frame',
  'gpu',
  'toplevel',
];

/** The statistics of the time of the frames, in milliseconds. */
export interface FrameStats {
  readonly count: number;
  readonly p50: number;
  readonly p95: number;
  readonly max: number;
  /** The part of the frames within {@link FRAME_LIMIT_MS}. */
  readonly within: number;
}

/**
 * Calculates the statistics of the frame times. A percentile is the value at the nearest rank
 * (`ceil(q * n)`) of the sorted times.
 *
 * @param times The time of each frame, in milliseconds.
 * @returns The statistics. All values are 0 for an empty list.
 */
export function frameStats(times: readonly number[]): FrameStats {
  const sorted = times.toSorted((a, b) => a - b);
  const rank = (q: number): number => sorted[Math.max(0, Math.ceil(q * sorted.length) - 1)] ?? 0;
  const within = times.filter((time) => time <= FRAME_LIMIT_MS).length;
  return {
    count: times.length,
    p50: rank(0.5),
    p95: rank(0.95),
    max: sorted.at(-1) ?? 0,
    within: times.length > 0 ? within / times.length : 0,
  };
}

/** One complete event of a Chrome trace (phase `X`). Times are in microseconds. */
export interface TraceSlice {
  readonly ts: number;
  readonly dur: number;
}

/**
 * Adds the durations of the slices in each frame. Frame `i` starts at `starts[i]` and ends at the
 * next start. A slice belongs to the frame of its start. The last start only closes the frame
 * before it.
 *
 * @param starts The start times of the frames, in increasing order, in microseconds.
 * @param slices The slices of one thread, in microseconds.
 * @returns The sum of each frame, in milliseconds: one value less than the starts.
 */
export function sumByFrame(starts: readonly number[], slices: readonly TraceSlice[]): number[] {
  const sums: number[] = Array.from({ length: Math.max(0, starts.length - 1) }, () => 0);
  for (const slice of slices) {
    // A binary search for the last start at or before the slice.
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if ((starts[middle] ?? 0) <= slice.ts) {
        low = middle;
      } else {
        high = middle - 1;
      }
    }
    if (low < sums.length && (starts[low] ?? Infinity) <= slice.ts) {
      sums[low] = (sums[low] ?? 0) + slice.dur / 1000;
    }
  }
  return sums;
}

/** One event of the trace JSON of Chrome. */
interface TraceEvent {
  readonly name: string;
  readonly ph: string;
  readonly pid: number;
  readonly tid: number;
  readonly ts: number;
  readonly dur?: number;
  readonly args?: { readonly name?: string };
}

/** The frame values of a trace, in milliseconds for each frame. */
export interface TraceFrames {
  /** The duration of the callback of `requestAnimationFrame` (`FireAnimationFrame`). */
  readonly callback: readonly number[];
  /** The sum of the top-level tasks of the main thread of the page. */
  readonly main: readonly number[];
  /** The sum of the `GPUTask` slices of the GPU process: the GPU track of DevTools. */
  readonly gpuTask: readonly number[];
  /** The time from the first frame to the last frame, in seconds. */
  readonly spanSec: number;
}

/**
 * Finds the thread of each name in the metadata events of a trace.
 *
 * @param events The events of the trace.
 * @param name The thread name, for example `CrRendererMain`.
 * @returns The `pid:tid` keys of the threads with that name.
 */
function threadsNamed(events: readonly TraceEvent[], name: string): Set<string> {
  const keys = new Set<string>();
  for (const event of events) {
    if (event.ph === 'M' && event.name === 'thread_name' && event.args?.name === name) {
      keys.add(`${event.pid}:${event.tid}`);
    }
  }
  return keys;
}

/**
 * Gives the time of each frame from a Chrome trace. The frames start at each
 * `FireAnimationFrame` of the main thread of the page. A trace can hold more than one renderer,
 * so the main thread of the page is the renderer main thread with the most frames.
 *
 * @param events The events of the trace.
 * @returns The values of each frame.
 */
export function traceFrames(events: readonly TraceEvent[]): TraceFrames {
  const key = (event: TraceEvent): string => `${event.pid}:${event.tid}`;
  // The main thread of the page is the renderer main thread with the most frames.
  const counts = new Map<string, number>();
  for (const event of events) {
    if (event.ph === 'X' && event.name === 'FireAnimationFrame') {
      counts.set(key(event), (counts.get(key(event)) ?? 0) + 1);
    }
  }
  const pageThread = [...threadsNamed(events, 'CrRendererMain')]
    .toSorted((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))
    .at(0);
  const gpus = threadsNamed(events, 'CrGpuMain');
  const slices = (keep: (event: TraceEvent) => boolean): TraceSlice[] =>
    events
      .filter((event) => event.ph === 'X' && event.dur !== undefined && keep(event))
      .map((event) => ({ ts: event.ts, dur: event.dur ?? 0 }));
  const callbacks = slices(
    (e) => e.name === 'FireAnimationFrame' && key(e) === pageThread,
  ).toSorted((a, b) => a.ts - b.ts);
  const starts = callbacks.map((c) => c.ts);
  const tasks = slices((e) => e.name === 'ThreadControllerImpl::RunTask' && key(e) === pageThread);
  const gpuTasks = slices((e) => e.name === 'GPUTask' && gpus.has(key(e)));
  return {
    callback: callbacks.slice(0, -1).map((c) => c.dur / 1000),
    main: sumByFrame(starts, tasks),
    gpuTask: sumByFrame(starts, gpuTasks),
    spanSec: ((starts.at(-1) ?? 0) - (starts[0] ?? 0)) / 1e6,
  };
}

/** The values that the page collects for each frame (see {@link FRAME_PROBE}). */
interface ProbeValues {
  /** The duration of the callback of `requestAnimationFrame`, from `performance.now()`. */
  readonly cpu: number[];
  /** The GPU time of the commands of the callback, from `EXT_disjoint_timer_query_webgl2`. */
  readonly gpu: number[];
  /** The time stamp of each frame, in milliseconds. */
  readonly stamps: number[];
  /** The count of the GPU results that the driver marked as disjoint. */
  readonly disjoint: number;
  /** True if the WebGL2 context has the timer query extension. */
  readonly timer: boolean;
  readonly renderer: string;
}

/**
 * The script that the page runs before its own code. It keeps the WebGL2 context of the stage,
 * and wraps each callback of `requestAnimationFrame` with `performance.now()` and with a GPU
 * timer query. The page reads the result of a query some frames later.
 */
const FRAME_PROBE = `(() => {
  const values = { cpu: [], gpu: [], stamps: [], disjoint: 0, timer: false, renderer: '' };
  const probe = { on: false, values, gl: null, ext: null };
  window.frameProbe = probe;
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const context = getContext.call(this, type, ...rest);
    if (type === 'webgl2' && context && !probe.gl) {
      probe.gl = context;
      probe.ext = context.getExtension('EXT_disjoint_timer_query_webgl2');
      values.timer = Boolean(probe.ext);
      const info = context.getExtension('WEBGL_debug_renderer_info');
      values.renderer = info ? context.getParameter(info.UNMASKED_RENDERER_WEBGL) : '';
    }
    return context;
  };
  const pending = [];
  const request = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) => request((stamp) => {
    const { gl, ext } = probe;
    while (gl && ext && pending.length > 0) {
      const [query, counted] = pending[0];
      if (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) {
        break;
      }
      pending.shift();
      const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
      const nanoseconds = gl.getQueryParameter(query, gl.QUERY_RESULT);
      gl.deleteQuery(query);
      if (counted && disjoint) {
        values.disjoint += 1;
      } else if (counted) {
        values.gpu.push(nanoseconds / 1e6);
      }
    }
    let query = null;
    if (gl && ext && probe.on) {
      query = gl.createQuery();
      gl.beginQuery(ext.TIME_ELAPSED_EXT, query);
    }
    const start = performance.now();
    try {
      callback(stamp);
    } finally {
      const end = performance.now();
      if (query) {
        gl.endQuery(ext.TIME_ELAPSED_EXT);
        pending.push([query, probe.on]);
      }
      if (probe.on) {
        values.cpu.push(end - start);
        values.stamps.push(stamp);
      }
    }
  });
})();`;

/**
 * Collects the probe values of the page for a time.
 *
 * @param page The page during play.
 * @param seconds The time.
 * @returns The values.
 */
async function probeFor(page: Page, seconds: number): Promise<ProbeValues> {
  await page.evaluate(`(() => {
    Object.assign(window.frameProbe.values, { cpu: [], gpu: [], stamps: [], disjoint: 0 });
    window.frameProbe.on = true;
  })()`);
  await page.waitForTimeout(seconds * 1000);
  // A few more frames give the results of the last queries.
  await page.evaluate('window.frameProbe.on = false');
  await page.waitForTimeout(200);
  // SAFETY: FRAME_PROBE fills these values with the fields of ProbeValues.
  return (await page.evaluate('window.frameProbe.values')) as ProbeValues;
}

/**
 * Formats the statistics of one series as one line.
 *
 * @param name The name of the series.
 * @param times The time of each frame, in milliseconds.
 * @returns The line.
 */
function statsLine(name: string, times: readonly number[]): string {
  const s = frameStats(times);
  const share = (s.within * 100).toFixed(1);
  return `${name}: n ${s.count}, p50 ${s.p50.toFixed(2)} ms, p95 ${s.p95.toFixed(2)} ms, max ${s.max.toFixed(2)} ms, ${share}% within ${FRAME_LIMIT_MS} ms`;
}

async function main(): Promise<void> {
  const flags = process.argv.slice(2);
  const scale = Number(flags.find((f) => f.startsWith('--scale='))?.slice(8) ?? '2');
  const headed = flags.includes('--headed');
  const traceOut = flags.find((f) => f.startsWith('--trace='))?.slice(8);
  const root = join(import.meta.dirname, '..');
  const server = await createServer({
    root,
    logLevel: 'error',
    server: { port: 4181, strictPort: false },
  });
  await server.listen();
  const base = server.resolvedUrls?.local[0] ?? 'http://localhost:4181/';
  // Google Chrome, with ANGLE on Metal for the GPU of the Mac. The autoplay policy lets the click
  // of the script start the audio.
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: !headed,
    args: [
      '--use-angle=metal',
      '--enable-gpu',
      '--ignore-gpu-blocklist',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: scale,
    });
    await page.addInitScript(FRAME_PROBE);
    await page.goto(`${base}?demo=perf-60`);
    await page.waitForSelector('canvas[data-demo="perf-60"]', { timeout: 60_000 });
    await page.waitForSelector('#play:enabled', { timeout: 120_000 });
    const players = await page.evaluate(() => window.zoophony?.instruments.length ?? 0);
    await page.click('#play');
    await page.waitForTimeout(WARM_SEC * 1000);
    const probe = await probeFor(page, MEASURE_SEC);
    await browser.startTracing(page, { categories: TRACE_CATEGORIES });
    await page.waitForTimeout(MEASURE_SEC * 1000);
    const trace = await browser.stopTracing();
    const songTime = await page.evaluate(() => window.zoophony?.songTime ?? 0);
    if (traceOut) {
      await writeFile(traceOut, trace);
    }
    // SAFETY: Chrome writes the trace in the JSON trace event format, with this field.
    const { traceEvents } = JSON.parse(trace.toString('utf8')) as {
      traceEvents: TraceEvent[];
    };
    const frames = traceFrames(traceEvents);
    const span = ((probe.stamps.at(-1) ?? 0) - (probe.stamps[0] ?? 0)) / 1000;
    console.log(`Browser ${browser.version()}, ${headed ? 'headed' : 'headless'}`);
    console.log(`Renderer ${probe.renderer}, timer query ${probe.timer ? 'yes' : 'no'}`);
    console.log(`Viewport 1440 x 900, device scale ${scale}, ${players} players`);
    console.log(`Song time at the end: ${songTime.toFixed(1)} s`);
    console.log(`Probe: ${MEASURE_SEC} s, ${(probe.stamps.length / span).toFixed(1)} fps`);
    console.log(statsLine('  callback (performance.now)', probe.cpu));
    console.log(statsLine('  GPU (timer query)', probe.gpu));
    console.log(`  disjoint GPU results: ${probe.disjoint}`);
    console.log(
      `Trace: ${MEASURE_SEC} s, ${(frames.callback.length / frames.spanSec).toFixed(1)} fps`,
    );
    console.log(statsLine('  FireAnimationFrame', frames.callback));
    console.log(statsLine('  main thread tasks', frames.main));
    console.log(statsLine('  GPU process tasks', frames.gpuTask));
  } finally {
    await browser.close();
    await server.close();
  }
}

if (import.meta.main) {
  await main();
}
