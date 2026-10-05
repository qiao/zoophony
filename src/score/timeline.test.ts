import { describe, expect, it } from 'vitest';

import {
  controlChange,
  noteOff,
  noteOn,
  programChange,
  tempo,
  timeSignature,
  trackName,
  writeSmf,
} from '../midi/test-smf.ts';
import type { TestFile } from '../midi/test-smf.ts';
import { buildTimeline } from './timeline.ts';
import type { Timeline } from './timeline.ts';

function timeline(file: TestFile): Timeline {
  const result = buildTimeline(writeSmf(file));
  if (!result.ok) {
    throw new Error(`The test file was refused: ${result.error}.`);
  }
  return result.timeline;
}

const NOTE = [noteOn(0, 0, 60), noteOff(480, 0, 60)];

describe('buildTimeline', () => {
  it('puts the channel events of all tracks in one list in seconds', () => {
    const result = timeline({
      ticksPerQuarter: 480,
      tracks: [
        [tempo(0, 60)],
        [programChange(0, 1, 40), noteOn(480, 1, 67), noteOff(960, 1, 67)],
        [controlChange(0, 2, 7, 100), noteOn(240, 2, 48), noteOff(960, 2, 48)],
      ],
    });

    expect(result.events.map((event) => [event.timeSec, event.kind, event.data1])).toEqual([
      [0, 0xc0, 40],
      [0, 0xb0, 7],
      [0.5, 0x90, 48],
      [1, 0x90, 67],
      [2, 0x80, 67],
      [2, 0x80, 48],
    ]);
    expect(result.events.map((event) => event.synthChannel)).toEqual([1, 2, 2, 1, 1, 2]);
  });

  it('converts ticks with a tempo event of a later track (design 3.3)', () => {
    const result = timeline({
      ticksPerQuarter: 480,
      tracks: [NOTE, [tempo(240, 30)]],
    });

    expect(result.events.map((event) => event.timeSec)).toEqual([0, 0.25 + 1]);
    expect(result.tempoMap.tempoAt(480)).toBe(2_000_000);
  });

  it('uses 4/4 in a file with no time signature (design 3.3)', () => {
    const result = timeline({ tracks: [NOTE] });

    expect(result.timeSignatures).toEqual([{ tick: 0, timeSec: 0, numerator: 4, denominator: 4 }]);
  });

  it('collects the time signatures of all tracks, with their times', () => {
    const result = timeline({
      ticksPerQuarter: 480,
      tracks: [
        [timeSignature(0, 2, 4), tempo(0, 60), timeSignature(960, 6, 8)],
        [...NOTE, timeSignature(1920, 3, 4)],
      ],
    });

    expect(result.timeSignatures).toEqual([
      { tick: 0, timeSec: 0, numerator: 2, denominator: 4 },
      { tick: 960, timeSec: 2, numerator: 6, denominator: 8 },
      { tick: 1920, timeSec: 4, numerator: 3, denominator: 4 },
    ]);
  });

  it('keeps 4/4 before a first time signature after tick 0', () => {
    const result = timeline({ tracks: [[...NOTE, timeSignature(960, 3, 4)]] });

    expect(result.timeSignatures.map((item) => [item.tick, item.numerator])).toEqual([
      [0, 4],
      [960, 3],
    ]);
  });

  it('gives the name of the first track as the sequence name', () => {
    const named = timeline({
      tracks: [[trackName('Hallelujah')], [trackName('Soprano'), ...NOTE]],
    });
    const unnamed = timeline({ tracks: [[], [trackName('Soprano'), ...NOTE]] });

    expect(named.sequenceName).toBe('Hallelujah');
    expect(unnamed.sequenceName).toBe('');
  });

  it('returns the reason of the parser for a file that it refuses', () => {
    const result = buildTimeline(writeSmf({ format: 2, tracks: [NOTE] }));

    expect(result).toEqual({ ok: false, error: 'format-2' });
  });
});
