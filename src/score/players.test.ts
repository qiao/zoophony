import { describe, expect, it } from 'vitest';

import { noteOff, noteOn, programChange, tempo, writeSmf } from '../midi/test-smf.ts';
import type { TestEvent, TestFile } from '../midi/test-smf.ts';
import { assignPlayers } from './players.ts';
import type { PlayerAssignment } from './players.ts';
import { assignSeats } from './seats.ts';
import { buildTimeline } from './timeline.ts';
import type { SectionSize } from './types.ts';

function cast(file: TestFile, sectionSize: SectionSize = 'auto'): PlayerAssignment {
  const result = buildTimeline(writeSmf(file));
  if (!result.ok) {
    throw new Error(`The test file was refused: ${result.error}.`);
  }
  return assignPlayers(result.timeline, assignSeats(result.timeline), sectionSize);
}

/** Makes a chord of notes from `tick` to `end`. */
function chord(
  tick: number,
  channel: number,
  keys: readonly number[],
  end = tick + 480,
): TestEvent[] {
  return [
    ...keys.map((key) => noteOn(tick, channel, key)),
    ...keys.map((key) => noteOff(end, channel, key)),
  ];
}

/** Joins lists of events into one track, sorted by tick with a stable sort. */
function track(...lists: readonly (readonly TestEvent[])[]): TestEvent[] {
  return lists.flat().toSorted((a, b) => a.tick - b.tick);
}

/** Makes a part: a program change at tick 0, then chords of quarter notes, one after another. */
function part(
  channel: number,
  program: number,
  ...chords: readonly (readonly number[])[]
): TestEvent[] {
  return track(
    [programChange(0, channel, program)],
    ...chords.map((keys, i) => chord(i * 480, channel, keys)),
  );
}

/** Lists the player count of each seat as text, for example "violin 4". */
function counts(result: PlayerAssignment): string[] {
  return result.seats.map((seat) => `${seat.section} ${seat.playerCount}`);
}

/** Lists the players of each note of one seat, as `pitch: players`. */
function players(result: PlayerAssignment, seatIndex = 0): string[] {
  const map = new Map<string, number[]>();
  for (const note of result.notes.filter((item) => item.seatIndex === seatIndex)) {
    const key = `${note.startSec} ${note.pitch}`;
    map.set(key, [...(map.get(key) ?? []), note.player]);
  }
  return [...map].map(([key, list]) => `${key.split(' ')[1]}: ${list.join(',')}`);
}

describe('assignPlayers', () => {
  it('gives a woodwind one player for each simultaneous note, highest note first', () => {
    const result = cast({ tracks: [part(0, 73, [72, 76], [74], [71, 79])] });

    expect(counts(result)).toEqual(['flute 2']);
    expect(players(result)).toEqual(['72: 1', '76: 0', '74: 0', '71: 1', '79: 0']);
  });

  it('gives a note the nearest free player while an earlier note still sounds', () => {
    const result = cast({
      tracks: [
        track(
          [programChange(0, 0, 73)],
          chord(0, 0, [72], 1920),
          chord(480, 0, [76]),
          chord(960, 0, [79, 77]),
        ),
      ],
    });

    expect(counts(result)).toEqual(['flute 3']);
    expect(players(result)).toEqual(['72: 0', '76: 1', '79: 1', '77: 2']);
  });

  it('counts an overlap of at most 50 ms as one note, for a legato or a grace note', () => {
    // At 120 BPM and 480 ticks for each quarter note, 1 tick is 1/960 s.
    const legato = (overlap: number): TestFile => ({
      tracks: [
        track(
          [tempo(0, 120), programChange(0, 0, 73)],
          chord(0, 0, [72], 480 + overlap),
          chord(480, 0, [74]),
        ),
      ],
    });

    expect(counts(cast(legato(47)))).toEqual(['flute 1']);
    expect(players(cast(legato(47)))).toEqual(['72: 0', '74: 0']);
    expect(counts(cast(legato(49)))).toEqual(['flute 2']);
  });

  it('gives one player to the piano, the harp, the timpani, and the mallets', () => {
    const result = cast({
      tracks: [
        part(0, 0, [60, 64, 67]),
        part(1, 46, [50, 62]),
        part(2, 47, [43, 50]),
        part(3, 13, [72, 76]),
      ],
    });

    expect(counts(result)).toEqual(['harp 1', 'piano 1', 'timpani 1', 'percussion 1']);
    expect(result.notes.every((note) => note.player === 0)).toBe(true);
  });

  it('gives a rhythm channel one player for each key group, in the order of design 3.8', () => {
    const result = cast({
      tracks: [track(chord(0, 9, [49, 81, 45]), chord(480, 9, [36, 54]))],
    });

    expect(counts(result)).toEqual(['timpani 1', 'percussion 3']);
    expect(players(result, 1)).toEqual(['49: 1', '81: 2', '36: 0', '54: 2']);
  });

  it('gives the sound-only seat no players and no player notes (design 3.5)', () => {
    const result = cast({ tracks: [part(0, 81, [60, 64]), part(1, 40, [70])] });

    expect(counts(result)).toEqual(['violin 1', 'sound-only 0']);
    expect(result.notes.map((note) => note.seatIndex)).toEqual([0]);
  });

  it('caps the players of each seat (design 3.8)', () => {
    const result = cast({
      tracks: [
        part(0, 73, [60, 62, 64, 65, 67]),
        part(1, 58, [30, 34]),
        part(2, 60, [50, 52, 54, 55, 57]),
      ],
    });
    const strings = cast({ tracks: [part(0, 40, [55, 57, 59, 60, 62, 64, 65, 67])] });

    expect(counts(result)).toEqual(['flute 3', 'horn 4', 'tuba 1']);
    expect(counts(strings)).toEqual(['violin 6']);
  });

  it('gives the techniques of the programs to the player notes (design 3.5)', () => {
    const file: TestFile = {
      tracks: [
        track(
          [programChange(0, 0, 40)],
          chord(0, 0, [60]),
          [programChange(480, 0, 45)],
          chord(480, 0, [62]),
          [programChange(960, 0, 44)],
          chord(960, 0, [64]),
        ),
      ],
    };
    const result = cast(file, 'one-per-part');

    expect(result.notes.map((note) => note.technique)).toEqual(['normal', 'pizzicato', 'tremolo']);
  });

  it.each<readonly [string, number, number, boolean]>([
    ['a flute seat', 73, 72, true],
    ['a horn seat', 60, 60, true],
    ['a timpani seat', 47, 45, true],
    ['the contrabass program 43', 43, 40, true],
    ['the ensemble program 48', 48, 60, true],
    ['the tremolo program 44', 44, 60, true],
    ['the pizzicato program 45', 45, 60, true],
    ['the bass guitar program 33', 33, 40, false],
    ['the piano program 0', 0, 60, false],
    ['the choir program 52', 52, 60, false],
  ])('makes a file with %s orchestral: %s', (_name, program, key, orchestral) => {
    const result = cast({ tracks: [[], part(0, 40, [70]), part(1, program, [key])] });

    expect(result.orchestral).toBe(orchestral);
    expect(result.seats[0]?.playerCount).toBe(orchestral ? 4 : 1);
  });

  it('does not count the Orchestra kit 48 of a rhythm channel as the ensemble program 48', () => {
    const result = cast({
      tracks: [[], part(0, 40, [70]), track([programChange(0, 9, 48)], chord(0, 9, [38]))],
    });

    expect(result.orchestral).toBe(false);
    expect(counts(result)).toEqual(['violin 1', 'percussion 1']);
  });

  it('gives the base sizes to the strings and the choir of an orchestral file (design 3.8)', () => {
    const result = cast({
      tracks: [
        [],
        part(0, 40, [70]),
        part(1, 41, [60]),
        part(2, 42, [50]),
        part(3, 43, [40]),
        part(4, 52, [60]),
      ],
    });

    expect(counts(result)).toEqual(['violin 4', 'viola 3', 'cello 3', 'contrabass 2', 'choir 8']);
    expect(players(result)).toEqual(['70: 0,1,2,3']);
  });

  it('follows the section size setting (design 3.8)', () => {
    const orchestral: TestFile = { tracks: [[], part(0, 40, [70, 74]), part(1, 73, [80])] };
    const other: TestFile = { tracks: [part(0, 40, [70, 74], [72])] };

    expect(counts(cast(orchestral, 'auto'))).toEqual(['violin 4', 'flute 1']);
    expect(counts(cast(orchestral, 'one-per-part'))).toEqual(['violin 2', 'flute 1']);
    expect(counts(cast(orchestral, 'full'))).toEqual(['violin 4', 'flute 1']);
    expect(counts(cast(other, 'auto'))).toEqual(['violin 2']);
    expect(counts(cast(other, 'full'))).toEqual(['violin 4']);
    expect(cast(other, 'full').orchestral).toBe(false);
  });

  it('divides the players of a section across the notes of a chord, highest first (divisi)', () => {
    const result = cast({
      tracks: [
        [],
        part(0, 40, [70], [70, 74], [70, 72, 74]),
        part(1, 41, [60, 64]),
        part(2, 73, [80]),
      ],
    });

    expect(players(result, 0)).toEqual([
      '70: 0,1,2,3',
      '70: 2,3',
      '74: 0,1',
      '70: 3',
      '72: 2',
      '74: 0,1',
    ]);
    expect(players(result, 1)).toEqual(['60: 2', '64: 0,1']);
  });

  it('gives a player two notes when a string seat has more notes than players (double stop)', () => {
    const result = cast({ tracks: [[], part(0, 42, [48, 50, 52, 55, 57]), part(1, 73, [80])] });

    expect(counts(result)).toEqual(['cello 3', 'flute 1']);
    expect(players(result)).toEqual(['48: 2', '50: 1', '52: 1', '55: 0', '57: 0']);
  });
});
