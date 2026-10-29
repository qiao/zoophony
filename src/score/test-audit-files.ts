import {
  noteOff,
  noteOn,
  programChange,
  tempo,
  timeSignature,
  track,
  trackName,
} from '../midi/test-smf.ts';
import type { TestEvent, TestFile } from '../midi/test-smf.ts';

/** The ticks of one quarter note. */
const Q = 480;

/**
 * Makes one note for each step of a part, with a velocity.
 *
 * @param channel The channel.
 * @param steps The start, the length, and the keys of each step, in quarter notes.
 * @param velocity The velocity of each note.
 * @returns The events.
 */
function part(
  channel: number,
  steps: readonly (readonly [start: number, length: number, keys: readonly number[]])[],
  velocity: number,
): TestEvent[] {
  return steps.flatMap(([start, length, keys]) =>
    keys.flatMap((key) => [
      noteOn(start * Q, channel, key, velocity),
      noteOff((start + length) * Q - 20, channel, key),
    ]),
  );
}

/**
 * Makes the steps of a part that repeats a pattern for some bars of 4/4.
 *
 * @param count The number of bars.
 * @param pattern The start in the bar, the length, and the keys of each step of one bar.
 * @param from The first bar.
 * @returns The steps.
 */
function bars(
  count: number,
  pattern: readonly (readonly [start: number, length: number, keys: readonly number[]])[],
  from = 0,
): [number, number, readonly number[]][] {
  return Array.from({ length: count }, (_, b) =>
    pattern.map(([start, length, keys]): [number, number, readonly number[]] => [
      (from + b) * 4 + start,
      length,
      keys,
    ]),
  ).flat();
}

/** The bars of the violin concertino: 25 bars of 4/4 at 120 BPM, 50 s. */
const CONCERTINO_BARS = 25;

/**
 * The melody of the solo violin: phrases of four bars in eighth notes, from 76 to 88, with a
 * rest of one beat at the end of each phrase.
 */
function soloMelody(): [number, number, readonly number[]][] {
  const steps: [number, number, readonly number[]][] = [];
  for (let bar = 0; bar < CONCERTINO_BARS; bar++) {
    const last = bar % 4 === 3;
    for (let eighth = 0; eighth < (last ? 6 : 8); eighth++) {
      const key = 76 + ((bar * 3 + eighth * 5) % 13);
      steps.push([bar * 4 + eighth / 2, 0.5, [key]]);
    }
  }
  return steps;
}

/**
 * Builds a violin concertino: a solo violin on the first channel at the velocity 112, above a
 * string ensemble in the range of the violins, a viola, a cello, a flute, and a horn at the
 * velocity 80. It lasts 50 s and has no sequence name. The soloist rule gives the solo violin
 * one player.
 *
 * @returns The test file.
 */
export function violinConcertinoFile(): TestFile {
  return {
    tracks: [
      [tempo(0, 120), timeSignature(0, 4, 4)],
      track([trackName('Solo Violin'), programChange(0, 0, 40)], part(0, soloMelody(), 112)),
      track(
        [trackName('Strings'), programChange(0, 1, 48)],
        part(
          1,
          bars(CONCERTINO_BARS, [
            [0, 2, [59, 64]],
            [2, 2, [60, 67]],
          ]),
          80,
        ),
      ),
      track(
        [trackName('Viola'), programChange(0, 2, 41)],
        part(
          2,
          bars(CONCERTINO_BARS, [
            [0, 1, [55]],
            [1, 1, [57]],
            [2, 1, [55]],
            [3, 1, [53]],
          ]),
          80,
        ),
      ),
      track(
        [trackName('Cello'), programChange(0, 3, 42)],
        part(
          3,
          bars(CONCERTINO_BARS, [
            [0, 2, [36]],
            [2, 2, [43]],
          ]),
          80,
        ),
      ),
      track(
        [trackName('Flute'), programChange(0, 4, 73)],
        part(
          4,
          bars(12, [[0, 4, [72]]]).filter((_, i) => i % 2 === 0),
          80,
        ),
      ),
      track(
        [trackName('Horn'), programChange(0, 5, 60)],
        part(5, bars(CONCERTINO_BARS, [[0, 4, [55]]]), 80),
      ),
    ],
  };
}

/**
 * Builds a piano piece: one piano, 51 s, with the sequence name "Morning Study". The left hand
 * plays chords, and the right hand a melody.
 *
 * @returns The test file.
 */
export function pianoSoloFile(): TestFile {
  const left = bars(25, [
    [0, 2, [48, 55, 60]],
    [2, 2, [47, 55, 62]],
  ]);
  const right = bars(25, [
    [0, 1, [72]],
    [1, 1, [74]],
    [2, 1.5, [76]],
    [3.5, 0.5, [79]],
  ]);
  return {
    tracks: [
      [trackName('Morning Study'), tempo(0, 118), timeSignature(0, 4, 4)],
      track([trackName('Piano'), programChange(0, 0, 0)], part(0, [...left, ...right], 90)),
    ],
  };
}
