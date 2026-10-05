import { beforeAll, describe, expect, it } from 'vitest';

import type { SynthEvent } from '../score/types.ts';
import { BLOCK_FRAMES, SynthEngine } from './engine.ts';
import type { EngineBank } from './engine.ts';
import { packSynthEvents } from './synth-events.ts';
import { testBanks } from './test-banks.ts';

const SAMPLE_RATE = 48_000;

/** The song times of the test notes. The step of 13.37 ms puts each note at a new block offset. */
const NOTE_TIMES = Array.from({ length: 24 }, (_, i) => 0.05 + i * 0.013_37);

/** The setup of one render: the playback rate, and the song time of a seek before play. */
interface RenderCase {
  readonly rate: number;
  readonly seekSec: number;
}

/**
 * Renders one note alone on a new engine, and finds the first block with sound. The engine
 * starts in silence, so the output before the note is exactly 0. The first sample of a voice can
 * also be exactly 0, so the function gives the start of the block and ignores the frame in it.
 *
 * @returns The start of the first block with sound minus the frame at which the note is due, in
 *   context frames.
 */
function onsetError(banks: readonly EngineBank[], noteSec: number, setup: RenderCase): number {
  const events: SynthEvent[] = [
    { timeSec: 0, channel: 0, kind: 0xc0, data1: 0, data2: 0, seatIndex: -1 },
    { timeSec: noteSec, channel: 0, kind: 0x90, data1: 60, data2: 100, seatIndex: 0 },
    { timeSec: noteSec + 0.5, channel: 0, kind: 0x80, data1: 60, data2: 0, seatIndex: 0 },
  ];
  const engine = new SynthEngine(SAMPLE_RATE, () => undefined);
  engine.loadScore(packSynthEvents(events), noteSec + 0.5);
  engine.addBanks(banks.map((bank) => ({ id: bank.id, data: bank.data.slice(0) })));
  engine.enqueue({ type: 'rate', rate: setup.rate });
  engine.enqueue({ type: 'seek', songSec: setup.seekSec });
  engine.enqueue({ type: 'play' });
  // The commands apply at frame 0, so song time s plays at context frame (s - seek) / rate.
  const due = ((noteSec - setup.seekSec) / setup.rate) * SAMPLE_RATE;
  const left = new Float32Array(BLOCK_FRAMES);
  const right = new Float32Array(BLOCK_FRAMES);
  for (let frame = 0; frame < due + SAMPLE_RATE * 0.1; frame += BLOCK_FRAMES) {
    engine.render(frame / SAMPLE_RATE, left, right);
    if (left.some((value, i) => value !== 0 || right[i] !== 0)) {
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
    ['at rate 1', { rate: 1, seekSec: 0 }],
    ['at rate 1.5', { rate: 1.5, seekSec: 0 }],
    ['at rate 0.5', { rate: 0.5, seekSec: 0 }],
    ['after a seek', { rate: 1, seekSec: 0.03 }],
  ];

  for (const [name, setup] of cases) {
    it(`renders each note on up to one block early and never late ${name}`, () => {
      const errors = NOTE_TIMES.filter((noteSec) => noteSec > setup.seekSec).map((noteSec) =>
        onsetError(banks, noteSec, setup),
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
