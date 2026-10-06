import { chord, note, programChange, tempo, timeSignature, track } from '../midi/test-smf.ts';
import type { TestEvent, TestFile } from '../midi/test-smf.ts';

/** The ticks of one quarter note. */
const Q = 480;

/** The bars of the file, in 4/4 at 120 BPM: 24 s. */
const BARS = 12;

/** The rhythm of one sung phrase, in quarter notes: the start and the length of each note. */
const PHRASE: readonly (readonly [start: number, length: number])[] = [
  [0, 1],
  [1, 1],
  [2, 2],
  [4, 0.5],
  [4.5, 0.5],
  [5, 0.5],
  [5.5, 0.5],
  [6, 1.5],
];

/** The steps of the melody of a phrase above its first key, one for each note of `PHRASE`. */
const MELODY: readonly number[] = [0, 2, 4, 2, 0, 0, -1, 0];

/** The start of each phrase, in quarter notes. The gaps between the phrases are the rests. */
const PHRASE_STARTS: readonly number[] = [0, 8, 20, 28, 40];

/** The voices of the choir: the channel, the program, the first key, and the delay in quarters. */
const VOICES: readonly (readonly [channel: number, program: number, key: number, delay: number])[] =
  [
    [8, 52, 72, 0],
    [10, 52, 67, 0],
    [11, 53, 60, 1],
    [12, 54, 48, 2],
  ];

/**
 * Makes the phrases of one voice of the choir. The third phrase of the soprano ends with a chord
 * of two notes, so that the seat divides its singers (divisi, design 3.8).
 */
function voice(channel: number, key: number, delay: number): TestEvent[][] {
  return PHRASE_STARTS.flatMap((phraseStart, phrase) =>
    PHRASE.map(([start, length], i) => {
      const tick = (phraseStart + delay + start) * Q;
      const end = tick + length * Q;
      const pitch = key + (MELODY[i] ?? 0) + phrase;
      if (channel === 8 && phrase === 2 && i === PHRASE.length - 1) {
        return chord(tick, channel, [pitch, pitch - 4], end);
      }
      return note(tick, channel, pitch, end);
    }),
  );
}

/**
 * Makes one note on each quarter of each bar for an instrument of the orchestra.
 *
 * @param channel The channel.
 * @param keys The keys of each quarter. More than one key makes a chord.
 * @param every The step between two notes, in quarter notes.
 */
function quarters(channel: number, keys: readonly number[], every = 1): TestEvent[][] {
  return Array.from({ length: (BARS * 4) / every }, (_, i) => {
    const tick = i * every * Q;
    return chord(tick, channel, keys, tick + Q * 0.9);
  });
}

/**
 * Builds a test file of a choral piece with an orchestra, as a test input in place of a choir
 * demo: an oboe, a bassoon, two trumpets, the timpani, four string seats, and a choir of four
 * voices with the programs 52 to 54. Each voice sings phrases with rests, and the lower voices
 * enter later. With the section size "Auto", each voice gets 8 singers: 32 singers on the risers
 * behind the timpani (design 4.5).
 *
 * @returns The test file.
 */
export function choirFile(): TestFile {
  const melodic = (channel: number, program: number, ...lists: TestEvent[][]): TestEvent[] =>
    track([programChange(0, channel, program)], ...lists);
  return {
    tracks: [
      [tempo(0, 120), timeSignature(0, 4, 4)],
      melodic(0, 68, ...voice(0, 72, 0)),
      melodic(1, 70, ...voice(1, 48, 2)),
      melodic(2, 56, ...quarters(2, [72, 67], 2)),
      melodic(3, 47, ...quarters(3, [43], 2)),
      melodic(4, 40, ...quarters(4, [76])),
      melodic(5, 40, ...quarters(5, [72])),
      melodic(6, 41, ...quarters(6, [64])),
      melodic(7, 42, ...quarters(7, [48])),
      ...VOICES.map(([channel, program, key, delay]) =>
        melodic(channel, program, ...voice(channel, key, delay)),
      ),
    ],
  };
}
