import { BasicMIDI } from 'spessasynth_core';
import { describe, expect, it } from 'vitest';

import { buildBeats } from './beats.ts';
import { patchedDemos } from '../../tools/patch-demos.ts';
import { buildScore } from './score.ts';
import { timelineOf } from './test-score.ts';
import { SECTION_ORDER } from './types.ts';
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

/** Counts the seats of each section, in the order of `SECTION_ORDER`. */
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
 * The expected seats of the demos (design 8.5): the seat count of each section of each demo,
 * after the changes of `demos/patches.json` (8.3). The piano seat of the Boulanger demo is the
 * celesta, and the piano seat of the Bach demo is the harpsichord. The percussion seat of the
 * Beethoven 9 demo has the triangle, the cymbals, and the bass drum.
 */
const EXPECTED_SECTIONS: ReadonlyMap<string, ReadonlyMap<SectionId, number>> = new Map([
  ['mozart-k315.mid', sectionTable({ flute: 1, oboe: 1, horn: 1, violin: 2, viola: 1, cello: 1 })],
  [
    'beethoven-9.mid',
    sectionTable({
      flute: 1,
      oboe: 1,
      clarinet: 1,
      bassoon: 1,
      horn: 1,
      trumpet: 1,
      trombone: 1,
      timpani: 1,
      percussion: 1,
      choir: 1,
      violin: 2,
      viola: 1,
      cello: 1,
      contrabass: 1,
    }),
  ],
  ['mozart-k525.mid', sectionTable({ violin: 2, viola: 1, cello: 1 })],
  ['bach-bwv1048.mid', sectionTable({ piano: 1, violin: 3, viola: 1, cello: 1, contrabass: 1 })],
  [
    'beethoven-8.mid',
    sectionTable({
      flute: 1,
      oboe: 1,
      clarinet: 1,
      bassoon: 1,
      horn: 1,
      violin: 2,
      viola: 1,
      cello: 1,
      contrabass: 1,
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
  [
    'beethoven-1.mid',
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
  [
    'brahms-2.mid',
    sectionTable({
      flute: 1,
      oboe: 1,
      clarinet: 1,
      bassoon: 1,
      horn: 1,
      trumpet: 1,
      trombone: 1,
      tuba: 1,
      timpani: 1,
      violin: 2,
      viola: 1,
      cello: 1,
      contrabass: 1,
    }),
  ],
  [
    'beethoven-8-4.mid',
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
  [
    'bach-bwv1047.mid',
    sectionTable({
      flute: 1,
      oboe: 1,
      trumpet: 1,
      piano: 1,
      violin: 3,
      viola: 1,
      cello: 1,
    }),
  ],
  [
    'bach-bwv1050.mid',
    sectionTable({
      flute: 1,
      piano: 1,
      violin: 2,
      viola: 1,
      cello: 1,
      contrabass: 1,
    }),
  ],
  [
    'mendelssohn-op61.mid',
    sectionTable({
      flute: 1,
      oboe: 1,
      clarinet: 1,
      bassoon: 1,
      horn: 1,
      violin: 2,
      viola: 1,
      cello: 1,
      contrabass: 1,
    }),
  ],
  [
    'mozart-k417.mid',
    sectionTable({
      oboe: 1,
      horn: 2,
      violin: 2,
      viola: 1,
      cello: 1,
    }),
  ],
  [
    'mozart-k191.mid',
    sectionTable({
      oboe: 1,
      bassoon: 1,
      horn: 1,
      violin: 2,
      viola: 1,
      cello: 1,
    }),
  ],
  [
    'pachelbel-p37.mid',
    sectionTable({
      violin: 3,
      cello: 1,
    }),
  ],
  [
    'beethoven-5-4.mid',
    sectionTable({
      violin: 2,
      viola: 1,
      cello: 1,
      contrabass: 1,
      flute: 1,
      oboe: 1,
      clarinet: 1,
      bassoon: 1,
      horn: 1,
      trumpet: 1,
      trombone: 1,
      timpani: 1,
    }),
  ],
  [
    'beethoven-7-4.mid',
    sectionTable({
      violin: 2,
      viola: 1,
      cello: 1,
      contrabass: 1,
      flute: 1,
      oboe: 1,
      clarinet: 1,
      bassoon: 1,
      horn: 1,
      trumpet: 1,
      timpani: 1,
    }),
  ],
]);

/** Puts the seat counts of one row of the table in the order of `SECTION_ORDER`. */
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

  it('gives the length and the programs of the Beethoven 9 demo', () => {
    const bytes = demo('beethoven-9.mid');
    const result = timelineOf(bytes);
    const end = Math.max(...result.notes.map((note) => note.endSec));
    const programs = new Set(result.notes.map((note) => note.program));
    const reference = BasicMIDI.fromArrayBuffer(bytes.slice().buffer);

    // The excerpt ends with the last chord of the symphony at 158.298 s. spessasynth_core reads
    // the same length from the tempo map.
    expect(end).toBeCloseTo(158.3, 2);
    expect(end).toBeCloseTo(reference.duration, 2);
    // Strings, woodwinds, horns, trumpets, trombones, timpani, the choir, and the orchestral
    // kit 48 (design 8.4). The excerpt has no pizzicato.
    expect([...programs].toSorted((a, b) => a - b)).toEqual([
      40, 41, 42, 43, 47, 48, 52, 56, 57, 60, 68, 70, 71, 73,
    ]);
  });

  it.each<readonly [string, number]>([
    ['beethoven-8.mid', 2],
    ['mozart-k525.mid', 4],
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
    // Eine kleine Nachtmusik and the Canon have no contrabass part, no wind part, and no ensemble
    // program (design 3.8).
    expect(result.score.orchestral).toBe(!['mozart-k525.mid', 'pachelbel-p37.mid'].includes(name));
    // The first track of each demo has a generic name: "control track" or "Conductor".
    expect(result.score.sequenceName).toBe('');
  });

  it.each(FILES)('changes only the player counts of %s with the section size (3.8)', (name) => {
    // The app keeps the score of the Player after a change of the section size (2.8).
    const scores = (['auto', 'one-per-part', 'full'] as const).map((size) => {
      const result = buildScore(demos.get(name) ?? new Uint8Array(), size);
      if (!result.ok) {
        throw new Error(`The demo file was refused: ${result.error}.`);
      }
      const { seats, synthEvents, presets, durationSec, beats } = result.score;
      return {
        sound: { synthEvents, presets, durationSec, beats },
        seats: seats.map((seat) => ({ ...seat, playerCount: 0 })),
        players: seats.map((seat) => seat.playerCount),
      };
    });
    const [auto, one, full] = scores;
    expect(one?.sound).toEqual(auto?.sound);
    expect(full?.sound).toEqual(auto?.sound);
    expect(one?.seats).toEqual(auto?.seats);
    expect(full?.seats).toEqual(auto?.seats);
    expect(one?.players).not.toEqual(full?.players);
  });
});
