import { noteOff, noteOn, programChange, tempo, timeSignature, track } from '../midi/test-smf.ts';
import type { TestEvent, TestFile } from '../midi/test-smf.ts';

/** The ticks of one quarter note. */
const Q = 480;

/** The ticks of one bar of 4/4. */
const BAR = 4 * Q;

/** The number of bars of the file. */
const BARS = 32;

/** The first bar of the strings: 8 s at 120 BPM, on a phrase line. */
export const STRINGS_BAR = 4;

/**
 * Makes the first voice on channel 4: an oboe that plays half notes from the middle of bar 0
 * (1 s) to the end, above the strings.
 *
 * @returns The track of the oboe.
 */
function firstVoice(): TestEvent[] {
  const events: TestEvent[] = [];
  for (let bar = 0; bar < BARS; bar++) {
    for (const beat of bar === 0 ? [2] : [0, 2]) {
      const start = bar * BAR + beat * Q;
      const key = 76 + ((bar + beat) % 6);
      events.push(noteOn(start, 4, key, 90), noteOff(start + 2 * Q - 20, 4, key));
    }
  }

  return track([programChange(0, 4, 68)], events);
}

/**
 * Makes one string seat: soft whole notes from {@link STRINGS_BAR} to the end.
 *
 * @param channel The channel of the seat.
 * @param program The program of the seat.
 * @param key The key of each note.
 * @returns The track of the seat.
 */
function strings(channel: number, program: number, key: number): TestEvent[] {
  const events: TestEvent[] = [];
  for (let bar = STRINGS_BAR; bar < BARS; bar++) {
    events.push(noteOn(bar * BAR, channel, key, 30), noteOff(bar * BAR + BAR - 10, channel, key));
  }

  return track([programChange(0, channel, program)], events);
}

/**
 * Makes a test file of a first voice that plays alone in the opening (design 5.6): an oboe from
 * 1 s, and four soft string seats that enter together at bar 4 (8 s). The entry rule of the
 * shots needs a rest of two full bars before a note, so the oboe has no entry at the first cut,
 * and the strings have one. The rule of the first voice gives the oboe its entry.
 *
 * @returns The file at 120 BPM, 32 bars of 4/4 (64 s).
 */
export function firstVoiceFile(): TestFile {
  return {
    tracks: [
      [tempo(0, 120), timeSignature(0, 4, 4)],
      firstVoice(),
      strings(0, 40, 55),
      strings(1, 41, 50),
      strings(2, 42, 43),
      strings(3, 43, 36),
    ],
  };
}
