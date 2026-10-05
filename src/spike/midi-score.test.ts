import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { scoreFromMidi } from './midi-score.ts';

const DEMO_1 = join(import.meta.dirname, '..', '..', 'demos', 'src', 'beethoven-5.mid');

describe('scoreFromMidi', () => {
  it('makes the events and presets of demo 1', async () => {
    const data = await readFile(DEMO_1);
    const score = scoreFromMidi(
      data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
    );
    const times = score.synthEvents.map((event) => event.timeSec);

    // The research measured 316.563 s for this file (audio-scheduling.md 4.3).
    expect(score.durationSec).toBeCloseTo(316.56, 1);
    expect(times).toEqual(times.toSorted((a, b) => a - b));
    expect(score.synthEvents.every((event) => event.kind >= 0x80 && event.kind <= 0xe0)).toBe(true);
    expect(score.synthEvents.some((event) => event.kind === 0x90 && event.data2 === 0)).toBe(false);
    // Strings, woodwinds, timpani, and the English horn of the unchanged horn and trumpet tracks.
    expect(score.presets.map((preset) => preset.program)).toEqual(
      expect.arrayContaining([40, 42, 47, 68, 69, 71, 73]),
    );
  });
});
