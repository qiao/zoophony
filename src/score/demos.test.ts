import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { BasicMIDI } from 'spessasynth_core';
import { describe, expect, it } from 'vitest';

import { assignPlayers } from './players.ts';
import type { PlayerAssignment } from './players.ts';
import { assignSeats, SECTION_ORDER } from './seats.ts';
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

function cast(bytes: Uint8Array): PlayerAssignment {
  const result = timeline(bytes);
  return assignPlayers(result, assignSeats(result), 'auto');
}

/** Lists the sections of the seats in the order of `SectionId`, with the seat count if above 1. */
function sections(result: PlayerAssignment): string {
  return SECTION_ORDER.flatMap((section) => {
    const count = result.seats.filter((seat) => seat.section === section).length;
    if (count === 0) {
      return [];
    }
    return [count > 1 ? `${section} (${count})` : section];
  }).join(', ');
}

/**
 * The sections of the demo files before the changes of `demos/patches.json` (design 8.3). The
 * table "Expected sections" of design 8.2 gives the sections after the changes. The horn and
 * trumpet tracks of demo 1 and the choir tracks of demo 5 use woodwind programs before them.
 */
const UNPATCHED_SECTIONS: readonly (readonly [string, string])[] = [
  [
    'beethoven-5.mid',
    'violin (2), viola, cello, contrabass, flute, oboe (3), clarinet, bassoon, timpani',
  ],
  ['grieg-ase.mid', 'violin (2), viola, cello, contrabass'],
  ['mozart-k488.mid', 'violin (2), viola, cello, piano, flute, clarinet, bassoon, horn'],
  ['mozart-k315.mid', 'violin (2), viola, cello, flute, oboe, horn'],
  [
    'handel-hallelujah.mid',
    'violin (2), viola, cello, flute, oboe (2), clarinet, bassoon (2), trumpet, timpani',
  ],
  [
    'boulanger-matin.mid',
    'violin (2), viola, cello, contrabass, harp, piano, flute, oboe, clarinet, bassoon, horn, ' +
      'trumpet, trombone, tuba, percussion',
  ],
];

describe('the timeline, the seats, and the players of the demo files', () => {
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

  it.each(UNPATCHED_SECTIONS)('gives the seats of %s (design 8.2)', (name, expected) => {
    const result = cast(demo(name));
    const players = result.seats.reduce((sum, seat) => sum + seat.playerCount, 0);

    expect(sections(result)).toBe(expected);
    expect(result.orchestral).toBe(true);
    expect(players).toBeLessThanOrEqual(60);
  });

  it('builds the timeline, the seats, and the players of the largest demo in at most 100 ms (design 9.7)', () => {
    const bytes = demo('boulanger-matin.mid');
    const times: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      const start = performance.now();
      cast(bytes);
      times.push(performance.now() - start);
    }
    const median = times.toSorted((a, b) => a - b)[2] ?? Infinity;

    expect(median).toBeLessThan(100);
  });
});
