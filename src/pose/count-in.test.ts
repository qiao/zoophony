import { describe, expect, it } from 'vitest';

import { note, tempo, timeSignature, track } from '../midi/test-smf.ts';
import type { TestFile } from '../midi/test-smf.ts';
import { scoreOf } from '../score/test-score.ts';
import {
  COUNT_IN,
  beatLengthAt,
  countInAt,
  inCountIn,
  noteLayerTime,
  readyAt,
} from './count-in.ts';

/** Gives the times of the conducted beats of a test file, as `PosePlan.beats` holds them. */
function beatsOf(file: TestFile): Float64Array {
  return Float64Array.from(scoreOf(file).beats, (beat) => beat.timeSec);
}

/** Eight bars of 2/4 at 192 BPM, as the Beethoven demo: one conducted beat in each bar (design 5.4). */
const IN_ONE: TestFile = {
  tracks: [[tempo(0, 192), timeSignature(0, 2, 4)], track([], note(0, 0, 60, 8 * 960))],
};

/** Two bars of 4/4 at 120 BPM, then two bars at 60 BPM. */
const SLOWER: TestFile = {
  tracks: [
    [tempo(0, 120), timeSignature(0, 4, 4), tempo(2 * 1920, 60)],
    track([], note(0, 0, 60, 4 * 1920)),
  ],
};

describe('countInAt (design 5.2, 5.4)', () => {
  it('gives a ready pause and one conducted beat from the song start', () => {
    const count = countInAt(beatsOf(IN_ONE), 0);
    expect(count.readySec).toBe(0.6);
    // One bar of 2/4 at 192 BPM: 2 × 60 / 192 s.
    expect(count.beatSec).toBeCloseTo(0.625, 9);
    expect(count.lengthSec).toBeCloseTo(1.225, 9);
    expect(count.startSec).toBe(0);
    expect(COUNT_IN.readySec).toBe(0.6);
  });

  it('gives only the conducted beat at the pause point after a pause', () => {
    const beats = beatsOf(SLOWER);
    expect(countInAt(beats, 1.2)).toEqual({
      startSec: 1.2,
      readySec: 0,
      beatSec: 0.5,
      lengthSec: 0.5,
    });
    // The third bar starts at 4 s, at 60 BPM.
    expect(countInAt(beats, 5.5).beatSec).toBeCloseTo(1, 9);
  });

  it('uses the last beat after the last beat, and the MIDI default with no beats', () => {
    const beats = beatsOf(SLOWER);
    expect(beatLengthAt(beats, 100)).toBeCloseTo(1, 9);
    expect(beatLengthAt(new Float64Array(0), 0)).toBe(0.5);
    expect(beatLengthAt(Float64Array.from([0]), 0)).toBe(0.5);
  });
});

describe('noteLayerTime (design 5.2)', () => {
  const beats = beatsOf(SLOWER);

  it('runs with the song time in the count-in from the song start', () => {
    const count = countInAt(beats, 0);
    expect(noteLayerTime(count, -0.3)).toBe(-0.3);
  });

  it('holds the pause point in the count-in after a pause, and runs after it', () => {
    const count = countInAt(beats, 1.2);
    expect(noteLayerTime(count, 0.8)).toBe(1.2);
    expect(noteLayerTime(count, 1.19)).toBe(1.2);
    expect(noteLayerTime(count, 1.25)).toBe(1.25);
    // Outside the count-in, for example after a seek, the song time runs.
    expect(inCountIn(count, 0.6)).toBe(false);
    expect(noteLayerTime(count, 0.6)).toBe(0.6);
  });
});

describe('readyAt (design 5.4)', () => {
  const beats = beatsOf(IN_ONE);

  it('rises in 0.2 s from the start of the count-in, and holds until the downbeat', () => {
    const count = countInAt(beats, 0);
    const from = -count.lengthSec;
    expect(readyAt(count, from - 0.01)).toBe(0);
    expect(readyAt(count, from)).toBe(0);
    expect(readyAt(count, from + 0.1)).toBeCloseTo(0.5, 9);
    expect(readyAt(count, from + 0.2)).toBe(1);
    expect(readyAt(count, -0.01)).toBe(1);
  });

  it('lowers the left hand in 0.6 s after the downbeat', () => {
    const count = countInAt(beats, 0);
    expect(readyAt(count, 0)).toBe(1);
    expect(readyAt(count, 0.3)).toBeCloseTo(0.5, 9);
    expect(readyAt(count, 0.6)).toBe(0);
    expect(readyAt(count, 5)).toBe(0);
  });

  it('gives no ready gesture after a pause', () => {
    const count = countInAt(beats, 2);
    expect(readyAt(count, 1.8)).toBe(0);
  });
});
