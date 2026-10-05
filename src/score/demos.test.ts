import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { BasicMIDI } from 'spessasynth_core';
import { describe, expect, it } from 'vitest';

import { buildTimeline } from './timeline.ts';
import type { Timeline } from './timeline.ts';

const DEMOS = join(import.meta.dirname, '..', '..', 'demos', 'src');

const FILES = [
  'beethoven-5.mid',
  'grieg-ase.mid',
  'mozart-k488.mid',
  'mozart-k315.mid',
  'handel-hallelujah.mid',
  'boulanger-matin.mid',
];

function demo(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(DEMOS, name)));
}

function timeline(bytes: Uint8Array): Timeline {
  const result = buildTimeline(bytes);
  if (!result.ok) {
    throw new Error(`The demo file was refused: ${result.error}.`);
  }
  return result.timeline;
}

describe('buildTimeline with the demo files', () => {
  it.each(FILES)('gives one note for each note on of %s', (name) => {
    const bytes = demo(name);
    const result = timeline(bytes);
    const reference = BasicMIDI.fromArrayBuffer(bytes.slice().buffer);
    const noteOns = reference.tracks
      .flatMap((track) => track.events)
      .filter((event) => (event.statusByte & 0xf0) === 0x90 && (event.data[1] ?? 0) > 0);
    const times = result.events.map((event) => event.timeSec);

    expect(result.notes).toHaveLength(noteOns.length);
    expect(times).toEqual(times.toSorted((a, b) => a - b));
    expect(result.notes.every((note) => note.endSec >= note.startSec)).toBe(true);
    expect(result.events.filter((event) => event.kind === 0x80)).toHaveLength(noteOns.length);
  });

  it('gives the length and the programs of demo 1', () => {
    const result = timeline(demo('beethoven-5.mid'));
    const end = Math.max(...result.notes.map((note) => note.endSec));
    const programs = new Set(result.notes.map((note) => note.program));

    // The research measured 316.563 s for this file (audio-scheduling.md 4.3).
    expect(end).toBeCloseTo(316.56, 1);
    // Strings, woodwinds, timpani, and the English horn of the unchanged horn and trumpet tracks.
    expect([...programs].toSorted((a, b) => a - b)).toEqual([
      40, 41, 42, 43, 47, 68, 69, 70, 71, 73,
    ]);
  });

  it('builds the timeline of the largest demo in at most 100 ms (design 9.7)', () => {
    const bytes = demo('boulanger-matin.mid');
    const times: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      const start = performance.now();
      timeline(bytes);
      times.push(performance.now() - start);
    }
    const median = times.toSorted((a, b) => a - b)[2] ?? Infinity;

    expect(median).toBeLessThan(100);
  });
});
