import { execFileSync, spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { loadavg, tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { chromium } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { createServer } from 'vite';

import { FIRST_PLAY, SAMPLES_READY } from '../src/app/dev-hook.ts';
import { chromiumArgs } from './chromium-args.ts';
import {
  busyMs,
  checkFrames,
  frameCheckFaults,
  gpuIntervals,
  otherGpuShare,
  parseTraceTable,
  webglFrames,
} from './gpu-trace.ts';
import type { FrameCheck, TraceTable } from './gpu-trace.ts';

/** The frame target of design 9.7: main-thread time and GPU time, in milliseconds. */
export const FRAME_LIMIT_MS = 4;

/** The part of the frames that must be within {@link FRAME_LIMIT_MS} (design 9.7). */
export const FRAME_SHARE = 0.95;

/** The length of one measurement, in seconds (design 9.7). */
const MEASURE_SEC = 10;

/** The play time before the first measurement, so that the lift and the warm-up end (5.2). */
const WARM_SEC = 3;

/**
 * The length of the Metal System Trace, in seconds. With no frame cap, it holds more than 500
 * frames. Xcode takes about 2 minutes to save a trace of this length on the development Mac.
 */
const METAL_SEC = 3;

/** The part of the Metal trace with other GPU work above which the tool prints a warning. */
const OTHER_GPU_LIMIT = 0.1;

/** The longest time for the record and the save of the Metal System Trace, in seconds. */
const METAL_LIMIT_SEC = 360;

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
  /** The time stamp of each frame while the Metal trace records, in milliseconds. */
  readonly marks: number[];
  /** The count of the GPU results that the driver marked as disjoint. */
  readonly disjoint: number;
  /** True if the WebGL2 context has the timer query extension. */
  readonly timer: boolean;
  /** The GPU of the WebGL2 context, from `WEBGL_debug_renderer_info`. */
  readonly renderer: string;
}

/**
 * The script that the page runs before its own code. It keeps the WebGL2 context of the stage,
 * and wraps each callback of `requestAnimationFrame` with `performance.now()` and with a GPU
 * timer query. The page reads the result of a query some frames later.
 */
const FRAME_PROBE = `(() => {
  const values = { cpu: [], gpu: [], stamps: [], marks: [], disjoint: 0, timer: false, renderer: '' };
  const probe = { on: false, mark: false, values, gl: null, ext: null };
  window.frameProbe = probe;
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const context = getContext.call(this, type, ...rest);
    // The WebGL2 check of the app makes a context on a canvas of its own first (design 2.6).
    if (type === 'webgl2' && context && this.id === 'stage') {
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
    if (probe.mark) {
      values.marks.push(stamp);
    }
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

/** One row of the frame table: a measure and the time of each of its frames. */
export interface FrameRow {
  /** What the row measures. */
  readonly name: string;
  /** The time of each frame, in milliseconds. */
  readonly times: readonly number[];
  /** True if the row is a target of design 9.7, false for a row for information. */
  readonly target: boolean;
  /** The reason that a target row fails whatever its times are, such as a failed self-check. */
  readonly note?: string;
}

/**
 * Tells if a measure meets the frame target of design 9.7: at least {@link FRAME_SHARE} of the
 * frames within {@link FRAME_LIMIT_MS}. A measure with no frames fails.
 *
 * @param times The time of each frame, in milliseconds.
 * @returns True if the measure meets the target.
 */
export function meetsTarget(times: readonly number[]): boolean {
  const stats = frameStats(times);
  return stats.count > 0 && stats.within >= FRAME_SHARE;
}

/**
 * Formats the rows of a frame measure as a Markdown table, for a commit message or a report.
 *
 * @param rows The rows.
 * @returns The lines of the table.
 */
export function frameTable(rows: readonly FrameRow[]): string[] {
  const lines = [
    `| Measure | Frames | p50 (ms) | p95 (ms) | Max (ms) | Within ${FRAME_LIMIT_MS} ms | Target |`,
    '|---|---|---|---|---|---|---|',
  ];
  for (const row of rows) {
    const s = frameStats(row.times);
    let verdict = 'information';
    if (row.target && row.note !== undefined) {
      verdict = `fail (${row.note})`;
    } else if (row.target) {
      verdict = meetsTarget(row.times) ? 'pass' : 'fail';
    }
    const cells = [
      row.name,
      String(s.count),
      s.p50.toFixed(2),
      s.p95.toFixed(2),
      s.max.toFixed(2),
      `${(s.within * 100).toFixed(1)}%`,
      verdict,
    ];
    lines.push(`| ${cells.join(' | ')} |`);
  }
  return lines;
}

/** The highest 1-minute load average at which a phase of the measure starts. */
export const MAX_LOAD = 8;

/** The longest wait for a load at or below the limit before a phase, in seconds. */
const LOAD_WAIT_SEC = 300;

/** The time between two reads of the load during a wait, in seconds. */
const LOAD_POLL_SEC = 10;

/** The flags of `pnpm frame` that take a value, such as `--demo=<id>`. */
const VALUE_FLAGS = new Set(['demo', 'scale', 'max-load', 'wait', 'keep']);

/** The flags of `pnpm frame` that take no value, such as `--headed`. */
const SWITCH_FLAGS = new Set(['headed', 'free', 'no-metal']);

/** The options of the frame measure (the flags of `pnpm frame`). */
export interface FrameOptions {
  /** The demo id, or `perf-60`, the file of the frame target. */
  readonly demo: string;
  /** The device pixels for each CSS pixel. */
  readonly scale: number;
  /** True to show the browser windows. */
  readonly headed: boolean;
  /** True for reduced motion: the app starts in Free mode at the default view (design 2.5). */
  readonly free: boolean;
  /** The highest 1-minute load average at which a phase starts. */
  readonly maxLoad: number;
  /** The longest wait for a low load before a phase, in seconds. */
  readonly waitSec: number;
  /** False to skip the Metal System Trace. */
  readonly metal: boolean;
  /** The folder for the raw traces of the run, or `undefined` to keep none. */
  readonly keep: string | undefined;
}

/**
 * Reads the options from the flags of the command line.
 *
 * @param flags The flags.
 * @returns The options.
 * @throws Error for an unknown flag, a value flag with no value, a switch with a value, or a value
 *   that is not a positive number.
 */
export function frameOptions(flags: readonly string[]): FrameOptions {
  const values = new Map<string, string>();
  const switches = new Set<string>();
  for (const flag of flags) {
    const match = /^--([a-z-]+)(?:=(.*))?$/.exec(flag);
    const name = match?.[1];
    if (!match || !name) {
      throw new Error(`Unknown argument "${flag}".`);
    }
    const value = match[2];
    if (VALUE_FLAGS.has(name)) {
      if (!value) {
        throw new Error(`The flag --${name} needs a value: --${name}=<value>.`);
      }
      values.set(name, value);
    } else if (SWITCH_FLAGS.has(name)) {
      if (value !== undefined) {
        throw new Error(`The flag --${name} takes no value.`);
      }
      switches.add(name);
    } else {
      throw new Error(`Unknown flag "--${name}".`);
    }
  }
  const positive = (name: string, fallback: number): number => {
    const text = values.get(name);
    const value = text === undefined ? fallback : Number(text);
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`The flag --${name} needs a positive number, not "${text ?? ''}".`);
    }
    return value;
  };
  return {
    demo: values.get('demo') ?? 'perf-60',
    scale: positive('scale', 2),
    headed: switches.has('headed'),
    free: switches.has('free'),
    maxLoad: positive('max-load', MAX_LOAD),
    waitSec: positive('wait', LOAD_WAIT_SEC),
    metal: !switches.has('no-metal'),
    keep: values.get('keep'),
  };
}

/**
 * Adds the time of each GPU performance state in the table `gpu-performance-state-intervals` of a
 * Metal System Trace. The table has a row only for a state that the trace saw start, so its rows
 * can cover less than the trace.
 *
 * @param table The parsed table.
 * @returns The time of each state, such as `Maximum` or `Minimum`, in milliseconds.
 * @throws Error if the table has no state column or no duration column.
 */
export function stateTimes(table: TraceTable): Map<string, number> {
  const state = table.columns.indexOf('gpu-performance-state');
  const duration = table.columns.indexOf('duration');
  if (state < 0 || duration < 0) {
    throw new Error('The table of the GPU performance states has no state or duration column.');
  }
  const times = new Map<string, number>();
  for (const row of table.rows) {
    const name = row[state]?.fmt ?? '';
    times.set(name, (times.get(name) ?? 0) + Number(row[duration]?.raw ?? 0) / 1e6);
  }
  return times;
}

/**
 * Calculates the frame rate of the probe values.
 *
 * @param stamps The time stamp of each frame, in milliseconds.
 * @returns The frames for each second, or 0 with fewer than two frames.
 */
export function framesPerSecond(stamps: readonly number[]): number {
  const span = (stamps.at(-1) ?? 0) - (stamps[0] ?? 0);
  return span > 0 ? ((stamps.length - 1) * 1000) / span : 0;
}

/**
 * The browsers, the child processes, and the temporary folders of a run, so that a stop of the run
 * can stop and remove them.
 */
const RUNNING = {
  /** The browsers that are open. */
  browsers: new Set<Browser>(),
  /** The child processes of `xctrace` that run. */
  children: new Set<ChildProcess>(),
  /** The temporary folders that the run has not removed. */
  folders: new Set<string>(),
  /** The stop of the run after a signal. The waits for a low load end at the stop. */
  stop: new AbortController(),
  /** The promise of the end of the measure, which removes its folders at its end. */
  measure: Promise.resolve(),
};

/** The flags of Chrome: ANGLE on Metal for the GPU of the Mac, and audio with no gesture. */
const CHROME_ARGS = chromiumArgs('darwin');

/** The flags that remove the frame cap of Chrome, so that the GPU runs at its highest clock. */
const UNCAPPED_ARGS = ['--disable-gpu-vsync', '--disable-frame-rate-limit'];

/**
 * Starts Google Chrome and keeps it in {@link RUNNING} until it closes.
 *
 * @param options The options.
 * @param uncapped True to remove the frame cap.
 * @returns The browser.
 */
async function launchChrome(options: FrameOptions, uncapped: boolean): Promise<Browser> {
  RUNNING.stop.signal.throwIfAborted();
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: !options.headed,
    args: uncapped ? [...CHROME_ARGS, ...UNCAPPED_ARGS] : CHROME_ARGS,
    handleSIGINT: false,
    handleSIGTERM: false,
    handleSIGHUP: false,
  });
  RUNNING.browsers.add(browser);
  browser.on('disconnected', () => RUNNING.browsers.delete(browser));
  return browser;
}

/**
 * Opens the demo in a new page with the frame probe, waits until its samples are ready, and
 * starts the play.
 *
 * @param browser The browser.
 * @param base The URL of the dev server.
 * @param options The options.
 * @returns The page during play, after the warm-up.
 */
async function playDemo(browser: Browser, base: string, options: FrameOptions): Promise<Page> {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: options.scale,
    reducedMotion: options.free ? 'reduce' : 'no-preference',
  });
  await page.addInitScript(FRAME_PROBE);
  await page.goto(`${base}#demo=${options.demo}`);
  await page.waitForSelector(`canvas[data-demo="${options.demo}"]`, { timeout: 60_000 });
  await page.waitForSelector(SAMPLES_READY, { timeout: 120_000 });
  await page.click(FIRST_PLAY);
  await page.waitForTimeout(WARM_SEC * 1000);
  return page;
}

/**
 * Reads the 1-minute load average.
 *
 * @returns The load average.
 */
function currentLoad(): number {
  return loadavg()[0] ?? 0;
}

/**
 * Waits until the 1-minute load average is at or below the limit of the options. A busy machine
 * slows the frames, so a measure at a high load gives false values.
 *
 * @param options The options.
 * @param phase The name of the phase, for the output.
 * @returns The load average at the start of the phase.
 * @throws Error if the load stays above the limit for the time of the wait.
 */
async function waitForLowLoad(options: FrameOptions, phase: string): Promise<number> {
  const end = Date.now() + options.waitSec * 1000;
  let load = currentLoad();
  while (load > options.maxLoad) {
    if (Date.now() >= end) {
      throw new Error(
        `The load average stayed above ${options.maxLoad} for ${options.waitSec} s ` +
          `(${load.toFixed(1)}). Stop the other work, or run again later.`,
      );
    }
    console.log(`Load average ${load.toFixed(1)} is above ${options.maxLoad}: ${phase} waits.`);
    await delay(LOAD_POLL_SEC * 1000, undefined, { signal: RUNNING.stop.signal });
    load = currentLoad();
  }
  return load;
}

/** The values of the phase at the frame rate of the display. */
interface CappedMeasure {
  /** The version of Chrome and its mode. */
  readonly browser: string;
  /** The GPU of the WebGL2 context. */
  readonly renderer: string;
  /** The count of the players of the demo. */
  readonly players: number;
  /** The camera mode at the start of the play. */
  readonly camera: string;
  /** The values of the frame probe. */
  readonly probe: ProbeValues;
  /** The frames of the Chrome trace. */
  readonly frames: TraceFrames;
}

/**
 * Measures at the frame rate of the display: the callback and the GPU timer query of each frame
 * for {@link MEASURE_SEC}, then a Chrome trace of the main thread for the same time (design 9.7).
 *
 * @param base The URL of the dev server.
 * @param options The options.
 * @returns The values.
 */
async function measureCapped(base: string, options: FrameOptions): Promise<CappedMeasure> {
  const browser = await launchChrome(options, false);
  try {
    const page = await playDemo(browser, base, options);
    const players = await page.evaluate(() => window.zoophony?.instruments.length ?? 0);
    // The frame target holds in both camera modes (design 9.7). Cinematic is the default.
    const camera = await page.evaluate(() => window.zoophony?.cameraMode ?? '');
    const probe = await probeFor(page, MEASURE_SEC);
    await browser.startTracing(page, { categories: TRACE_CATEGORIES });
    await page.waitForTimeout(MEASURE_SEC * 1000);
    const trace = await browser.stopTracing();
    if (options.keep) {
      await writeFile(join(options.keep, 'main-trace.json'), trace);
    }
    // SAFETY: Chrome writes the trace in the JSON trace event format, with this field.
    const { traceEvents } = JSON.parse(trace.toString('utf8')) as {
      traceEvents: TraceEvent[];
    };
    return {
      browser: `Chrome ${browser.version()}, ${options.headed ? 'headed' : 'headless'}`,
      renderer: probe.renderer,
      players,
      camera,
      probe,
      frames: traceFrames(traceEvents),
    };
  } finally {
    await browser.close();
  }
}

/**
 * Runs `xcrun xctrace` with arguments and waits for its end. The run stays in {@link RUNNING}.
 * After a signal, it starts no run, so that no export starts after the stop of the measure.
 *
 * @param args The arguments after `xctrace`.
 * @param limitMs The longest time, in milliseconds. Then the function stops the run.
 * @param onOutput A function for each part of the output.
 * @param stop The stop of the measure: by default the stop of {@link RUNNING}.
 * @returns A promise of the end of the run. It rejects with an `AbortError` after the stop.
 */
export function xctrace(
  args: readonly string[],
  limitMs: number,
  onOutput: (text: string) => void = () => undefined,
  stop: AbortSignal = RUNNING.stop.signal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    stop.throwIfAborted();
    const child = spawn('xcrun', ['xctrace', ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    RUNNING.children.add(child);
    let output = '';
    const collect = (data: Buffer): void => {
      output += data.toString();
      onOutput(data.toString());
    };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    const timer = setTimeout(() => {
      void stopChild(child);
      reject(new Error(`xctrace ${args[0] ?? ''} did not end in ${limitMs} ms:\n${output}`));
    }, limitMs);
    child.on('error', (error) => {
      clearTimeout(timer);
      RUNNING.children.delete(child);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      RUNNING.children.delete(child);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`xctrace ${args[0] ?? ''} ended with ${code ?? 'a signal'}:\n${output}`));
      }
    });
  });
}

/** The time from the interrupt of a child process to its kill, in milliseconds. */
const KILL_AFTER_MS = 3000;

/**
 * Stops a child process: an interrupt first, so that `xctrace` can end its file, then a kill
 * after {@link KILL_AFTER_MS}.
 *
 * @param child The child process.
 * @returns A promise of the close of the child process.
 */
function stopChild(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const kill = setTimeout(() => child.kill('SIGKILL'), KILL_AFTER_MS);
    child.once('close', () => {
      clearTimeout(kill);
      resolve();
    });
    child.kill('SIGINT');
  });
}

/**
 * Tells if `xcrun xctrace` of Xcode is on the machine.
 *
 * @returns True if it is.
 */
function hasXctrace(): boolean {
  try {
    execFileSync('xcrun', ['--find', 'xctrace'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Tells if a value is the size of a drawing buffer: two positive integers.
 *
 * @param value The value from the page.
 * @returns True if the value is a size.
 */
function isSize(value: unknown): value is readonly [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((side) => Number.isInteger(side) && Number(side) > 0)
  );
}

/**
 * Reads the size of the drawing buffer of the stage. It is the size of the canvas surfaces in the
 * Metal trace. The pixel ratio of the quality tier can make it smaller than the device pixels of
 * the viewport.
 *
 * @param page The page during play.
 * @returns The width and the height, in pixels.
 * @throws Error if the page has no WebGL2 context of the stage.
 */
async function drawingBufferSize(page: Page): Promise<readonly [number, number]> {
  const size: unknown = await page.evaluate(
    '[window.frameProbe.gl?.drawingBufferWidth, window.frameProbe.gl?.drawingBufferHeight]',
  );
  if (!isSize(size)) {
    throw new Error('The page has no WebGL2 context of the stage.');
  }
  return size;
}

/**
 * Tells if a value from the page is a list of finite numbers.
 *
 * @param value The value.
 * @returns True if it is.
 */
function isNumbers(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => Number.isFinite(item));
}

/**
 * Reads the song time of the page.
 *
 * @param page The page during play.
 * @returns The song time in seconds, or `NaN` when the page has none.
 */
async function songTimeOf(page: Page): Promise<number> {
  const song = await page.evaluate('[window.zoophony?.songTime]').catch(() => null);
  return isNumbers(song) && song[0] !== undefined ? song[0] : NaN;
}

/**
 * Starts the marks of the frames of the page during the Metal trace (`FRAME_PROBE`).
 *
 * @param page The page during play.
 * @returns The song time at the start, in seconds.
 */
async function startMarks(page: Page): Promise<number> {
  await page
    .evaluate('(window.frameProbe.values.marks = [], window.frameProbe.mark = true)')
    .catch(() => undefined);
  return songTimeOf(page);
}

/** The values of the page at the end of the record of the Metal trace. */
interface TraceEnd {
  /** The song time, in seconds. */
  readonly song: number;
  /** The time stamp of each frame during the record, in milliseconds. */
  readonly marks: readonly number[];
}

/**
 * Stops the marks of the frames of the page and reads them.
 *
 * @param page The page during play.
 * @returns The song time and the marks.
 */
async function endMarks(page: Page): Promise<TraceEnd> {
  const marks = await page
    .evaluate('(window.frameProbe.mark = false, window.frameProbe.values.marks)')
    .catch(() => null);
  return { song: await songTimeOf(page), marks: isNumbers(marks) ? marks : [] };
}

/** The values of the GPU phase with no frame cap. */
interface UncappedMeasure {
  /** The values of the frame probe, with the GPU timer query of each frame. */
  readonly probe: ProbeValues;
  /** The GPU time of each WebGL frame in the Metal System Trace, or `null` with no trace. */
  readonly metal: readonly number[] | null;
  /** The time of each GPU performance state in the trace, in milliseconds, or `null`. */
  readonly states: ReadonlyMap<string, number> | null;
  /** The part of the trace time in which other processes used the GPU, or `null`. */
  readonly otherShare: number | null;
  /** The self-check of the WebGL frames of the trace, or `null` with no trace. */
  readonly check: FrameCheck | null;
  /** The frame rate of the page during the record of the trace, or `null` with no trace. */
  readonly traceFps: number | null;
  /** The faults of the self-check ({@link frameCheckFaults}). */
  readonly faults: readonly string[];
  /** The song time at the start and at the end of the record of the trace, in seconds. */
  readonly songs: readonly [number, number] | null;
  /** The width and the height of the drawing buffer of the stage, in pixels. */
  readonly canvas: readonly [number, number];
}

/**
 * Measures the GPU time with no frame cap, so that the GPU runs at its highest clock (design
 * 9.7). At the frame rate of the display, the GPU of the Mac lowers its clock while the frames
 * fit, so a timer query there measures the clock more than the work. The phase takes the GPU
 * timer query of each frame for {@link MEASURE_SEC}, then a Metal System Trace for
 * {@link METAL_SEC}. The trace gives the time of each encoder of the WebGL frames of the GPU
 * process of Chrome.
 *
 * @param base The URL of the dev server.
 * @param options The options.
 * @param metal True to record the Metal System Trace.
 * @returns The values.
 */
async function measureUncapped(
  base: string,
  options: FrameOptions,
  metal: boolean,
): Promise<UncappedMeasure> {
  const browser = await launchChrome(options, true);
  const folder = await mkdtemp(join(tmpdir(), 'zoophony-frame-'));
  RUNNING.folders.add(folder);
  try {
    const page = await playDemo(browser, base, options);
    const canvas = await drawingBufferSize(page);
    const probe = await probeFor(page, MEASURE_SEC);
    if (!metal) {
      const none = { states: null, otherShare: null, check: null, traceFps: null, faults: [] };
      return { probe, metal: null, songs: null, canvas, ...none };
    }

    const cdp = await browser.newBrowserCDPSession();
    const { processInfo } = await cdp.send('SystemInfo.getProcessInfo');
    const gpu = processInfo.find((info) => info.type.toLowerCase() === 'gpu');
    if (!gpu) {
      throw new Error('Chrome gave no GPU process.');
    }
    // A trace of all processes saved in about 2 minutes. A trace that attached to the GPU process
    // did not save in that time.
    const traceFile = join(folder, 'gpu.trace');
    const record = ['record', '--template', 'Metal System Trace', '--all-processes'];
    const time = ['--time-limit', `${METAL_SEC}s`, '--output', traceFile, '--no-prompt'];
    // The trace covers one shot of the plan, so the output gives its song times. The page marks
    // its frames during the record: their rate gives the expected count of the self-check.
    let started: Promise<number> = Promise.resolve(NaN);
    let ended: Promise<TraceEnd> = Promise.resolve({ song: NaN, marks: [] });
    let stopped = false;
    await xctrace([...record, ...time], METAL_LIMIT_SEC * 1000, (text) => {
      if (text.includes('Starting recording')) {
        started = startMarks(page);
      }
      // The page stops its frames, so that the save of the trace gets the CPU.
      if (!stopped && text.includes('ending recording')) {
        stopped = true;
        ended = endMarks(page).then((end) => {
          page.goto('about:blank').catch(() => undefined);
          return end;
        });
      }
    });
    const end = await ended;
    const songs: readonly [number, number] = [await started, end.song];
    await browser.close();

    const table = async (schema: string): Promise<TraceTable> => {
      const file = join(options.keep ?? folder, `${schema}.xml`);
      const run = '/trace-toc/run[@number="1"]/data';
      const query = ['--xpath', `${run}/table[@schema="${schema}"]`, '--output', file];
      await xctrace(['export', '--input', traceFile, ...query], 120_000);
      return parseTraceTable(await readFile(file, 'utf8'));
    };
    const intervals = gpuIntervals(await table('metal-gpu-intervals'));
    const frames = webglFrames(intervals, `(${gpu.id})`, canvas);
    const check = checkFrames(intervals, `(${gpu.id})`, canvas, frames);
    const traceFps = framesPerSecond(end.marks);
    const faults = frameCheckFaults(check, traceFps > 0 ? traceFps * check.spanSec : null);
    const states = stateTimes(await table('gpu-performance-state-intervals'));
    const otherShare = otherGpuShare(intervals, `(${gpu.id})`);
    const metalTimes = frames.map((frame) => busyMs(frame));
    return { probe, metal: metalTimes, states, otherShare, songs, canvas, check, traceFps, faults };
  } finally {
    await browser.close();
    await rm(folder, { recursive: true, force: true });
    RUNNING.folders.delete(folder);
  }
}

/** The longest wait for the end of the measure after a signal, in milliseconds. */
const STOP_WAIT_MS = 30_000;

/**
 * Stops the run after a signal. It waits for the close of each child process, each browser, and
 * the dev server, and for the end of the measure. Then it removes each temporary folder and ends
 * the process with the exit code 130.
 *
 * @param close Closes the dev server.
 * @returns The function for the signal.
 */
function stopOnSignal(close: () => Promise<void>): () => void {
  return () => {
    console.log(
      '\nStopped: the measure closes its browsers, xctrace, and the dev server, and removes ' +
        'its temporary folders.',
    );
    RUNNING.stop.abort();
    const children = [...RUNNING.children].map((child) => stopChild(child));
    const browsers = [...RUNNING.browsers].map((browser) => browser.close());
    void (async () => {
      await Promise.allSettled([...children, ...browsers, close()]);
      // The measure ends when its browser and its child process close.
      await Promise.race([RUNNING.measure.catch(() => undefined), delay(STOP_WAIT_MS)]);
      const folders = [...RUNNING.folders].map((folder) =>
        rm(folder, { recursive: true, force: true }),
      );
      await Promise.allSettled(folders);
      process.exit(130);
    })();
  };
}

/**
 * Formats the self-check of the GPU row (design 9.7) for the output.
 *
 * @param check The check of the WebGL frames of the Metal trace.
 * @param traceFps The frame rate of the page during the record of the trace.
 * @param faults The faults of the check.
 * @returns The lines.
 */
export function checkLines(
  check: FrameCheck,
  traceFps: number,
  faults: readonly string[],
): string[] {
  const expected = traceFps * check.spanSec;
  const off = expected > 0 ? `${((check.frames / expected - 1) * 100).toFixed(1)}%` : 'no count';
  const perFrame = (ms: number): string => (check.frames > 0 ? ms / check.frames : 0).toFixed(3);
  const lines = [
    `Self-check of the GPU row: ${check.frames} WebGL frames in ${check.spanSec.toFixed(3)} s ` +
      `of the Metal trace. The page drew ${traceFps.toFixed(1)} fps during the record: ` +
      `${expected.toFixed(0)} frames expected (${off}). Merged frames: ${check.merged}.`,
    `Dropped by the filter in each frame: canvas buffers ${perFrame(check.droppedCanvas.ms)} ms ` +
      `(${check.droppedCanvas.buffers} buffers), other buffers ` +
      `${perFrame(check.droppedOther.ms)} ms (${check.droppedOther.buffers} buffers).`,
  ];
  if (faults.length > 0) {
    lines.push(`Warning: the self-check fails, so the GPU row fails. ${faults.join(' ')}`);
  }
  return lines;
}

/**
 * Formats a load average.
 *
 * @param load The load average.
 * @returns The text, with one decimal.
 */
function loadText(load: number): string {
  return load.toFixed(1);
}

async function main(): Promise<void> {
  const started = Date.now();
  const options = frameOptions(process.argv.slice(2));
  const metal = options.metal && hasXctrace();
  if (options.keep) {
    await mkdir(options.keep, { recursive: true });
  }

  const loads: string[] = [];
  loads.push(
    `main-thread phase ${loadText(await waitForLowLoad(options, 'the main-thread phase'))}`,
  );
  const root = join(import.meta.dirname, '..');
  // 4182 is the port of the end-to-end tests, so the server starts higher.
  const server = await createServer({
    root,
    logLevel: 'error',
    server: { port: 4191, strictPort: false },
  });
  const close = (): Promise<void> => server.close();
  const onSignal = stopOnSignal(close);
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);
  try {
    await server.listen();
    const base = server.resolvedUrls?.local[0] ?? 'http://localhost:4191/';
    const capped = await measureCapped(base, options);
    loads.push(`GPU phase ${loadText(await waitForLowLoad(options, 'the GPU phase'))}`);
    const uncapped = await measureUncapped(base, options, metal);
    loads.push(`end ${loadText(currentLoad())}`);

    const rows: FrameRow[] = [
      {
        name: 'Main thread: tasks of each frame (Chrome trace, 60 fps)',
        times: capped.frames.main,
        target: true,
      },
    ];
    if (uncapped.metal) {
      const row = {
        name: 'GPU: WebGL frames in the Metal trace (no frame cap)',
        times: uncapped.metal,
        target: true,
      };
      rows.push(uncapped.faults.length > 0 ? { ...row, note: 'self-check' } : row);
    }
    rows.push(
      {
        // On ANGLE on Metal, the query gets the whole command buffer with its wait in the full
        // queue of the GPU, so it is for information (design 9.7).
        name: 'GPU: timer query (no frame cap)',
        times: uncapped.probe.gpu,
        target: false,
      },
      {
        name: 'GPU: timer query (60 fps, clock of the GPU)',
        times: capped.probe.gpu,
        target: false,
      },
      {
        name: 'Frame callback (performance.now, 60 fps)',
        times: capped.probe.cpu,
        target: false,
      },
    );

    const view = options.free ? 'Free' : capped.camera;
    const size = `1440 × 900 at the device scale ${options.scale}`;
    console.log(`Frame measure of ${options.demo} (${capped.players} players), ${view}, ${size}`);
    console.log(`${capped.browser}, ${capped.renderer}`);
    console.log(`Drawing buffer of the stage: ${uncapped.canvas.join(' × ')} pixels.`);
    console.log(`Load average (1 min): ${loads.join(', ')}. Limit ${options.maxLoad}.`);
    const fps = framesPerSecond(capped.probe.stamps).toFixed(1);
    const uncappedFps = framesPerSecond(uncapped.probe.stamps).toFixed(1);
    console.log(`Frame rate: ${fps} fps with the cap, ${uncappedFps} fps with no cap.`);
    const disjoint = capped.probe.disjoint + uncapped.probe.disjoint;
    console.log(`Disjoint timer results (dropped): ${disjoint}.`);
    if (!uncapped.states || uncapped.otherShare === null) {
      console.log('No Metal trace (--no-metal, or no Xcode): the tool does not check the GPU.');
    } else {
      const states = [...uncapped.states].map(([name, ms]) => `${name} ${ms.toFixed(0)} ms`);
      console.log(
        `GPU performance states in the ${METAL_SEC} s of the Metal trace: ${states.join(', ')}.`,
      );
      const other = (uncapped.otherShare * 100).toFixed(0);
      console.log(`Other processes used the GPU in ${other}% of the Metal trace.`);
      const [from, to] = uncapped.songs ?? [NaN, NaN];
      console.log(
        `The Metal trace started at the song time ${from.toFixed(1)} s and ended at ${to.toFixed(1)} s.`,
      );
      if (uncapped.check) {
        for (const line of checkLines(uncapped.check, uncapped.traceFps ?? 0, uncapped.faults)) {
          console.log(line);
        }
      }
      if (uncapped.otherShare > OTHER_GPU_LIMIT) {
        console.log(
          'The other GPU work makes the GPU values too high. Close the pages that render, ' +
            'and run again.',
        );
      }
    }
    console.log('');
    for (const line of frameTable(rows)) {
      console.log(line);
    }
    console.log(`\nRun time: ${((Date.now() - started) / 1000).toFixed(0)} s.`);
    if (rows.some((row) => row.target && (row.note !== undefined || !meetsTarget(row.times)))) {
      console.log('The frame target of design 9.7 fails.');
      process.exitCode = 1;
    }
  } finally {
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
    await close();
  }
}

if (import.meta.main) {
  RUNNING.measure = main();
  try {
    await RUNNING.measure;
  } catch (error) {
    // After a signal, the handler ends the process with the exit code 130.
    if (!RUNNING.stop.signal.aborted) {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 2;
    }
  }
}
