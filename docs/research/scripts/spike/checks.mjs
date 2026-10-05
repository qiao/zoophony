// The spike checks of design 9.5 step 1 and the targets of 9.7, for any browser driver.
//
// A driver gives these functions:
//   open(url)       Opens the page in a fresh profile, with no cache.
//   evaluate(expr)  Returns the value of a JavaScript expression in the page.
//   click(selector) Clicks an element, as a user gesture.
//   hide(), show()  Hides the page (another tab in front, or a minimized window), and shows it.
//   close()         Closes the page and its profile.
//   extra           Optional expression with browser-specific values, such as playback stats.

/** The expression that reads the values of the spike page (src/spike/main.ts). */
export function valuesExpression(extra) {
  return `(() => {
    const values = {};
    for (const [key, value] of Object.entries(window.spike ?? {})) {
      if (typeof value !== 'function') values[key] = value;
    }
    values.visibility = document.visibilityState;
    values.performanceNow = performance.now();
    values.extra = ${extra ?? 'null'};
    return values;
  })()`;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function read(driver) {
  return driver.evaluate(valuesExpression(driver.extra));
}

async function waitFor(driver, test, timeoutMs, what) {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const values = await read(driver);
    if (String(values.state).startsWith('error')) {
      throw new Error(`${what}: ${values.state}`);
    }
    if (test(values)) {
      return values;
    }
    if (Date.now() > end) {
      throw new Error(`${what}: timeout. Last values: ${JSON.stringify(values)}`);
    }
    await sleep(50);
  }
}

/**
 * Loads the page, records the load time and the context state at "ready", clicks Play, and
 * records the first sound time and the render statistics of the first 2 s.
 */
export async function loadAndFirstSound(driver, url) {
  await driver.open(url);
  try {
    const ready = await waitFor(driver, (v) => v.state === 'ready', 60_000, 'load');
    await sleep(500);
    await driver.click('#play');
    const first = await waitFor(driver, (v) => v.firstSoundMs !== null, 10_000, 'first sound');
    await sleep(2000);
    const after = await read(driver);
    return {
      loadMs: ready.loadMs,
      presetFiles: ready.presetFiles,
      pcmBytes: ready.pcmBytes,
      contextStateAtReady: ready.contextState,
      contextStateAfterClick: after.contextState,
      firstSoundMs: first.firstSoundMs,
      firstSoundLatencyMs: first.firstSoundLatencyMs,
      outputLatency: after.outputLatency,
      baseLatency: after.baseLatency,
      sampleRate: after.sampleRate,
      firstBlocks: after.blocks,
      firstSlowBlocks: after.slowBlocks,
      firstMaxRenderMs: after.maxRenderMs,
      renderTimer: after.renderTimer,
      errors: after.errors,
      extra: after.extra,
    };
  } finally {
    await driver.close();
  }
}

/**
 * Plays demo 1 to the end. Reads the values each second. Hides the page from 60 s to 80 s
 * after the click.
 */
export async function fullPlay(driver, url, { hideAtSec = 60, hideForSec = 20 } = {}) {
  await driver.open(url);
  const samples = [];
  const events = [];
  try {
    const ready = await waitFor(driver, (v) => v.state === 'ready', 60_000, 'load');
    events.push({ event: 'ready', contextState: ready.contextState });
    await driver.click('#play');
    const clickAt = Date.now();
    let hidden = false;
    let shown = false;
    for (;;) {
      const values = await read(driver);
      values.wallSec = (Date.now() - clickAt) / 1000;
      samples.push(values);
      if (
        values.songTime >= values.durationSec - 0.01 ||
        String(values.state).startsWith('error')
      ) {
        break;
      }
      if (values.wallSec > values.durationSec + 60) {
        events.push({ event: 'timeout' });
        break;
      }
      if (!hidden && values.wallSec >= hideAtSec) {
        hidden = true;
        events.push({ event: 'hide', sample: samples.length - 1 });
        await driver.hide();
      } else if (hidden && !shown && values.wallSec >= hideAtSec + hideForSec) {
        shown = true;
        await driver.show();
        events.push({ event: 'show', sample: samples.length });
      }
      await sleep(1000);
    }
    await sleep(2000);
    samples.push({ ...(await read(driver)), wallSec: (Date.now() - clickAt) / 1000 });
    return { samples, events };
  } finally {
    await driver.close();
  }
}

/** The fields of a sample that the result files keep. */
const SAMPLE_FIELDS = [
  'wallSec',
  'performanceNow',
  'state',
  'contextState',
  'visibility',
  'songTime',
  'clockTimestamp',
  'clockLatency',
  'clockDiffMs',
  'outputLatency',
  'blocks',
  'slowBlocks',
  'maxRenderMs',
  'errors',
  'extra',
];

/** Keeps only the fields of {@link SAMPLE_FIELDS}, so that the result files stay small. */
export function compactSample(sample) {
  return Object.fromEntries(SAMPLE_FIELDS.map((key) => [key, sample[key]]));
}

function stats(list) {
  const sorted = list.toSorted((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((sum, x) => sum + x, 0) / n;
  const sd = Math.sqrt(sorted.reduce((sum, x) => sum + (x - mean) ** 2, 0) / n);
  return {
    n,
    mean,
    sd,
    min: sorted[0],
    median: sorted[Math.floor((n - 1) / 2)],
    max: sorted[n - 1],
  };
}

/** Calculates the clock, end, and hidden-tab results of one full play. */
export function summarizeFullPlay({ samples, events }) {
  const playing = samples.filter(
    (s) => s.contextState === 'running' && s.songTime > 0.5 && s.songTime < s.durationSec - 0.5,
  );
  const last = samples.at(-1);
  const hide = events.find((e) => e.event === 'hide');
  const show = events.find((e) => e.event === 'show');
  let hiddenCheck = null;
  if (hide && show) {
    const before = samples[hide.sample];
    const after = samples[show.sample];
    const wallAdvance = (after.performanceNow - before.performanceNow) / 1000;
    hiddenCheck = {
      hiddenWallSec: wallAdvance,
      songAdvanceSec: after.songTime - before.songTime,
      advanceErrorMs: (after.songTime - before.songTime - wallAdvance) * 1000,
      visibilityWhileHidden: [
        ...new Set(samples.slice(hide.sample + 1, show.sample).map((s) => s.visibility)),
      ],
      slowBlocksWhileHidden: after.slowBlocks - before.slowBlocks,
    };
  }
  // The song time must follow the wall time with a slope of 1 (rate 1).
  const xs = playing.map((s) => s.performanceNow / 1000);
  const ys = playing.map((s) => s.songTime);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const slope =
    xs.reduce((sum, x, i) => sum + (x - mx) * (ys[i] - my), 0) /
    xs.reduce((sum, x) => sum + (x - mx) ** 2, 0);
  const residualMs = xs.map((x, i) => (ys[i] - (my + slope * (x - mx))) * 1000);
  return {
    contextStateAtReady: events.find((e) => e.event === 'ready')?.contextState,
    reachedEnd: last.songTime >= last.durationSec - 0.01,
    durationSec: last.durationSec,
    finalSongTime: last.songTime,
    blocks: last.blocks,
    slowBlocks: last.slowBlocks,
    maxRenderMs: last.maxRenderMs,
    renderTimer: last.renderTimer,
    errors: last.errors,
    outputLatency: stats(playing.map((s) => s.outputLatency)),
    baseLatency: last.baseLatency,
    clockDiffMs: stats(playing.map((s) => s.clockDiffMs)),
    // Player.now() against each method, at the same moment of the page.
    nowMinusTimestampMs: stats(playing.map((s) => (s.songTime - s.clockTimestamp) * 1000)),
    nowMinusLatencyMs: stats(playing.map((s) => (s.songTime - s.clockLatency) * 1000)),
    songTimeSlope: slope,
    songTimeResidualMs: stats(residualMs),
    slowBlockSongTimes: playing
      .filter((s, i) => i > 0 && s.slowBlocks > playing[i - 1].slowBlocks)
      .map((s) => Math.round(s.songTime)),
    hiddenCheck,
    extraAtEnd: last.extra,
  };
}

/** Calculates the median and the max of the runs of {@link loadAndFirstSound}. */
export function summarizeRuns(runs) {
  return {
    runs: runs.length,
    loadMs: stats(runs.map((r) => r.loadMs)),
    firstSoundMs: stats(runs.map((r) => r.firstSoundMs)),
    firstSoundLatencyMs: stats(runs.map((r) => r.firstSoundLatencyMs)),
    contextStatesAtReady: [...new Set(runs.map((r) => r.contextStateAtReady))],
    contextStatesAfterClick: [...new Set(runs.map((r) => r.contextStateAfterClick))],
    firstSlowBlocks: runs.map((r) => r.firstSlowBlocks),
    firstMaxRenderMs: runs.map((r) => r.firstMaxRenderMs),
    errors: runs.map((r) => r.errors),
  };
}
