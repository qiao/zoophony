import { describe, expect, it } from 'vitest';

import { chord, note, programChange, tempo, track } from '../midi/test-smf.ts';
import type { TestEvent } from '../midi/test-smf.ts';
import { patchedDemos } from '../../tools/patch-demos.ts';
import { choirFile } from '../models/test-choir.ts';
import { scoreOf } from './test-score.ts';
import type { Score, SectionSize } from './types.ts';

/** The ticks of one quarter note. */
const Q = 480;

/** The strings and the timpani of a test piece, 16 bars: an orchestral file. */
const ORCHESTRA: readonly TestEvent[][] = [
  track(
    [programChange(0, 0, 40)],
    ...Array.from({ length: 64 }, (_, b) => note(b * Q, 0, 67, b * Q + Q - 20)),
  ),
  track(
    [programChange(0, 1, 42)],
    ...Array.from({ length: 64 }, (_, b) => note(b * Q, 1, 48, b * Q + Q - 20)),
  ),
  track(
    [programChange(0, 2, 47)],
    ...Array.from({ length: 16 }, (_, b) => note(b * 4 * Q, 2, 43, b * 4 * Q + Q)),
  ),
];

/** A recitative of one voice in bars 0 to 3, then a quartet of four voices in bars 4 to 7. */
const SOLOISTS = track(
  [programChange(0, 8, 52)],
  ...Array.from({ length: 16 }, (_, b) => note(b * Q, 8, 50 + (b % 5), b * Q + Q - 20)),
  ...Array.from({ length: 4 }, (_, b) =>
    chord((16 + 4 * b) * Q, 8, [72, 67, 60, 48], (20 + 4 * b) * Q - 20),
  ),
);

/**
 * The choir of four voices in chords: in bars 8 to 15, or in bars 4 to 11 when it sings with the
 * soloists.
 */
function choir(from: number): TestEvent[] {
  return track(
    [programChange(0, 10, 52)],
    ...Array.from({ length: 8 }, (_, b) =>
      chord((from + b) * 4 * Q, 10, [74, 69, 62, 50], (from + b + 1) * 4 * Q - 20),
    ),
  );
}

/** Builds the score of a test piece. */
function piece(parts: readonly TestEvent[][], size: SectionSize = 'auto'): Score {
  return scoreOf({ tracks: [[tempo(0, 120)], ...parts] }, size);
}

describe('findVocalSoloists (design 3.8)', () => {
  it('finds the soloists beside the choir, with one singer for each voice (audit 2, N8)', () => {
    for (const size of ['auto', 'one-per-part', 'full'] as const) {
      const score = piece([...ORCHESTRA, SOLOISTS, choir(8)], size);
      const soloists = score.seats.findIndex((s) => s.sources[0]?.channel === 8);
      const singers = score.seats.findIndex((s) => s.sources[0]?.channel === 10);
      expect(score.vocalSoloists, size).toBe(soloists);
      expect(score.seats[soloists]?.playerCount, size).toBe(4);
      expect(score.seats[singers]?.playerCount, size).toBe(size === 'one-per-part' ? 4 : 8);
    }
  });

  it('finds no soloists that sing with the choir, or with no choir beside them', () => {
    expect(piece([...ORCHESTRA, SOLOISTS, choir(4)]).vocalSoloists).toBeNull();
    expect(piece([...ORCHESTRA, SOLOISTS]).vocalSoloists).toBeNull();
    // The four voices of the choir test file sing together on four channels.
    expect(scoreOf(choirFile()).vocalSoloists).toBeNull();
  });

  it('finds the four soloists of the Ode to Joy (audit 2, N8)', async () => {
    const demo = (await patchedDemos()).find((d) => d.file === 'beethoven-9.mid');
    for (const size of ['auto', 'one-per-part', 'full'] as const) {
      const score = scoreOf(demo?.bytes ?? new Uint8Array(), size);
      // The track "Soloists" is on channel 8, and the track "Choir" on channel 10.
      const soloists = score.seats.findIndex((s) => s.sources[0]?.channel === 8);
      expect(score.vocalSoloists, size).toBe(soloists);
      expect(score.seats[soloists]?.playerCount, size).toBe(4);
    }
    for (const other of (await patchedDemos()).filter((d) => d.file !== 'beethoven-9.mid')) {
      expect(scoreOf(other.bytes).vocalSoloists, other.file).toBeNull();
    }
  });
});
