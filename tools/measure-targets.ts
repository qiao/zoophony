import { setTimeout } from 'node:timers/promises';
import { PerformanceObserver } from 'node:perf_hooks';

import { chaseEvents, restartNotes } from '../src/audio/block-scheduler.ts';
import { BLOCK_FRAMES } from '../src/audio/engine.ts';
import type { EngineBank } from '../src/audio/engine.ts';
import { packSynthEvents, synthChannelCount } from '../src/audio/synth-events.ts';
import { OfflineHarness, TEST_SAMPLE_RATE, testBanks } from '../src/audio/test-banks.ts';
import { buildScore } from '../src/score/score.ts';
import type { Score } from '../src/score/types.ts';
import { patchedDemos } from './patch-demos.ts';

/** The audio render target of design 9.7: half of the block length. */
const RENDER_LIMIT_MS = 1.3;

/** The length of one block of 128 frames at 48 kHz, in milliseconds. */
export const BLOCK_BUDGET_MS = (BLOCK_FRAMES / TEST_SAMPLE_RATE) * 1000;

/** The memory target of design 9.7: decoded samples of one demo, in bytes. */
export const MEMORY_LIMIT_BYTES = 100_000_000;

/** The statistics of a list of times, in milliseconds. */
export interface TimeStats {
  readonly count: number;
  readonly median: number;
  /** The 99th percentile: the nearest rank of the sorted times. */
  readonly p99: number;
  /** The 99.9th percentile. */
  readonly p999: number;
  readonly max: number;
  /** The index of the first time with the max value. */
  readonly maxIndex: number;
  /** The number of times above the limit. */
  readonly over: number;
}

/**
 * Calculates the statistics of a list of times. A percentile is the value at the nearest rank
 * (`ceil(q * n)`) of the sorted times.
 *
 * @param times The times in milliseconds. At least one.
 * @param limitMs The limit that {@link TimeStats.over} counts against.
 * @returns The statistics.
 */
export function timeStats(times: readonly number[], limitMs: number): TimeStats {
  const sorted = times.toSorted((a, b) => a - b);
  const rank = (q: number): number => sorted[Math.max(0, Math.ceil(q * sorted.length) - 1)] ?? 0;
  const max = sorted.at(-1) ?? 0;
  return {
    count: times.length,
    median: rank(0.5),
    p99: rank(0.99),
    p999: rank(0.999),
    max,
    maxIndex: times.indexOf(max),
    over: times.filter((time) => time > limitMs).length,
  };
}

/** Renders a full score from 0 at rate 1, and gives the time of each block. */
function renderTimes(score: Score, banks: readonly EngineBank[]): RenderTimes {
  const table = packSynthEvents(score.synthEvents);
  const start = performance.now();
  const run = new OfflineHarness(table, score.durationSec, banks);
  const loadMs = performance.now() - start;
  run.engine.enqueue({ type: 'play', countInSec: 0 });
  const times: number[] = [];
  while (times.length === 0 || run.engine.playing) {
    times.push(run.timeBlock());
  }
  return { times, starts: run.starts, loadMs };
}

/** The render time and the start of each block, in milliseconds. */
interface RenderTimes {
  readonly times: readonly number[];
  readonly starts: readonly number[];
  /** The time of `loadScore()` and `addBanks()`, as in the processor at a load. */
  readonly loadMs: number;
}

/** The blocks of the first second of a render at 48 kHz. */
const FIRST_SECOND_BLOCKS = Math.ceil(TEST_SAMPLE_RATE / BLOCK_FRAMES);

/** The start and the length of each garbage collection of V8, in milliseconds. */
const collections: { readonly start: number; readonly duration: number }[] = [];

/**
 * Tells if a block overlaps a garbage collection of V8. A collection stops the render, so its
 * time is not the time of the synth.
 */
function overlapsCollection(start: number, duration: number): boolean {
  return collections.some(
    (item) => item.start < start + duration && item.start + item.duration > start,
  );
}

/** The times of a late seek, in milliseconds. */
interface SeekTimes {
  /** Blocks that apply a seek near the end while the song plays. */
  readonly seekBlocks: readonly number[];
  /** Blocks that apply a play after a pause near the end. */
  readonly resumeBlocks: readonly number[];
  /** `chaseEvents()` and `restartNotes()` alone, at the last event. */
  readonly scheduler: readonly number[];
}

/**
 * Times the blocks of a seek near the end of a score. The seek walks all
 * events before the cursor on the audio thread.
 */
function lateSeekTimes(score: Score, banks: readonly EngineBank[], repeats: number): SeekTimes {
  const table = packSynthEvents(score.synthEvents);
  const run = new OfflineHarness(table, score.durationSec, banks);
  const end = score.durationSec;
  run.engine.enqueue({ type: 'seek', songSec: end - 30 });
  run.engine.enqueue({ type: 'play', countInSec: 0 });
  run.renderTo(run.time + 1);
  const seekBlocks: number[] = [];
  const resumeBlocks: number[] = [];
  for (let i = 0; i < repeats; i++) {
    run.engine.enqueue({ type: 'seek', songSec: end - 10 - (i % 10) });
    seekBlocks.push(run.timeBlock());
    run.renderTo(run.time + 0.2);
    run.engine.enqueue({ type: 'pause' });
    run.timeBlock();
    run.engine.enqueue({ type: 'play', countInSec: 0 });
    resumeBlocks.push(run.timeBlock());
    run.renderTo(run.time + 0.2);
  }
  const cursor = table.timeSec.length - 1;
  const channels = synthChannelCount(table);
  const scheduler: number[] = [];
  for (let i = 0; i < repeats; i++) {
    const start = performance.now();
    chaseEvents(table, cursor);
    restartNotes(table, cursor, channels, new Uint8Array(0));
    scheduler.push(performance.now() - start);
  }
  return { seekBlocks, resumeBlocks, scheduler };
}

/** The block times of a solo, in milliseconds. */
interface SoloTimes {
  /** Blocks in which all seats but seat 0 become silent. */
  readonly solo: readonly number[];
  /** Blocks in which all seats become audible again. */
  readonly endOfSolo: readonly number[];
}

/**
 * Times the blocks of a solo of one seat and of its end, at 60 % of a score while the song plays.
 * A solo changes all other seats in one block.
 *
 * @param score The score.
 * @param banks The banks of the score.
 * @param repeats The number of solos.
 * @returns The block times.
 */
function soloTimes(score: Score, banks: readonly EngineBank[], repeats: number): SoloTimes {
  const run = new OfflineHarness(packSynthEvents(score.synthEvents), score.durationSec, banks);
  run.engine.enqueue({ type: 'seek', songSec: score.durationSec * 0.6 });
  run.engine.enqueue({ type: 'play', countInSec: 0 });
  run.renderTo(run.time + 1);
  const all = (audible: boolean): void => {
    for (let seat = 1; seat < score.seats.length; seat++) {
      run.engine.enqueue({ type: 'seat', seatIndex: seat, audible });
    }
  };
  const solo: number[] = [];
  const endOfSolo: number[] = [];
  for (let i = 0; i < repeats; i++) {
    all(false);
    solo.push(run.timeBlock());
    run.renderTo(run.time + 0.2);
    all(true);
    endOfSolo.push(run.timeBlock());
    run.renderTo(run.time + 0.2);
  }
  return { solo, endOfSolo };
}

/**
 * Times `buildScore()` with the section size "auto".
 *
 * @param bytes The bytes of a Standard MIDI File.
 * @returns The median of five builds, in milliseconds.
 */
function buildTime(bytes: Uint8Array): number {
  const times: number[] = [];
  for (let i = 0; i < 5; i++) {
    const start = performance.now();
    buildScore(bytes, 'auto');
    times.push(performance.now() - start);
  }
  return timeStats(times, Infinity).median;
}

function ms(value: number): string {
  return value.toFixed(3);
}

function megabytes(bytes: number): string {
  return (bytes / 1_000_000).toFixed(1);
}

async function main(): Promise<void> {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      collections.push({ start: entry.startTime, duration: entry.duration });
    }
  });
  observer.observe({ entryTypes: ['gc'] });
  const only = process.argv.slice(2);
  const demos = (await patchedDemos()).filter(
    (demo) => only.length === 0 || only.some((name) => demo.file.startsWith(name)),
  );
  let pass = true;
  const slowBlocks: string[] = [];
  const solos: string[] = [];
  let largest: { score: Score; banks: EngineBank[]; file: string } | undefined;
  console.log(`Render limit ${RENDER_LIMIT_MS} ms, block length ${ms(BLOCK_BUDGET_MS)} ms.`);
  console.log(
    '| Demo | Events | Build (ms) | Load (ms) | Blocks | Median (ms) | p99 (ms) | p99.9 (ms) ' +
      '| Max (ms) | Max at (s) | Max of the first 1 s (ms) ' +
      `| Above ${RENDER_LIMIT_MS} ms | Above ${ms(BLOCK_BUDGET_MS)} ms | PCM (MB) |`,
  );
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const demo of demos) {
    const result = buildScore(demo.bytes, 'auto');
    if (!result.ok) {
      throw new Error(`${demo.file} was refused: ${result.error}.`);
    }
    const score = result.score;
    const banks = await testBanks(score.presets);
    const pcmBytes = banks.reduce((sum, bank) => sum + bank.data.byteLength, 0);
    const { times, starts, loadMs } = renderTimes(score, banks);
    // The observer gets the collections after the synchronous render.
    await setTimeout(50);
    const stats = timeStats(times, RENDER_LIMIT_MS);
    const slow = timeStats(times, BLOCK_BUDGET_MS);
    const maxAt = (stats.maxIndex * BLOCK_FRAMES) / TEST_SAMPLE_RATE;
    const firstSecond = Math.max(...times.slice(0, FIRST_SECOND_BLOCKS));
    console.log(
      `| ${demo.file} | ${score.synthEvents.length} | ${ms(buildTime(demo.bytes))} | ` +
        `${ms(loadMs)} | ${stats.count} | ${ms(stats.median)} | ${ms(stats.p99)} | ` +
        `${ms(stats.p999)} | ${ms(stats.max)} | ${maxAt.toFixed(2)} | ${ms(firstSecond)} | ` +
        `${stats.over} | ${slow.over} | ${megabytes(pcmBytes)} |`,
    );
    slowBlocks.push(
      `${demo.file}: ${times
        .flatMap((time, i) =>
          time > RENDER_LIMIT_MS
            ? [
                `${((i * BLOCK_FRAMES) / TEST_SAMPLE_RATE).toFixed(2)} s ${ms(time)} ms` +
                  (overlapsCollection(starts[i] ?? 0, time) ? ' (GC)' : ''),
              ]
            : [],
        )
        .join(', ')}`,
    );
    const solo = soloTimes(score, banks, 6);
    solos.push(
      `  ${demo.file} (${score.seats.length} seats): solo ` +
        `${ms(timeStats(solo.solo, Infinity).median)} ms, end of the solo ` +
        `${ms(timeStats(solo.endOfSolo, Infinity).median)} ms`,
    );
    pass &&= stats.max <= RENDER_LIMIT_MS && pcmBytes <= MEMORY_LIMIT_BYTES;
    if (!largest || score.synthEvents.length > largest.score.synthEvents.length) {
      largest = { score, banks, file: demo.file };
    }
  }
  observer.disconnect();
  console.log(
    `Blocks above ${RENDER_LIMIT_MS} ms (song time, render time, "GC" if a V8 garbage ` +
      'collection overlaps the block):',
  );
  for (const line of slowBlocks) {
    console.log(`  ${line}`);
  }
  console.log('Solo of one seat at 60 % of each demo, median of 6 blocks:');
  for (const line of solos) {
    console.log(line);
  }
  if (largest) {
    const seek = lateSeekTimes(largest.score, largest.banks, 40);
    const line = (label: string, times: readonly number[]): void => {
      const stats = timeStats(times, BLOCK_BUDGET_MS);
      console.log(
        `${label}: median ${ms(stats.median)} ms, max ${ms(stats.max)} ms, ` +
          `${stats.over} of ${stats.count} above ${ms(BLOCK_BUDGET_MS)} ms`,
      );
    };
    console.log(`Late seek in ${largest.file} (${largest.score.synthEvents.length} events):`);
    line('  block of a seek while playing', seek.seekBlocks);
    line('  block of a play after a pause', seek.resumeBlocks);
    line('  chaseEvents() and restartNotes() at the last event', seek.scheduler);
  }
  console.log(pass ? 'All render and memory targets pass.' : 'A render or memory target fails.');
  process.exitCode = pass ? 0 : 1;
}

if (import.meta.main) {
  await main();
}
