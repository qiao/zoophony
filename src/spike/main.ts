import { pieceGainDb } from '../audio/demo-loudness.ts';
import type { WorkletPlayer } from '../audio/player.ts';
import { heardTimeFromLatency, heardTimeFromTimestamp, songTimeAt } from '../audio/clock.ts';
import type { ClockAnchor } from '../audio/clock.ts';
import { fetchPlainBytes } from '../audio/plain-bytes.ts';
import { demoFromQuery, demoUrl } from '../app/demos.ts';
import type { DemoId } from '../app/demos.ts';

/**
 * The demo of the spike: the Beethoven 9 demo, a full orchestra with timpani and a choir. Until
 * 2026-10-05, it was the Beethoven 5 demo, the default demo of step 1. The query `?demo=<id>`
 * selects another demo, for example to measure the load target of the default demo.
 */
const SPIKE_DEMO: DemoId = 'beethoven-9';

/** The values of the spike page. The page shows each one, and `window.spike` holds them. */
interface SpikeValues {
  /** `loading`, `ready`, `playing`, `paused`, or `error: <message>`. */
  state: string;
  /** `Player.now()`, in song seconds. */
  songTime: number;
  /** The last clock anchor of the processor. */
  anchor: ClockAnchor | null;
  /** The song time from `getOutputTimestamp()` (design 6.7, first method). */
  clockTimestamp: number;
  /** The song time from `currentTime - outputLatency` (design 6.7, second method). */
  clockLatency: number;
  /** `clockTimestamp - clockLatency`, in milliseconds. */
  clockDiffMs: number;
  outputLatency: number;
  baseLatency: number;
  contextState: string;
  sampleRate: number;
  /** The number of preset files of the demo. */
  presetFiles: number;
  /** The time from the start of `load()` to its end: engine, index, fetch, decode, and banks. */
  loadMs: number | null;
  /** The PCM SF2 size of the presets, in bytes. */
  pcmBytes: number;
  /** The time from the click on play to the first sound, with `getOutputTimestamp()`. */
  firstSoundMs: number | null;
  /** The same time with `currentTime` and `outputLatency` (or `baseLatency`). */
  firstSoundLatencyMs: number | null;
  /** Blocks that the processor rendered while playing. */
  blocks: number;
  /** Blocks with a render time above the block length. */
  slowBlocks: number;
  maxRenderMs: number;
  /** The timer of the render time in the worklet: `performance.now` or `Date.now` (1 ms steps). */
  renderTimer: string;
  /** The song length of the demo. */
  durationSec: number;
  /** The number of errors on the page and in the processor. */
  errors: number;
  play: () => void;
  pause: () => void;
  seek: (songSec: number) => void;
}

declare global {
  interface Window {
    spike: SpikeValues;
  }
}

const values: SpikeValues = {
  state: 'loading',
  songTime: 0,
  anchor: null,
  clockTimestamp: 0,
  clockLatency: 0,
  clockDiffMs: 0,
  outputLatency: 0,
  baseLatency: 0,
  contextState: '',
  sampleRate: 0,
  presetFiles: 0,
  loadMs: null,
  pcmBytes: 0,
  firstSoundMs: null,
  firstSoundLatencyMs: null,
  blocks: 0,
  slowBlocks: 0,
  maxRenderMs: 0,
  renderTimer: '',
  durationSec: 0,
  errors: 0,
  play: () => undefined,
  pause: () => undefined,
  seek: () => undefined,
};
window.spike = values;

function fixed(value: number | null): string {
  return value === null ? '-' : value.toFixed(3);
}

/** The rows of the table: the element id, the label, and the text of each value. */
const ROWS: readonly (readonly [string, string, (spike: SpikeValues) => string])[] = [
  ['state', 'State', (spike) => spike.state],
  ['song-time', 'Song time, Player.now() (s)', (spike) => fixed(spike.songTime)],
  ['anchor', 'Last anchor', (spike) => JSON.stringify(spike.anchor)],
  [
    'clock-timestamp',
    'Song time, getOutputTimestamp() (s)',
    (spike) => fixed(spike.clockTimestamp),
  ],
  ['clock-latency', 'Song time, currentTime - latency (s)', (spike) => fixed(spike.clockLatency)],
  ['clock-diff-ms', 'Difference of the two clocks (ms)', (spike) => fixed(spike.clockDiffMs)],
  ['output-latency', 'outputLatency (s)', (spike) => fixed(spike.outputLatency)],
  ['base-latency', 'baseLatency (s)', (spike) => fixed(spike.baseLatency)],
  ['context-state', 'AudioContext state', (spike) => spike.contextState],
  ['sample-rate', 'Sample rate (Hz)', (spike) => String(spike.sampleRate)],
  ['preset-files', 'Preset files', (spike) => String(spike.presetFiles)],
  ['load-ms', 'Load time of the presets (ms)', (spike) => fixed(spike.loadMs)],
  ['pcm-bytes', 'PCM size (bytes)', (spike) => String(spike.pcmBytes)],
  [
    'first-sound-ms',
    'Click to first sound, getOutputTimestamp() (ms)',
    (spike) => fixed(spike.firstSoundMs),
  ],
  [
    'first-sound-latency-ms',
    'Click to first sound, latency (ms)',
    (spike) => fixed(spike.firstSoundLatencyMs),
  ],
  ['blocks', 'Blocks while playing', (spike) => String(spike.blocks)],
  [
    'slow-blocks',
    'Slow blocks (render time above the block length)',
    (spike) => String(spike.slowBlocks),
  ],
  ['max-render-ms', 'Longest render time of a block (ms)', (spike) => fixed(spike.maxRenderMs)],
  ['render-timer', 'Timer of the render time in the worklet', (spike) => spike.renderTimer],
  ['duration-sec', 'Song length (s)', (spike) => fixed(spike.durationSec)],
  ['errors', 'Errors', (spike) => String(spike.errors)],
];

function element<T extends HTMLElement>(id: string, type: new () => T): T {
  const found = document.getElementById(id);
  if (!(found instanceof type)) {
    throw new Error(`The spike page has no element #${id}.`);
  }
  return found;
}

const table = element('values', HTMLTableSectionElement);

const cells = new Map<string, HTMLTableCellElement>();
for (const [id, label] of ROWS) {
  const row = table.insertRow();
  row.insertCell().textContent = label;
  const cell = row.insertCell();
  cell.id = id;
  cells.set(id, cell);
}

function show(): void {
  for (const [id, , text] of ROWS) {
    const cell = cells.get(id);
    if (cell) {
      cell.textContent = text(values);
    }
  }
}

function fail(message: string): void {
  values.errors += 1;
  values.state = `error: ${message}`;
  show();
}

window.addEventListener('error', (event) => {
  fail(event.message);
});
window.addEventListener('unhandledrejection', (event) => {
  fail(String(event.reason));
});
const consoleError = console.error.bind(console);
console.error = (...data: unknown[]) => {
  values.errors += 1;
  consoleError(...data);
};

/** The click time of the play button, and the first note time of the song. */
interface FirstSoundProbe {
  readonly clickMs: number;
  readonly firstNoteSec: number;
}

/** Calculates the heard context time with the latency method of design 6.7. */
function latencyHeardTime(context: AudioContext): number {
  const outputLatency = Number(context.outputLatency) || 0;
  return heardTimeFromLatency(context.currentTime, outputLatency, context.baseLatency);
}

/**
 * Calculates the heard context time with `getOutputTimestamp()` (design 6.7). Before the context
 * runs, the timestamp is 0, so the latency method applies.
 */
function stampHeardTime(context: AudioContext): number {
  const stamp = context.getOutputTimestamp();
  if (stamp.contextTime && stamp.performanceTime) {
    return heardTimeFromTimestamp(
      { contextTime: stamp.contextTime, performanceTime: stamp.performanceTime },
      performance.now(),
    );
  }
  return latencyHeardTime(context);
}

function updateClock(player: WorkletPlayer, probe: FirstSoundProbe | undefined): void {
  const context = player.context;
  const anchors = player.anchors;
  values.songTime = player.now();
  values.anchor = anchors.at(-1) ?? null;
  const fromStamp = stampHeardTime(context);
  const fromLatency = latencyHeardTime(context);
  values.clockTimestamp = songTimeAt(anchors, fromStamp, values.durationSec);
  values.clockLatency = songTimeAt(anchors, fromLatency, values.durationSec);
  values.clockDiffMs = (fromStamp - fromLatency) * 1000;
  values.outputLatency = Number(context.outputLatency) || 0;
  values.baseLatency = context.baseLatency;
  values.contextState = context.state;
  const stats = player.renderStats;
  if (stats) {
    values.blocks = stats.blocks;
    values.slowBlocks = stats.slowBlocks;
    values.maxRenderMs = stats.maxRenderMs;
    values.renderTimer = stats.timer;
  }
  if (probe && values.firstSoundMs === null) {
    measureFirstSound(player, probe);
  }
}

/**
 * Calculates the time from the click to the first sound (design 9.7). The first anchor after the
 * click gives the context time of the first note. The two clock methods give the moment that
 * the listener hears that context time.
 */
function measureFirstSound(player: WorkletPlayer, probe: FirstSoundProbe): void {
  const anchor = player.anchors.find((item) => item.rate > 0);
  const stamp = player.context.getOutputTimestamp();
  if (!anchor || !stamp.contextTime || !stamp.performanceTime) {
    return;
  }
  const noteContextTime =
    anchor.contextTime + Math.max(0, probe.firstNoteSec - anchor.songTime) / anchor.rate;
  const heardMs = stamp.performanceTime + (noteContextTime - stamp.contextTime) * 1000;
  values.firstSoundMs = heardMs - probe.clickMs;
  const now = performance.now();
  const latencyHeardMs = now + (noteContextTime - latencyHeardTime(player.context)) * 1000;
  values.firstSoundLatencyMs = latencyHeardMs - probe.clickMs;
}

/**
 * Fetches the demo of the query, or {@link SPIKE_DEMO}, after the changes of
 * `demos/patches.json`. `pnpm dev` and `pnpm build` write the file into the site, and the build
 * gzips it (design 8.3).
 */
async function fetchDemo(): Promise<Uint8Array> {
  const url = demoUrl(demoFromQuery(window.location.search, SPIKE_DEMO), import.meta.env.BASE_URL);
  return fetchPlainBytes(url);
}

async function start(): Promise<void> {
  const [{ WorkletPlayer }, { buildScore }, demo] = await Promise.all([
    import('../audio/player.ts'),
    import('../score/score.ts'),
    fetchDemo(),
  ]);
  const result = buildScore(demo, 'auto');
  if (!result.ok) {
    throw new Error(`The demo was refused: ${result.error}.`);
  }
  const score = result.score;
  const player = new WorkletPlayer(
    new URL(import.meta.env.BASE_URL, window.location.href),
    (error) => {
      fail(String(error));
    },
  );
  values.durationSec = score.durationSec;
  values.sampleRate = player.context.sampleRate;
  const firstNote = score.synthEvents.find((event) => event.kind === 0x90);
  let probe: FirstSoundProbe | undefined;

  values.play = () => {
    probe ??= { clickMs: performance.now(), firstNoteSec: firstNote?.timeSec ?? 0 };
    player.play(0);
    values.state = 'playing';
  };
  values.pause = () => {
    player.pause();
    values.state = 'paused';
  };
  values.seek = (songSec: number) => {
    player.seek(songSec);
  };
  element('play', HTMLButtonElement).addEventListener('click', () => values.play());
  element('pause', HTMLButtonElement).addEventListener('click', () => values.pause());
  element('seek', HTMLButtonElement).addEventListener('click', () => {
    values.seek(Number(element('seek-input', HTMLInputElement).value));
  });
  element('resume', HTMLButtonElement).addEventListener('click', () => {
    void player.context.resume();
  });
  // An interval keeps the values current in a hidden tab, where animation frames stop.
  setInterval(() => {
    updateClock(player, probe);
    show();
  }, 50);

  const loadStart = performance.now();
  // The spike measures the clock and the load, so it has no stage mix: each channel plays in the
  // center with no reverb send. A layout for the mix would put the model code into a chunk that
  // the app shares, and the first download would grow by about 1.5 KB (design 7.2).
  const gainDb = pieceGainDb(demoFromQuery(window.location.search, SPIKE_DEMO));
  await player.load({ ...score, mix: [], gainDb }, ({ done, total }) => {
    values.presetFiles = total;
    values.state = `loading: ${done} of ${total} preset files`;
  });
  values.loadMs = performance.now() - loadStart;
  values.pcmBytes = player.pcmBytes;
  values.state = 'ready';
  for (const id of ['play', 'pause', 'seek']) {
    element(id, HTMLButtonElement).disabled = false;
  }
  show();
}

async function startSafely(): Promise<void> {
  try {
    await start();
  } catch (error) {
    fail(String(error));
  }
}

show();
// The audio code loads after the first frame, as in the app (AGENTS.md "Size budget").
requestAnimationFrame(() => {
  void startSafely();
});
