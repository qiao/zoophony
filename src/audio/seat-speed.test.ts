import { describe, expect, it } from 'vitest';

import { noteOff, noteOn, programChange, track } from '../midi/test-smf.ts';
import type { TestEvent, TestFile } from '../midi/test-smf.ts';
import { scoreOf } from '../score/test-score.ts';
import { packSynthEvents } from './synth-events.ts';
import { OfflineHarness } from './test-banks.ts';

/**
 * The most time of the block of a solo or of the end of a solo, as a multiple of the time of the
 * block of one seat change at the same place in the song. One plan for the block gives about 1.
 * One plan for each seat command gives about the count of the changed seats.
 */
const LIMIT = 2;

/** The rounds of a measurement. Each round times each kind of block one time. */
const ROUNDS = 12;

/** The ticks of one eighth note at the default 120 BPM: 0.25 s. */
const EIGHTH = 240;

/** The notes of each channel. 15 channels give about 24,000 events, as the Boulanger demo. */
const NOTES = 800;

/** One long-sound program on each channel, so that the end of a solo starts held notes again. */
const PROGRAMS = [40, 41, 42, 43, 73, 68, 71, 70, 60, 56, 57, 58, 52, 19, 89] as const;

/** A file of 15 channels and at least 15 seats. Each channel holds two notes at each time. */
function fifteenSeats(): TestFile {
  return {
    tracks: PROGRAMS.map((program, i) => {
      const channel = i < 9 ? i : i + 1;
      const notes = Array.from({ length: NOTES }, (_, n): TestEvent[] => {
        const key = 48 + ((n * 5 + i * 3) % 24);
        return [noteOn(n * EIGHTH, channel, key), noteOff(n * EIGHTH + 2 * EIGHTH, channel, key)];
      });
      return track([programChange(0, channel, program)], ...notes);
    }),
  };
}

/** The least block times of each kind of seat change, in milliseconds. */
interface SeatTimes {
  /** All seats but seat 0 become silent in one block. */
  readonly solo: number;
  /** All seats become audible again in one block. */
  readonly endOfSolo: number;
  /** Seat 1 becomes silent. */
  readonly mute: number;
  /** Seat 1 becomes audible again. */
  readonly unmute: number;
}

/**
 * Times the blocks of seat changes during play at 60 % of the song. Load on the machine only
 * adds time, so the least time of each kind over all rounds is near its time with no load.
 *
 * @returns The least block time of each kind.
 */
function seatTimes(): SeatTimes {
  const score = scoreOf(fifteenSeats());
  const seats = score.seats.length;
  expect(seats).toBeGreaterThanOrEqual(PROGRAMS.length);
  // The plan does not depend on the samples, so the engine needs no bank.
  const run = new OfflineHarness(packSynthEvents(score.synthEvents), score.durationSec, []);
  run.engine.enqueue({ type: 'seek', songSec: score.durationSec * 0.6 });
  run.engine.enqueue({ type: 'play', countInSec: 0 });
  run.renderTo(0.1);
  const all = (audible: boolean): void => {
    for (let seat = 1; seat < seats; seat++) {
      run.engine.enqueue({ type: 'seat', seatIndex: seat, audible });
    }
  };
  const timeChange = (change: () => void): number => {
    change();
    const time = run.timeBlock();
    run.renderTo(run.time + 0.03);
    return time;
  };
  const times = { solo: Infinity, endOfSolo: Infinity, mute: Infinity, unmute: Infinity };
  for (let round = 0; round < ROUNDS; round++) {
    times.solo = Math.min(
      times.solo,
      timeChange(() => {
        all(false);
      }),
    );
    times.endOfSolo = Math.min(
      times.endOfSolo,
      timeChange(() => {
        all(true);
      }),
    );
    times.mute = Math.min(
      times.mute,
      timeChange(() => {
        run.engine.enqueue({ type: 'seat', seatIndex: 1, audible: false });
      }),
    );
    times.unmute = Math.min(
      times.unmute,
      timeChange(() => {
        run.engine.enqueue({ type: 'seat', seatIndex: 1, audible: true });
      }),
    );
  }
  expect(run.engine.playing).toBe(true);
  return times;
}

describe('the time of a solo in one block (design 6.6, review of step 5, P1)', () => {
  it('changes all seats but one in at most 2 times the time of one seat change', () => {
    const times = seatTimes();
    expect(times.solo / times.mute).toBeLessThan(LIMIT);
    expect(times.endOfSolo / times.unmute).toBeLessThan(LIMIT);
  });
});
