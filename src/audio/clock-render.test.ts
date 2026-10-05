import { beforeAll, describe, expect, it } from 'vitest';

import { noteOff, noteOn, programChange } from '../midi/test-smf.ts';
import { scoreOf } from '../score/test-score.ts';
import { BLOCK_FRAMES } from './engine.ts';
import type { EngineBank } from './engine.ts';
import { packSynthEvents } from './synth-events.ts';
import { OfflineHarness, TEST_SAMPLE_RATE, testBanks } from './test-banks.ts';

/** The ticks of a quarter note in the test files. At the default 120 BPM, one tick is 25 µs. */
const TICKS_PER_QUARTER = 20_000;

/** The length of one tick in seconds. */
const TICK_SEC = 0.5 / TICKS_PER_QUARTER;

/**
 * The ticks of the test notes: the downbeat, then notes from 50 ms. The step of 534 ticks
 * (13.35 ms) puts each note at a new block offset.
 */
const NOTE_TICKS = [0, ...Array.from({ length: 24 }, (...[, i]) => 2_000 + i * 534)];

/**
 * The setup of one render: the playback rate, the song time of a seek before play, and the
 * count-in of the play (design 6.5).
 */
interface RenderCase {
  readonly rate: number;
  readonly seekSec: number;
  readonly countInSec: number;
}

/**
 * Renders one note alone on a new engine, and finds the first block with sound. The engine
 * starts in silence, so the output before the note is exactly 0. The first sample of a voice can
 * also be exactly 0, so the function gives the start of the block and ignores the frame in it.
 *
 * @returns The start of the first block with sound minus the frame at which the note is due, in
 *   context frames.
 */
function onsetError(banks: readonly EngineBank[], noteTick: number, setup: RenderCase): number {
  const score = scoreOf({
    ticksPerQuarter: TICKS_PER_QUARTER,
    tracks: [
      [
        programChange(0, 0, 0),
        noteOn(noteTick, 0, 60),
        // 0.5 s after the note on.
        noteOff(noteTick + TICKS_PER_QUARTER, 0, 60),
      ],
    ],
  });
  const noteSec = score.synthEvents.find((event) => event.kind === 0x90)?.timeSec ?? Infinity;
  const run = new OfflineHarness(packSynthEvents(score.synthEvents), score.durationSec, banks);
  run.engine.enqueue({ type: 'rate', rate: setup.rate });
  run.engine.enqueue({ type: 'seek', songSec: setup.seekSec });
  run.engine.enqueue({ type: 'play', countInSec: setup.countInSec });
  // The commands apply at frame 0, so song time s plays at context frame
  // (s - seek + count-in) / rate.
  const due = ((noteSec - setup.seekSec + setup.countInSec) / setup.rate) * TEST_SAMPLE_RATE;
  while (run.frame < due + TEST_SAMPLE_RATE * 0.1) {
    const frame = run.frame;
    run.timeBlock();
    if (run.peak > 0) {
      return frame - due;
    }
  }
  return Infinity;
}

describe('block timing of the offline render (design 9.7, "Clock")', () => {
  let banks: EngineBank[];

  beforeAll(async () => {
    banks = await testBanks([{ bank: 0, program: 0, drumKit: false }]);
  });

  const cases: readonly (readonly [string, RenderCase])[] = [
    ['at rate 1', { rate: 1, seekSec: 0, countInSec: 0 }],
    ['at rate 1.5', { rate: 1.5, seekSec: 0, countInSec: 0 }],
    ['at rate 0.5', { rate: 0.5, seekSec: 0, countInSec: 0 }],
    ['after a seek', { rate: 1, seekSec: 0.03, countInSec: 0 }],
    ['after a count-in', { rate: 1, seekSec: 0, countInSec: 0.9 }],
    // The count-in 0.937 s puts no note exactly on a block boundary. On a boundary, the sum of
    // the block steps can make the note due one block before it.
    ['after a count-in at rate 1.5', { rate: 1.5, seekSec: 0, countInSec: 0.937 }],
    ['after a seek and a count-in', { rate: 1, seekSec: 0.03, countInSec: 0.4 }],
  ];

  for (const [name, setup] of cases) {
    it(`renders each note on up to one block early and never late ${name}`, () => {
      const errors = NOTE_TICKS.filter((tick) => tick * TICK_SEC >= setup.seekSec).map((tick) =>
        onsetError(banks, tick, setup),
      );
      expect(errors.length).toBeGreaterThan(10);
      // Design 6.4: a note sounds from the start of the block that holds its time.
      for (const error of errors) {
        expect(error).toBeLessThanOrEqual(0);
        expect(error).toBeGreaterThan(-BLOCK_FRAMES);
      }
    });
  }
});
