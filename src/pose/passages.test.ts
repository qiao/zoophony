import { describe, expect, it } from 'vitest';

import { note, noteOff, noteOn, programChange, tempo, track } from '../midi/test-smf.ts';
import type { TestEvent } from '../midi/test-smf.ts';
import { scoreOf } from '../score/test-score.ts';
import { noteLoudness } from './loudness.ts';
import { PASSAGE_MOTION, activityAt, buildPassages } from './passages.ts';
import type { Passages } from './passages.ts';

/** Builds the passages of a one-channel flute file at 120 BPM (a quarter is 0.5 s). */
function passagesOf(...events: (readonly TestEvent[])[]): Passages {
  const score = scoreOf({ tracks: [track([tempo(0, 120), programChange(0, 0, 73)], ...events)] });
  return buildPassages(score.notes, [...noteLoudness(score)]);
}

describe('buildPassages', () => {
  it('joins notes with short rests and splits at long rests', () => {
    // 0 to 0.5 s, 0.6 to 1.1 s (a rest of 0.1 s), then 3 to 3.5 s.
    const passages = passagesOf(note(0, 0, 72), note(576, 0, 74), note(2880, 0, 76));
    expect([...passages.starts]).toEqual([0, 3]);
    expect([...passages.ends]).toEqual([1.1, 3.5]);
  });

  it('splits at a rest of exactly 0.3 s, because only a shorter rest joins (design 5.1)', () => {
    // 0 to 1 s, then 1.3 to 1.8 s.
    const passages = passagesOf(note(0, 0, 72, 960), note(1248, 0, 74));
    expect([...passages.starts]).toEqual([0, 1.3]);
  });

  it('keeps the highest loudness of each passage', () => {
    const passages = passagesOf(
      [noteOn(0, 0, 72, 40), noteOff(480, 0, 72)],
      [noteOn(480, 0, 74, 120), noteOff(960, 0, 74)],
    );
    expect(passages.loudness[0]).toBeCloseTo((120 / 127) * (100 / 127), 6);
  });
});

describe('activityAt', () => {
  const passages = passagesOf(note(960, 0, 72, 1920), note(4800, 0, 74, 5760));

  it('rises before the first note and is 1 while the player plays', () => {
    expect(activityAt(passages, 0).weight).toBe(0);
    expect(activityAt(passages, 1 - PASSAGE_MOTION.leadSec).weight).toBe(0);
    expect(activityAt(passages, 0.85).weight).toBeGreaterThan(0);
    expect(activityAt(passages, 1).weight).toBe(1);
    expect(activityAt(passages, 1.9).weight).toBe(1);
  });

  it('starts the sway 0.3 s before the first note of a passage (design 5.3)', () => {
    expect(activityAt(passages, 1 - 0.32).weight).toBe(0);
    expect(activityAt(passages, 1 - 0.15).weight).toBeCloseTo(0.5, 6);
  });

  it('fades in 1 s after a passage, with no jump before the next one', () => {
    expect(activityAt(passages, 2.5).weight).toBeGreaterThan(0);
    expect(activityAt(passages, 2.5).weight).toBeLessThan(1);
    expect(activityAt(passages, 3.1).weight).toBe(0);
    let last = activityAt(passages, 0).weight;
    for (let t = 0; t < 12; t += 0.01) {
      const weight = activityAt(passages, t).weight;
      expect(Math.abs(weight - last)).toBeLessThan(0.06);
      last = weight;
    }
  });
});
