import { describe, expect, it } from 'vitest';

import { note, programChange, track } from '../midi/test-smf.ts';
import { scoreOf } from '../score/test-score.ts';
import { METER_BARS, meterBar, meterLevels, meterTrack } from './meter.ts';

/**
 * Builds the meter track of a file: key 60 from 0 s to 1 s, then key 90 from 1 s to 2 s, on a
 * violin channel. The default tempo of 120 bpm gives 0.5 s for each 480 ticks.
 *
 * @param sectionSize The setting "Section size".
 * @returns The track and the score.
 */
function twoNotes(sectionSize: 'one-per-part' | 'full' = 'one-per-part') {
  const score = scoreOf(
    { tracks: [track([programChange(0, 0, 40)], note(0, 0, 60, 960), note(960, 0, 90, 1920))] },
    sectionSize,
  );
  return { score, meter: meterTrack(score.notes, score.durationSec) };
}

/**
 * Gives the levels of the bars at a song time.
 *
 * @param songSec The song time, in seconds.
 * @param sectionSize The setting "Section size".
 * @returns The levels.
 */
function levelsAt(songSec: number, sectionSize?: 'one-per-part' | 'full'): number[] {
  return [...meterLevels(twoNotes(sectionSize).meter, songSec, new Float32Array(METER_BARS))];
}

describe('meterBar (design 2.8)', () => {
  it('puts the keys into nine bands of eight keys from key 28', () => {
    expect([0, 28, 35, 36, 60, 90, 99, 100, 127].map(meterBar)).toEqual([
      0, 0, 0, 1, 4, 7, 8, 8, 8,
    ]);
  });
});

describe('meterLevels (design 2.8)', () => {
  it('lifts the bar of the key that sounds, and the bars beside it less', () => {
    const levels = levelsAt(0.25);
    expect(levels[4]).toBeGreaterThan(0.3);
    for (const near of [3, 5]) {
      expect(levels[near]).toBeGreaterThan(0);
      expect(levels[near]).toBeLessThan(levels[4] ?? 0);
    }
    expect(levels.filter((_, bar) => bar < 3 || bar > 5)).toEqual(Array(METER_BARS - 3).fill(0));
  });

  it('follows the music: the second key lifts its bar after the first key ends', () => {
    const levels = levelsAt(1.5);
    expect(levels[7]).toBeGreaterThan(0.3);
    expect(levels[4]).toBe(0);
  });

  it('spreads a key into the two bars beside its bar only', () => {
    const levels = levelsAt(1.5);
    expect(levels[6]).toBeGreaterThan(0);
    expect(levels[8]).toBeGreaterThan(0);
    expect(levels[5]).toBe(0);
  });

  it('falls with the decay of a held key', () => {
    expect(levelsAt(0.9)[4]).toBeLessThan(levelsAt(0.1)[4] ?? 0);
  });

  it('keeps each level between 0 and 1', () => {
    for (let sec = 0; sec < 2.5; sec += 0.05) {
      for (const level of levelsAt(sec)) {
        expect(level).toBeGreaterThanOrEqual(0);
        expect(level).toBeLessThanOrEqual(1);
      }
    }
  });

  it('gives no level before the start and after the end', () => {
    expect(levelsAt(-1)).toEqual(Array(METER_BARS).fill(0));
    expect(levelsAt(10)).toEqual(Array(METER_BARS).fill(0));
  });

  it('does not change with the section size', () => {
    const { score } = twoNotes('full');
    expect(Math.max(...score.notes.map((n) => n.player))).toBeGreaterThan(0);
    expect(levelsAt(0.25, 'full')).toEqual(levelsAt(0.25, 'one-per-part'));
  });
});
