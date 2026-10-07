import { chord, note, programChange, tempo, track } from '../midi/test-smf.ts';
import type { TestEvent, TestFile } from '../midi/test-smf.ts';

/** The ticks of one quarter note. */
const Q = 480;

/** The strings and the timpani of a test piece, 16 bars: an orchestral file. */
export const ORCHESTRA: readonly TestEvent[][] = [
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

/**
 * The vocal soloists on channel 8: a recitative of one voice in bars 0 to 3, then a quartet of
 * four voices in bars 4 to 7.
 */
export const SOLOISTS: TestEvent[] = track(
  [programChange(0, 8, 52)],
  ...Array.from({ length: 16 }, (_, b) => note(b * Q, 8, 50 + (b % 5), b * Q + Q - 20)),
  ...Array.from({ length: 4 }, (_, b) =>
    chord((16 + 4 * b) * Q, 8, [72, 67, 60, 48], (20 + 4 * b) * Q - 20),
  ),
);

/**
 * Makes the choir on channel 10: four voices in chords for 8 bars.
 *
 * @param from The first bar: 8 after the soloists, or 4 to sing with them.
 * @returns The track of the choir.
 */
export function choir(from: number): TestEvent[] {
  return track(
    [programChange(0, 10, 52)],
    ...Array.from({ length: 8 }, (_, b) =>
      chord((from + b) * 4 * Q, 10, [74, 69, 62, 50], (from + b + 1) * 4 * Q - 20),
    ),
  );
}

/**
 * Makes a test file with four vocal soloists beside a choir (design 3.8): the orchestra, the
 * soloists in bars 0 to 7, and the choir in bars 8 to 15. With it, the tests of the soloists do
 * not depend on a demo file.
 *
 * @returns The file at 120 BPM.
 */
export function vocalSoloistsFile(): TestFile {
  return { tracks: [[tempo(0, 120)], ...ORCHESTRA, SOLOISTS, choir(8)] };
}
