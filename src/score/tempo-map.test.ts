import { describe, expect, it } from 'vitest';

import { parseMidi } from '../midi/parse.ts';
import { noteOff, noteOn, tempo, writeSmf } from '../midi/test-smf.ts';
import type { TestFile } from '../midi/test-smf.ts';
import { TempoMap } from './tempo-map.ts';

function tempoMap(file: TestFile): TempoMap {
  const result = parseMidi(writeSmf(file));
  if (!result.ok) {
    throw new Error(`The test file was refused: ${result.error}.`);
  }
  return new TempoMap(result.file);
}

const NOTE = [noteOn(0, 0, 60), noteOff(480, 0, 60)];

describe('TempoMap', () => {
  it('uses 120 BPM in a file with no tempo event (design 3.3)', () => {
    const map = tempoMap({ ticksPerQuarter: 480, tracks: [NOTE] });

    expect(map.toSeconds(0)).toBe(0);
    expect(map.toSeconds(480)).toBe(0.5);
    expect(map.toSeconds(960)).toBe(1);
    expect(map.tempoAt(960)).toBe(500_000);
  });

  it('converts ticks to seconds across tempo changes', () => {
    const map = tempoMap({
      ticksPerQuarter: 96,
      tracks: [[tempo(0, 60), tempo(96, 120), tempo(288, 30)], NOTE],
    });

    expect(map.toSeconds(96)).toBe(1);
    expect(map.toSeconds(192)).toBe(1.5);
    expect(map.toSeconds(288)).toBe(2);
    expect(map.toSeconds(384)).toBe(4);
    expect(map.tempoAt(95)).toBe(1_000_000);
    expect(map.tempoAt(96)).toBe(500_000);
    expect(map.tempoAt(10_000)).toBe(2_000_000);
  });

  it('applies a tempo event of any track to all tracks (design 3.3)', () => {
    const map = tempoMap({
      ticksPerQuarter: 480,
      tracks: [[], NOTE, [tempo(480, 60)], [tempo(960, 240)]],
    });

    expect(map.toSeconds(480)).toBe(0.5);
    expect(map.toSeconds(960)).toBe(1.5);
    expect(map.toSeconds(1440)).toBe(1.75);
  });

  it('uses the event of the later track for two tempo events at the same tick', () => {
    const map = tempoMap({ ticksPerQuarter: 480, tracks: [[tempo(0, 60)], [tempo(0, 240)]] });

    expect(map.toSeconds(480)).toBe(0.25);
  });
});
