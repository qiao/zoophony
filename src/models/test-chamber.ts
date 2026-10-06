import {
  chord,
  note,
  programChange,
  tempo,
  timeSignature,
  track,
  trackName,
} from '../midi/test-smf.ts';
import type { TestEvent, TestFile } from '../midi/test-smf.ts';

/** The ticks of one quarter note. */
const Q = 480;

/** The bars of each file, in 4/4 at 100 BPM: 57.6 s. */
const BARS = 24;

/** The kinds of the parts of a chamber test file. */
type PartKind = 'melody' | 'inner' | 'bass' | 'piano';

/** One part of a chamber test file: one seat on its own channel. */
interface ChamberPart {
  readonly name: string;
  readonly channel: number;
  readonly program: number;
  /** The middle key of the part. */
  readonly key: number;
  readonly kind: PartKind;
  /** The bars with no notes, from the first to the last bar, or `null`. */
  readonly rest: readonly [from: number, to: number] | null;
}

/** The steps of one bar of a melody, in quarter notes: the start, the length, and the step. */
const MELODY_BAR: readonly (readonly [start: number, length: number, step: number])[] = [
  [0, 1, 0],
  [1, 0.5, 2],
  [1.5, 0.5, 4],
  [2, 1, 5],
  [3, 1, 2],
];

/** The last bar of a phrase of a melody: a half note, then a rest of a half note. */
const PHRASE_END: readonly (readonly [start: number, length: number, step: number])[] = [[0, 2, 0]];

/**
 * Makes the notes of one bar of a part.
 *
 * @param part The part.
 * @param bar The bar, from 0.
 * @returns The events of the bar.
 */
function barOf(part: ChamberPart, bar: number): TestEvent[][] {
  const tick = bar * 4 * Q;
  const shift = [0, 3, -2, 5][bar % 4] ?? 0;
  const key = part.key + shift;
  switch (part.kind) {
    case 'melody': {
      const steps = bar % 4 === 3 ? PHRASE_END : MELODY_BAR;
      return steps.map(([start, length, step]) =>
        note(tick + start * Q, part.channel, key + step, tick + (start + length) * Q - 20),
      );
    }
    case 'inner':
      return [0, 2].map((start) =>
        note(tick + start * Q, part.channel, key + start, tick + (start + 2) * Q - 20),
      );
    case 'bass':
      return [0, 1, 2, 3].map((start) =>
        note(tick + start * Q, part.channel, key + (start % 2) * 7, tick + (start + 1) * Q - 20),
      );
    case 'piano':
      return [
        chord(tick, part.channel, [key - 12, key - 5], tick + 4 * Q - 20),
        ...[0, 1, 2, 3].map((start) =>
          chord(
            tick + start * Q,
            part.channel,
            [key, key + 4, key + 7],
            tick + (start + 1) * Q - 20,
          ),
        ),
      ];
  }
}

/**
 * Builds a chamber test file: each part on its own channel, 24 bars of 4/4 at 100 BPM.
 *
 * @param name The sequence name.
 * @param parts The parts.
 * @returns The test file.
 */
function chamberFile(name: string, parts: readonly ChamberPart[]): TestFile {
  return {
    tracks: [
      [trackName(name), tempo(0, 100), timeSignature(0, 4, 4)],
      ...parts.map((part) =>
        track(
          [trackName(part.name), programChange(0, part.channel, part.program)],
          ...Array.from({ length: BARS }, (_, bar) => bar)
            .filter((bar) => !part.rest || bar < part.rest[0] || bar > part.rest[1])
            .flatMap((bar) => barOf(part, bar)),
        ),
      ),
    ],
  };
}

/**
 * Builds a duo of a violin and a piano (design 4.2, the recital form). The violin rests in bars 8
 * and 9, so the piano plays alone there.
 *
 * @returns The test file.
 */
export function violinPianoDuoFile(): TestFile {
  return chamberFile('Duo Test', [
    { name: 'Violin', channel: 0, program: 40, key: 74, kind: 'melody', rest: [8, 9] },
    { name: 'Piano', channel: 1, program: 0, key: 60, kind: 'piano', rest: null },
  ]);
}

/**
 * Builds a string quartet: two violins, a viola, and a cello (design 4.2, the arc form). The
 * second violin rests in bars 4 to 7.
 *
 * @returns The test file.
 */
export function stringQuartetFile(): TestFile {
  return chamberFile('Quartet Test', [
    { name: 'Violin I', channel: 0, program: 40, key: 76, kind: 'melody', rest: null },
    { name: 'Violin II', channel: 1, program: 40, key: 67, kind: 'inner', rest: [4, 7] },
    { name: 'Viola', channel: 2, program: 41, key: 60, kind: 'inner', rest: null },
    { name: 'Cello', channel: 3, program: 42, key: 43, kind: 'bass', rest: null },
  ]);
}

/**
 * Builds a wind quintet: a flute, an oboe, a clarinet, a horn, and a bassoon (design 4.2, the arc
 * form). The oboe rests in bars 8 to 11.
 *
 * @returns The test file.
 */
export function windQuintetFile(): TestFile {
  return chamberFile('Quintet Test', [
    { name: 'Flute', channel: 0, program: 73, key: 79, kind: 'melody', rest: null },
    { name: 'Oboe', channel: 1, program: 68, key: 72, kind: 'inner', rest: [8, 11] },
    { name: 'Clarinet', channel: 2, program: 71, key: 65, kind: 'inner', rest: null },
    { name: 'Horn', channel: 3, program: 60, key: 55, kind: 'inner', rest: null },
    { name: 'Bassoon', channel: 4, program: 70, key: 43, kind: 'bass', rest: null },
  ]);
}

/**
 * Builds a string sextet: two violins, two violas, and two cellos. It has 6 players, so it keeps
 * the conductor (design 4.2).
 *
 * @returns The test file.
 */
export function stringSextetFile(): TestFile {
  return chamberFile('Sextet Test', [
    { name: 'Violin I', channel: 0, program: 40, key: 76, kind: 'melody', rest: null },
    { name: 'Violin II', channel: 1, program: 40, key: 67, kind: 'inner', rest: null },
    { name: 'Viola I', channel: 2, program: 41, key: 62, kind: 'inner', rest: null },
    { name: 'Viola II', channel: 3, program: 41, key: 57, kind: 'inner', rest: [4, 7] },
    { name: 'Cello I', channel: 4, program: 42, key: 48, kind: 'inner', rest: null },
    { name: 'Cello II', channel: 5, program: 42, key: 40, kind: 'bass', rest: null },
  ]);
}
