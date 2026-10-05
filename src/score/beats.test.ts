import { describe, expect, it } from 'vitest';

import { noteOff, noteOn, tempo, timeSignature } from '../midi/test-smf.ts';
import type { TestEvent } from '../midi/test-smf.ts';
import { buildBeats, MAX_BEATS } from './beats.ts';
import { timelineOf } from './test-score.ts';
import type { Beat } from './types.ts';

/**
 * Builds the beats of a file of one track with a note from tick 0 to `endTick`. The result is
 * undefined for a file with too many beats.
 */
function maybeBeats(
  events: readonly TestEvent[],
  endTick: number,
  ticksPerQuarter = 480,
): Beat[] | undefined {
  const track = [...events, noteOn(0, 0, 60), noteOff(endTick, 0, 60)].toSorted(
    (a, b) => a.tick - b.tick,
  );
  return buildBeats(timelineOf({ ticksPerQuarter, tracks: [track] }));
}

/** Builds the beats of a file of one track with a note from tick 0 to `endTick`. */
function beats(events: readonly TestEvent[], endTick: number): Beat[] {
  const result = maybeBeats(events, endTick);
  if (!result) {
    throw new Error('The test file has too many beats.');
  }
  return result;
}

/** Writes each beat as text: "time index/beats pattern", for example "0.5 1/4 4". */
function text(list: readonly Beat[]): string[] {
  return list.map(
    (beat) => `${+beat.timeSec.toFixed(4)} ${beat.indexInBar}/${beat.beatsInBar} ${beat.pattern}`,
  );
}

describe('buildBeats', () => {
  it('uses 4/4 at 120 BPM in a file with no time signature or tempo (design 3.3, 5.4)', () => {
    expect(text(beats([], 1920))).toEqual(['0 0/4 4', '0.5 1/4 4', '1 2/4 4', '1.5 3/4 4']);
  });

  it.each<readonly [string, number, number, number, Beat['pattern'], number]>([
    ['2/4 at 192', 2, 4, 192, 1, 1],
    ['2/4 at 160', 2, 4, 160, 2, 2],
    ['2/2 at a half note tempo of 168', 2, 2, 336, 1, 1],
    ['2/2 at a half note tempo of 160', 2, 2, 320, 2, 2],
    ['3/4 at 168', 3, 4, 168, 1, 1],
    ['3/4 at 100', 3, 4, 100, 3, 3],
    ['3/8 at 90 (an eighth tempo of 180)', 3, 8, 90, 1, 1],
    ['4/4 at 200', 4, 4, 200, 4, 4],
    ['4/2 at 60', 4, 2, 60, 4, 4],
    ['6/8 at an eighth tempo of 84', 6, 8, 42, 6, 6],
    ['6/8 at an eighth tempo of 150', 6, 8, 75, 2, 2],
    ['6/4 at 100', 6, 4, 100, 6, 6],
    ['6/4 at 150', 6, 4, 150, 2, 2],
    ['9/8', 9, 8, 120, 3, 3],
    ['12/8', 12, 8, 120, 4, 4],
    ['5/4', 5, 4, 120, 'generic', 5],
    ['7/8', 7, 8, 120, 'generic', 7],
    ['6/16', 6, 16, 60, 'generic', 6],
  ])(
    'gives a bar of %s its pattern (design 5.4)',
    (...[, numerator, denominator, bpm, pattern, beatsInBar]) => {
      const barTicks = (numerator * 4 * 480) / denominator;
      const result = beats([tempo(0, bpm), timeSignature(0, numerator, denominator)], barTicks);
      const barSec = (barTicks / 480) * (60 / bpm);

      expect(result.map((beat) => [beat.indexInBar, beat.beatsInBar, beat.pattern])).toEqual(
        Array.from({ length: beatsInBar }, (...[, i]) => [i, beatsInBar, pattern]),
      );
      result.forEach((beat, i) => {
        expect(beat.timeSec).toBeCloseTo((i * barSec) / beatsInBar, 5);
      });
    },
  );

  it('follows the time signature changes and the tempo map', () => {
    const result = beats(
      [tempo(0, 60), timeSignature(0, 3, 4), tempo(1440, 120), timeSignature(1440, 4, 4)],
      1440 + 1920,
    );

    expect(text(result)).toEqual([
      '0 0/3 3',
      '1 1/3 3',
      '2 2/3 3',
      '3 0/4 4',
      '3.5 1/4 4',
      '4 2/4 4',
      '4.5 3/4 4',
    ]);
  });

  it('starts a new bar at a time signature inside a bar', () => {
    const result = beats([timeSignature(0, 4, 4), timeSignature(960, 3, 4)], 960 + 1440);

    expect(text(result)).toEqual(['0 0/4 4', '0.5 1/4 4', '1 0/3 3', '1.5 1/3 3', '2 2/3 3']);
  });

  it('selects the pattern of each bar with the tempo at its downbeat', () => {
    const result = beats([timeSignature(0, 2, 4), tempo(0, 192), tempo(960, 120)], 960 + 960);

    expect(text(result)).toEqual(['0 0/1 1', '0.625 0/2 2', '1.125 1/2 2']);
  });

  it('stops the beats before the end of the last note', () => {
    expect(text(beats([], 1200))).toEqual(['0 0/4 4', '0.5 1/4 4', '1 2/4 4']);
    expect(text(beats([], 2000))).toEqual([
      '0 0/4 4',
      '0.5 1/4 4',
      '1 2/4 4',
      '1.5 3/4 4',
      '2 0/4 4',
    ]);
  });

  it('gives no beats to a file with more than 100,000 beats (design 3.3)', () => {
    // With 1 tick for each quarter note in 4/4, each tick before the last note-off is a beat.
    expect(maybeBeats([], MAX_BEATS, 1)).toHaveLength(MAX_BEATS);
    expect(maybeBeats([], MAX_BEATS + 1, 1)).toBeUndefined();
    // A tempo of 1 microsecond for each quarter note gives 1,000,000 beats in 1 s.
    expect(maybeBeats([tempo(0, 60_000_000)], 1_000_000, 1)).toBeUndefined();
  });
});
