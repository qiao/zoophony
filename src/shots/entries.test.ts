import { describe, expect, it } from 'vitest';

import { note, programChange, tempo, timeSignature, track } from '../midi/test-smf.ts';
import type { TestFile } from '../midi/test-smf.ts';
import { scoreOf } from '../score/test-score.ts';
import { findEntries } from './entries.ts';

/** A bar of 4/4 in ticks. */
const BAR = 1920;

/**
 * Makes a file of violins and flutes, with one note in each listed bar.
 *
 * @param fluteBars The bars of the flutes.
 * @param violinBars The bars of the violins.
 * @param bpm The tempo.
 * @returns The file.
 */
function entryFile(fluteBars: number[], violinBars: number[], bpm = 120): TestFile {
  const notes = (channel: number, program: number, bars: number[]) =>
    track(
      [programChange(0, channel, program)],
      ...bars.map((bar) => note(bar * BAR, channel, 72, bar * BAR + BAR - 20)),
    );
  return {
    tracks: [
      [tempo(0, bpm), timeSignature(0, 4, 4)],
      notes(0, 40, violinBars),
      notes(1, 73, fluteBars),
    ],
  };
}

/**
 * Lists the entries of a file as text.
 *
 * @param file The file.
 * @returns The start and the section of each entry.
 */
function entriesOf(file: TestFile): string[] {
  const score = scoreOf(file);
  return findEntries(score.beats, score.notes, score.seats.length, () => true).map(
    (e) => `${e.start} ${score.seats[e.seatIndex]?.section}`,
  );
}

describe('findEntries (design 5.6)', () => {
  it('finds a note after a rest of at least two full bars, and not after one bar', () => {
    // The flutes play bar 0, rest in bars 1 and 2, play bar 3, rest in bar 4, and play bar 5.
    expect(entriesOf(entryFile([0, 3, 5], [0, 1, 2, 3, 4, 5, 6, 7]))).toEqual(['6 flute']);
  });

  it('counts the song start as the end of a rest, and keeps entries that come close together', () => {
    expect(entriesOf(entryFile([2], [0, 1, 2, 3]))).toEqual(['4 flute']);
    // At 240 BPM, a bar is 1 s. The two entries are 1 s apart, and both stay.
    expect(entriesOf(entryFile([3], [0, 4], 240))).toEqual(['3 flute', '4 violin']);
    expect(entriesOf(entryFile([0, 3], [0, 3]))).toEqual(['6 violin', '6 flute']);
  });
});
