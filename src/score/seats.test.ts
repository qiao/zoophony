import { describe, expect, it } from 'vitest';

import { noteOff, noteOn, port, programChange, writeSmf } from '../midi/test-smf.ts';
import type { TestEvent, TestFile } from '../midi/test-smf.ts';
import { assignSeats } from './seats.ts';
import type { Seating } from './seats.ts';
import { buildTimeline } from './timeline.ts';
import type { Timeline } from './timeline.ts';

function timeline(file: TestFile): Timeline {
  const result = buildTimeline(writeSmf(file));
  if (!result.ok) {
    throw new Error(`The test file was refused: ${result.error}.`);
  }
  return result.timeline;
}

function seating(file: TestFile): Seating {
  return assignSeats(timeline(file));
}

/** Makes a note of one quarter note (480 ticks). */
function note(tick: number, channel: number, pitch: number): TestEvent[] {
  return [noteOn(tick, channel, pitch), noteOff(tick + 480, channel, pitch)];
}

/** Makes a chord of quarter notes. */
function chord(tick: number, channel: number, keys: readonly number[]): TestEvent[] {
  return [
    ...keys.map((key) => noteOn(tick, channel, key)),
    ...keys.map((key) => noteOff(tick + 480, channel, key)),
  ];
}

/** Makes a program change at tick 0 and one note at tick 0. */
function part(channel: number, program: number, pitch = 60): TestEvent[] {
  return [programChange(0, channel, program), ...note(0, channel, pitch)];
}

/** Joins lists of events into one track, sorted by tick with a stable sort. */
function track(...lists: readonly (readonly TestEvent[])[]): TestEvent[] {
  return lists.flat().toSorted((a, b) => a.tick - b.tick);
}

/** Lists the section and the sources of each seat as text, for example "violin 0:1 0:2". */
function summary(result: Seating): string[] {
  return result.seats.map((seat) =>
    [seat.section, ...seat.sources.map((source) => `${source.port}:${source.channel}`)].join(' '),
  );
}

describe('assignSeats', () => {
  it('keeps the seat at a program change inside a section (design 3.7)', () => {
    const result = seating({
      tracks: [
        [
          programChange(0, 0, 40),
          ...note(0, 0, 70),
          programChange(480, 0, 110),
          ...note(480, 0, 72),
        ],
      ],
    });

    expect(summary(result)).toEqual(['violin 0:0']);
    expect(result.seats[0]?.programs).toEqual([40, 110]);
    expect(result.noteSeats).toEqual([0, 0]);
  });

  it('starts a new seat at a program change to another section (design 3.7)', () => {
    const result = seating({
      tracks: [
        [
          programChange(0, 0, 40),
          ...note(0, 0, 70),
          programChange(480, 0, 42),
          ...note(480, 0, 50),
        ],
      ],
    });

    expect(summary(result)).toEqual(['violin 0:0', 'cello 0:0']);
    expect(result.noteSeats).toEqual([0, 1]);
  });

  it('gives one seat for each string section of an ensemble program (design 3.5, 3.7)', () => {
    const result = seating({
      tracks: [[programChange(0, 3, 48), ...chord(0, 3, [30, 40, 50, 60, 70])]],
    });

    expect(summary(result)).toEqual(['violin 0:3', 'viola 0:3', 'cello 0:3', 'contrabass 0:3']);
    expect(result.noteSeats).toEqual([3, 2, 1, 0, 0]);
  });

  it('orders the seats by section, then by the first (port, channel) (design 3.2, 3.7)', () => {
    const result = seating({
      tracks: [[], part(5, 40), part(3, 73), part(2, 40), part(1, 42)],
    });

    expect(summary(result)).toEqual(['violin 0:2', 'violin 0:5', 'cello 0:1', 'flute 0:3']);
    expect(result.seats.map((seat) => seat.indexInSection)).toEqual([0, 1, 0, 0]);
  });

  it('gives 44 and 45 the last earlier section of their channel (design 3.5)', () => {
    const result = seating({
      tracks: [
        [
          programChange(0, 0, 40),
          ...note(0, 0, 70),
          programChange(480, 0, 42),
          ...note(480, 0, 50),
          programChange(960, 0, 45),
          ...note(960, 0, 70),
          programChange(1440, 0, 44),
          ...note(1440, 0, 30),
        ],
      ],
    });

    expect(summary(result)).toEqual(['violin 0:0', 'cello 0:0']);
    expect(result.noteSeats).toEqual([0, 1, 1, 1]);
    expect(result.seats[1]?.programs).toEqual([42, 45, 44]);
  });

  it('gives 44 and 45 the next later section if the channel has no earlier one', () => {
    const result = seating({
      tracks: [
        [
          programChange(0, 0, 45),
          ...note(0, 0, 40),
          programChange(480, 0, 41),
          ...note(480, 0, 60),
        ],
      ],
    });

    expect(summary(result)).toEqual(['viola 0:0']);
    expect(result.seats[0]?.programs).toEqual([45, 41]);
  });

  it('divides 44 and 45 by the string bands if the channel has no other section', () => {
    const result = seating({
      tracks: [
        [programChange(0, 0, 42), ...note(0, 0, 50)],
        [programChange(0, 1, 44), ...chord(0, 1, [40, 70])],
      ],
    });

    expect(summary(result)).toEqual(['violin 0:1', 'cello 0:0', 'cello 0:1']);
    expect(result.noteSeats).toEqual([1, 2, 0]);
  });

  it('divides 44 and 45 by pitch after an ensemble program on the channel', () => {
    const result = seating({
      tracks: [
        [
          programChange(0, 0, 61),
          ...note(0, 0, 60),
          programChange(480, 0, 45),
          ...chord(480, 0, [40, 70]),
        ],
      ],
    });

    expect(summary(result)).toEqual(['violin 0:0', 'cello 0:0', 'horn 0:0']);
    expect(result.noteSeats).toEqual([2, 1, 0]);
  });

  it('puts all notes of the programs with no animal in one sound-only seat (design 3.5)', () => {
    const result = seating({
      tracks: [[], part(2, 81), part(0, 40), part(1, 80), part(3, 55)],
    });

    expect(summary(result)).toEqual(['violin 0:0', 'sound-only 0:1 0:2 0:3']);
    expect(result.seats[1]?.programs).toEqual([81, 80, 55]);
    expect(result.noteSeats).toEqual([1, 0, 1, 1]);
  });

  it('maps the keys of the Orchestra kit to the timpani and the percussion seats (design 3.6)', () => {
    const result = seating({
      tracks: [[programChange(0, 9, 48), ...chord(0, 9, [41, 49, 53, 35, 38, 57, 37, 54])]],
    });

    expect(summary(result)).toEqual(['timpani 0:9', 'percussion 0:9']);
    expect(result.noteSeats).toEqual([0, 0, 0, 1, 1, 1, 1, 1]);
    expect(result.seats.map((seat) => seat.programs)).toEqual([[48], [48]]);
  });

  it('maps the keys of the other kits with the GM1 map on the rhythm channel of each port', () => {
    const result = seating({
      tracks: [
        [port(0), ...chord(0, 9, [41, 49, 42])],
        [port(1), ...chord(0, 9, [36, 45])],
      ],
    });

    expect(summary(result)).toEqual(['timpani 0:9 1:9', 'percussion 0:9', 'percussion 1:9']);
    expect(result.noteSeats).toEqual([0, 1, 1, 2, 0]);
    expect(result.seats.map((seat) => seat.programs)).toEqual([[0], [0], [0]]);
  });

  it('gives one seat to all channels of the piano, the harp, and the timpani (design 3.7)', () => {
    const result = seating({
      tracks: [
        track([port(0)], part(4, 0, 70), part(2, 46)),
        track([port(0)], part(1, 47, 45), note(480, 9, 41)),
        track([port(1)], part(3, 8, 80), part(0, 24)),
        track([port(1)], part(2, 47, 55)),
      ],
    });

    expect(summary(result)).toEqual(['harp 0:2 1:0', 'piano 0:4 1:3', 'timpani 0:1 0:9 1:2']);
    expect(result.seats.map((seat) => seat.programs)).toEqual([
      [46, 24],
      [0, 8],
      [47, 0],
    ]);
  });

  it('merges the channels of one section in one track of a format 1 file (design 3.7)', () => {
    const events = track(part(0, 40, 70), part(1, 45, 70), part(2, 41), part(3, 40, 72));
    const result = seating({ format: 1, tracks: [[], events, part(4, 40)] });
    const unmerged = seating({ format: 0, tracks: [events] });

    expect(summary(result)).toEqual(['violin 0:0 0:1 0:3', 'violin 0:4', 'viola 0:2']);
    expect(result.seats[0]?.programs).toEqual([40, 45]);
    expect(summary(unmerged)).toEqual(['violin 0:0', 'violin 0:1', 'violin 0:3', 'viola 0:2']);
  });

  it('joins the merges of two tracks that share a channel', () => {
    const result = seating({
      tracks: [track(part(0, 40), part(1, 40)), track(note(480, 1, 60), part(2, 40))],
    });

    expect(summary(result)).toEqual(['violin 0:0 0:1 0:2']);
  });

  it('keeps a rhythm channel and a mallet channel of one track in two percussion seats', () => {
    const result = seating({ tracks: [[], track(part(3, 13), note(0, 9, 38))] });

    expect(summary(result)).toEqual(['percussion 0:3', 'percussion 0:9']);
  });
});
