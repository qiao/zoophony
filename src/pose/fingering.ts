import type { InstrumentOf } from './family.ts';

/** The bowed strings of design 4.6. */
type Bowed = InstrumentOf<'bowed'>;

/** The open strings of each bowed string, low to high, as MIDI keys (design 4.6). */
export const TUNINGS = {
  violin: [55, 62, 69, 76],
  viola: [48, 55, 62, 69],
  cello: [36, 43, 50, 57],
  contrabass: [28, 33, 38, 43],
} as const satisfies Readonly<Record<Bowed, readonly number[]>>;

/**
 * The semitones from the open string to the end of the fingerboard. The left hand reaches the
 * end of the target `fingerboard` at this interval.
 */
export const FINGERBOARD_SEMITONES = 20;

/**
 * Gives the place of a stop on the target `fingerboard`. The place follows the string length:
 * one octave is half of the string.
 *
 * @param semitones The semitones above the open string. A value below 1 gives the place of 1.
 * @returns 0 at the nut, 1 at the end of the fingerboard.
 */
export function fingerboardPlace(semitones: number): number {
  const k = Math.max(1, semitones);
  return (1 - 2 ** (-k / 12)) / (1 - 2 ** (-FINGERBOARD_SEMITONES / 12));
}
