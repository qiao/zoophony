import { join } from 'node:path';

import { chromium } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createServer } from 'vite';

/** The limits of the smoke test (design 9.3). */
export const SMOKE = {
  /**
   * The play time, in seconds. It holds the count-in of the default demo (1.017 s for the
   * Boulanger demo, design 5.4) and about 3 s of music.
   */
  playSec: 4,
  /** The time between two samples, in milliseconds. */
  sampleMs: 100,
  /** From the first sample, the song time must increase by this part of the play time, at least. */
  songShare: 0.8,
  /** The smallest song time of the last sample: the music played after the downbeat. */
  musicSec: 2,
  /** The smallest turn of the right arm of the first violin after the downbeat, in radians. */
  armTurn: 0.05,
} as const;

/** One sample of the page during play. */
export interface SmokeSample {
  /** The time since the click on play, in seconds. */
  readonly elapsedSec: number;
  /** The song time of the page, in seconds. */
  readonly songTime: number;
  /** The rotations (x, y, z, w) of the upper arm and of the forearm of the first violin. */
  readonly arm: readonly number[];
}

/** The values that the smoke test collects from one run. */
export interface SmokeRun {
  /** The song time before the click on play. */
  readonly songTimeBefore: number;
  /** The samples during play, in order. */
  readonly samples: readonly SmokeSample[];
  /** True if a screenshot of the page changes when the canvas is hidden. */
  readonly canvasDrawn: boolean;
  /** The console errors and the uncaught errors of the page. */
  readonly errors: readonly string[];
}

/**
 * Gives the angle between two unit quaternions.
 *
 * @param a The first quaternion (x, y, z, w), from index `offset`.
 * @param b The second quaternion, from index `offset`.
 * @param offset The index of the x value in both lists.
 * @returns The angle of the turn from `a` to `b`, in radians.
 */
function turnBetween(a: readonly number[], b: readonly number[], offset: number): number {
  let dot = 0;
  for (let k = 0; k < 4; k++) {
    dot += (a[offset + k] ?? 0) * (b[offset + k] ?? 0);
  }
  return 2 * Math.acos(Math.min(1, Math.abs(dot)));
}

/**
 * Gives the largest turn of the bow arm after the downbeat, from the first sample at a song time
 * of 0 or more. The instruments lift in the count-in (design 5.2), so the lift is over by then.
 *
 * @param samples The samples of a run.
 * @returns The largest turn of the upper arm or of the forearm, in radians.
 */
export function armTurnAfterDownbeat(samples: readonly SmokeSample[]): number {
  const played = samples.filter((s) => s.songTime >= 0 && s.arm.length === 8);
  const first = played[0];
  let turn = 0;
  for (const sample of played) {
    if (first) {
      turn = Math.max(
        turn,
        turnBetween(first.arm, sample.arm, 0),
        turnBetween(first.arm, sample.arm, 4),
      );
    }
  }
  return turn;
}

/**
 * Checks a run of the smoke test (design 9.3): the song time runs below 0 in the count-in, then
 * increases past the downbeat, the bow arm of a violin moves after the downbeat, the canvas shows
 * the scene, and the console has no errors.
 *
 * @param run The values of the run.
 * @returns One text for each failed check. An empty list is a pass.
 */
export function smokeFailures(run: SmokeRun): string[] {
  const failures: string[] = [];
  const first = run.samples[0];
  const last = run.samples.at(-1);
  if (!run.samples.some((s) => s.songTime < 0)) {
    failures.push('The song time did not read below 0 in the count-in.');
  }
  const advance = (last?.songTime ?? 0) - (first?.songTime ?? 0);
  const span = (last?.elapsedSec ?? 0) - (first?.elapsedSec ?? 0);
  if (!(advance >= SMOKE.songShare * span)) {
    failures.push(`The song time increased by ${advance.toFixed(3)} s in ${span.toFixed(3)} s.`);
  }
  if (!((last?.songTime ?? 0) >= SMOKE.musicSec)) {
    failures.push(`The song time reached ${(last?.songTime ?? 0).toFixed(3)} s only.`);
  }
  const turn = armTurnAfterDownbeat(run.samples);
  if (!(turn >= SMOKE.armTurn)) {
    failures.push(`The bow arm of the first violin turned by ${turn.toFixed(3)} rad only.`);
  }
  if (!run.canvasDrawn) {
    failures.push('The canvas is empty.');
  }
  for (const error of run.errors) {
    failures.push(`Console error: ${error}`);
  }
  return failures;
}

/**
 * Reads one sample of the page through the hook of the dev server (`src/app/dev-hook.ts`).
 *
 * @param page The page.
 * @param violin The index of the first violin in the poses.
 * @returns The sample.
 */
async function readSample(page: Page, violin: number, clickMs: number): Promise<SmokeSample> {
  const elapsedSec = (Date.now() - clickMs) / 1000;
  return page.evaluate(
    ({ player, elapsed }) => {
      const hook = window.zoophony;
      return {
        elapsedSec: elapsed,
        songTime: hook?.songTime ?? Number.NaN,
        arm: [
          ...(hook?.rotation(player, 'upperArmR') ?? []),
          ...(hook?.rotation(player, 'forearmR') ?? []),
        ],
      };
    },
    { player: violin, elapsed: elapsedSec },
  );
}

/**
 * Plays the default demo in the page and collects the values of the checks.
 *
 * @param page A new page on the dev server.
 * @param base The URL of the dev server.
 * @returns The values of the run.
 */
async function runSmoke(page: Page, base: string): Promise<SmokeRun> {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  await page.goto(base);
  // The button waits until the Player has loaded the samples of the default demo.
  await page.waitForSelector('#play:enabled', { timeout: 60_000 });
  const violin = await page.evaluate(() => window.zoophony?.instruments.indexOf('violin') ?? -1);
  const songTimeBefore = (await readSample(page, violin, Date.now())).songTime;
  await page.click('#play');
  const clickMs = Date.now();
  const samples: SmokeSample[] = [];
  while (Date.now() < clickMs + SMOKE.playSec * 1000) {
    await page.waitForTimeout(SMOKE.sampleMs);
    samples.push(await readSample(page, violin, clickMs));
  }
  const shown = await page.screenshot({ type: 'png' });
  await page.addStyleTag({ content: '#stage { visibility: hidden; }' });
  const hidden = await page.screenshot({ type: 'png' });
  return { songTimeBefore, samples, canvasDrawn: !shown.equals(hidden), errors };
}

async function main(): Promise<void> {
  const server = await createServer({
    root: join(import.meta.dirname, '..'),
    logLevel: 'error',
    server: { port: 4180, strictPort: false },
  });
  await server.listen();
  const base = server.resolvedUrls?.local[0] ?? 'http://localhost:4180/';
  // The autoplay policy lets the click of a script start the audio. ANGLE on Metal gives the GPU
  // of the Mac to headless Chromium.
  const browser = await chromium.launch({
    args: [
      '--autoplay-policy=no-user-gesture-required',
      '--use-angle=metal',
      '--enable-gpu',
      '--ignore-gpu-blocklist',
    ],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const run = await runSmoke(page, base);
    const last = run.samples.at(-1);
    const lowest = Math.min(...run.samples.map((s) => s.songTime));
    console.log(
      `Song time ${run.songTimeBefore.toFixed(3)} s before play, ${lowest.toFixed(3)} s in the count-in, ${last?.songTime.toFixed(3)} s after ${SMOKE.playSec} s.`,
    );
    console.log(
      `Turn of the bow arm after the downbeat: ${armTurnAfterDownbeat(run.samples).toFixed(3)} rad.`,
    );
    const failures = smokeFailures(run);
    for (const failure of failures) {
      console.error(failure);
    }
    console.log(failures.length === 0 ? 'Smoke test: pass' : 'Smoke test: fail');
    process.exitCode = failures.length === 0 ? 0 : 1;
  } finally {
    await browser.close();
    await server.close();
  }
}

if (import.meta.main) {
  await main();
}
