import { describe, expect, it } from 'vitest';

import { controlChange, note, noteOff, noteOn, programChange, track } from '../midi/test-smf.ts';
import { scoreOf } from '../score/test-score.ts';
import { gestureSize, loudnessOf, noteLoudness } from './loudness.ts';

describe('gestureSize (design 5.1, 5.3)', () => {
  it('gives (0.6 + 0.6 × loudness) × amplitude, with the loudness limited to 1', () => {
    expect(gestureSize(0, 1)).toBeCloseTo(0.6, 12);
    expect(gestureSize(1, 1)).toBeCloseTo(1.2, 12);
    expect(gestureSize(0.5, 1.1)).toBeCloseTo(0.99, 12);
    expect(gestureSize(2, 0.85)).toBeCloseTo(1.02, 12);
  });
});

describe('loudnessOf (design 5.3)', () => {
  it('multiplies the velocity by CC 7 and CC 11, with the General MIDI start values', () => {
    expect(loudnessOf(127, 127, 127)).toBe(1);
    expect(loudnessOf(100)).toBeCloseTo((100 / 127) * (100 / 127), 12);
    expect(loudnessOf(64, 127, 32)).toBeCloseTo((64 / 127) * (32 / 127), 12);
  });
});

describe('noteLoudness (design 5.3)', () => {
  it('multiplies the velocity by CC 7 and CC 11 at the start of each note', () => {
    const score = scoreOf({
      tracks: [
        track(
          [programChange(0, 0, 40)],
          note(0, 0, 60),
          [controlChange(480, 0, 7, 64)],
          note(480, 0, 62),
          [controlChange(960, 0, 11, 32), noteOn(960, 0, 64, 127), noteOff(1440, 0, 64)],
          [controlChange(1440, 0, 121, 0)],
          note(1440, 0, 65),
        ),
      ],
    });
    const loudness = noteLoudness(score);
    const pitches = score.notes.map((n) => n.pitch);
    expect(pitches).toEqual([60, 62, 64, 65]);
    // Before any control change, CC 7 is 100 and CC 11 is 127.
    expect(loudness[0]).toBeCloseTo((100 / 127) * (100 / 127), 6);
    expect(loudness[1]).toBeCloseTo((100 / 127) * (64 / 127), 6);
    expect(loudness[2]).toBeCloseTo((64 / 127) * (32 / 127), 6);
    // "Reset all controllers" sets CC 11 back to 127, and CC 7 stays.
    expect(loudness[3]).toBeCloseTo((100 / 127) * (64 / 127), 6);
  });

  it('reads the controllers of the channel of each note in a merged seat', () => {
    const score = scoreOf({
      format: 1,
      tracks: [
        [],
        track(
          [programChange(0, 0, 40), programChange(0, 1, 45), controlChange(0, 1, 7, 32)],
          note(0, 0, 60),
          note(960, 1, 62),
        ),
      ],
    });
    expect(score.seats[0]?.sources).toHaveLength(2);
    const loudness = noteLoudness(score);
    const byPitch = new Map(score.notes.map((n, i) => [n.pitch, loudness[i]]));
    expect(byPitch.get(60)).toBeCloseTo((100 / 127) * (100 / 127), 6);
    expect(byPitch.get(62)).toBeCloseTo((100 / 127) * (32 / 127), 6);
  });

  it('reads its own channel for each note of a unison of two channels in a merged seat', () => {
    // The same key at the same time on two channels of one track: one seat (design 3.7).
    const score = scoreOf({
      format: 1,
      tracks: [
        [],
        track(
          [programChange(0, 0, 40), programChange(0, 1, 40)],
          [controlChange(0, 0, 7, 20), controlChange(0, 1, 7, 127)],
          note(0, 0, 67),
          note(0, 1, 67),
        ),
      ],
    });
    expect(score.seats[0]?.sources).toHaveLength(2);
    const loudness = noteLoudness(score);
    const byChannel = new Map(score.notes.map((n, i) => [n.synthChannel, loudness[i]]));
    expect(byChannel.get(0)).toBeCloseTo((100 / 127) * (20 / 127), 6);
    expect(byChannel.get(1)).toBeCloseTo(100 / 127, 6);
  });
});
