import { BasicMIDI } from 'spessasynth_core';
import { describe, expect, it } from 'vitest';

import { buildBeats } from './beats.ts';
import { buildTime } from '../../tools/measure-targets.ts';
import { patchedDemos } from '../../tools/patch-demos.ts';
import { buildScore } from './score.ts';
import { SECTION_ORDER } from './seats.ts';
import { timelineOf } from './test-score.ts';
import type { Seat, SectionId, SectionSize } from './types.ts';

/** The demo files, with the bytes before and after the changes of `demos/patches.json`. */
const DEMOS = await patchedDemos();

/** The names of the demo files. */
const FILES = DEMOS.map((item) => item.file);

/**
 * Gives the source bytes of a demo, before the changes of the programs.
 *
 * @throws Error if the demo does not exist.
 */
function demo(name: string): Uint8Array {
  const found = DEMOS.find((item) => item.file === name);
  if (!found) {
    throw new Error(`No demo ${name}.`);
  }
  return found.source;
}

/** Counts the seats of each section, in the order of `SectionId`. */
function seatCounts(seats: readonly Seat[]): Map<SectionId, number> {
  const counts = new Map<SectionId, number>();
  for (const section of SECTION_ORDER) {
    const count = seats.filter((seat) => seat.section === section).length;
    if (count > 0) {
      counts.set(section, count);
    }
  }
  return counts;
}

/**
 * The table "Expected sections" of design 8.2: the seat count of each section of each demo,
 * after the changes of `demos/patches.json` (8.3). The piano seat of the Boulanger demo is the
 * celesta.
 */
const EXPECTED_SECTIONS: ReadonlyMap<string, ReadonlyMap<SectionId, number>> = new Map([
  [
    'beethoven-5.mid',
    sectionTable({
      flute: 1,
      oboe: 1,
      clarinet: 1,
      bassoon: 1,
      horn: 1,
      trumpet: 1,
      timpani: 1,
      violin: 2,
      viola: 1,
      cello: 1,
      contrabass: 1,
    }),
  ],
  ['grieg-ase.mid', sectionTable({ violin: 2, viola: 1, cello: 1, contrabass: 1 })],
  [
    'mozart-k488.mid',
    sectionTable({
      flute: 1,
      clarinet: 1,
      bassoon: 1,
      horn: 1,
      piano: 1,
      violin: 2,
      viola: 1,
      cello: 1,
    }),
  ],
  ['mozart-k315.mid', sectionTable({ flute: 1, oboe: 1, horn: 1, violin: 2, viola: 1, cello: 1 })],
  [
    'handel-hallelujah.mid',
    sectionTable({
      oboe: 1,
      bassoon: 1,
      trumpet: 1,
      timpani: 1,
      violin: 2,
      viola: 1,
      cello: 1,
      choir: 4,
    }),
  ],
  [
    'boulanger-matin.mid',
    sectionTable({
      flute: 1,
      oboe: 1,
      clarinet: 1,
      bassoon: 1,
      horn: 1,
      trumpet: 1,
      trombone: 1,
      tuba: 1,
      piano: 1,
      percussion: 1,
      harp: 1,
      violin: 2,
      viola: 1,
      cello: 1,
      contrabass: 1,
    }),
  ],
]);

/** Puts the seat counts of one row of the table in the order of `SectionId`. */
function sectionTable(row: Partial<Record<SectionId, number>>): Map<SectionId, number> {
  return new Map(
    SECTION_ORDER.flatMap((section) => {
      const count = row[section];
      return count === undefined ? [] : [[section, count] as const];
    }),
  );
}

const SECTION_SIZES: readonly SectionSize[] = ['auto', 'one-per-part', 'full'];

/** Each demo with each section size. */
const DEMO_CASES = FILES.flatMap((file) => SECTION_SIZES.map((size) => [file, size] as const));

describe('the timeline, the seats, and the players of the demo files', () => {
  it.each(FILES)('gives one note for each note on of %s', (name) => {
    const bytes = demo(name);
    const result = timelineOf(bytes);
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
    const result = timelineOf(demo('beethoven-5.mid'));
    const end = Math.max(...result.notes.map((note) => note.endSec));
    const programs = new Set(result.notes.map((note) => note.program));

    // The research measured 316.563 s for this file (audio-scheduling.md 4.3).
    expect(end).toBeCloseTo(316.56, 1);
    // Strings, woodwinds, timpani, and the English horn of the unchanged horn and trumpet tracks.
    expect([...programs].toSorted((a, b) => a - b)).toEqual([
      40, 41, 42, 43, 47, 68, 69, 70, 71, 73,
    ]);
  });

  it.each<readonly [string, number]>([
    ['beethoven-5.mid', 1],
    ['mozart-k488.mid', 6],
  ])('gives the bars of %s the conductor pattern %s (design 5.4)', (name, pattern) => {
    const beats = buildBeats(timelineOf(demo(name))) ?? [];

    expect(beats.length).toBeGreaterThan(100);
    expect(beats.every((beat) => beat.pattern === pattern)).toBe(true);
  });

  it.each(FILES)('builds the score of %s with the synth events in time order', (name) => {
    const result = buildScore(demo(name), 'auto');
    if (!result.ok) {
      throw new Error(`The demo file was refused: ${result.error}.`);
    }
    const times = result.score.synthEvents.map((event) => event.timeSec);

    expect(times).toEqual(times.toSorted((a, b) => a - b));
    expect(result.score.synthEvents).toHaveLength(timelineOf(demo(name)).events.length);
    expect(result.score.presets.length).toBeGreaterThan(0);
    expect(result.score.beats.length).toBeGreaterThan(0);
  });

  it('builds the score of the largest demo in at most 100 ms (design 9.7)', () => {
    expect(buildTime(demo('boulanger-matin.mid'))).toBeLessThan(100);
  });
});

describe('the demo tests of design 8.5, after the changes of demos/patches.json', () => {
  const demos = new Map(DEMOS.map((file) => [file.file, file.bytes]));

  it.each(DEMO_CASES)('gives %s at most 60 players and the expected seats (%s)', (name, size) => {
    const result = buildScore(demos.get(name) ?? new Uint8Array(), size);
    if (!result.ok) {
      throw new Error(`The demo file was refused: ${result.error}.`);
    }
    const { seats } = result.score;
    const players = seats.reduce((sum, seat) => sum + seat.playerCount, 0);

    expect(players).toBeLessThanOrEqual(60);
    // No seat of another section, and no sound-only seat: no note has a wrong program.
    expect(seats.some((seat) => seat.section === 'sound-only')).toBe(false);
    expect([...seatCounts(seats)]).toEqual([...(EXPECTED_SECTIONS.get(name) ?? [])]);
    expect(result.score.orchestral).toBe(true);
    // The first track of each demo has a generic name: "control track" or "Conductor".
    expect(result.score.sequenceName).toBe('');
  });
});
