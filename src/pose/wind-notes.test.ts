import { describe, expect, it } from 'vitest';

import type { PlayerNote } from '../score/types.ts';
import {
  BRASS_FUNDAMENTALS,
  WIND_MOTION,
  buildWindTrack,
  createWindState,
  holesClosed,
  semitonesBelowPartial,
  slidePosition,
  windNotes,
  windStateAt,
} from './wind-notes.ts';
import type { WindState } from './wind-notes.ts';

/** Makes a note of player 0 of seat 0. */
function n(startSec: number, endSec: number, pitch: number): PlayerNote {
  return { seatIndex: 0, player: 0, pitch, velocity: 100, startSec, endSec, technique: 'normal' };
}

function stateAt(track: ReturnType<typeof buildWindTrack>, time: number): WindState {
  const state = createWindState();
  windStateAt(track, time, state);
  return state;
}

describe('slidePosition', () => {
  it('gives the trombone positions on the partials of B♭1', () => {
    expect(slidePosition(58)).toBe(1); // B♭3
    expect(slidePosition(57)).toBe(2); // A3
    expect(slidePosition(53)).toBe(1); // F3
    expect(slidePosition(52)).toBe(2); // E3
    expect(slidePosition(46)).toBe(1); // B♭2
    expect(slidePosition(40)).toBe(7); // E2
    expect(slidePosition(34)).toBe(1); // the pedal B♭1
    expect(slidePosition(37)).toBe(7); // below the reach of the slide
  });
});

describe('semitonesBelowPartial', () => {
  it('gives the valves of the trumpet: none on a partial, more below it', () => {
    const f = BRASS_FUNDAMENTALS.trumpet;
    expect(semitonesBelowPartial(58, f)).toBe(0); // B♭3
    expect(semitonesBelowPartial(57, f)).toBe(1);
    expect(semitonesBelowPartial(55, f)).toBe(3);
    expect(semitonesBelowPartial(52, f)).toBe(6); // E3: all three valves
    expect(semitonesBelowPartial(100, f)).toBe(0);
  });
});

describe('holesClosed', () => {
  it('gives each pitch class of an octave its own shape of the hands', () => {
    const fingerings = new Set(
      Array.from({ length: 12 }, (_, pc) => holesClosed(60 + pc).join(' ')),
    );
    expect(fingerings.size).toBe(12);
    expect(holesClosed(60)).toEqual([1, 1]);
    expect(holesClosed(72)).toEqual(holesClosed(60));
  });
});

describe('windNotes (a wind player shows one note)', () => {
  it('shows the highest note of a chord', () => {
    expect(windNotes([n(1, 2, 60), n(1.03, 2.5, 67), n(1.04, 2, 64)])).toEqual([
      { start: 1, end: 2.5, pitch: 67 },
    ]);
  });

  it('shows the last note that started, while an earlier note still sounds', () => {
    expect(windNotes([n(1, 3, 72), n(1.5, 2, 60)])).toEqual([
      { start: 1, end: 3, pitch: 72 },
      { start: 1.5, end: 2, pitch: 60 },
    ]);
  });
});

describe('windStateAt (design 5.3)', () => {
  const notes = [n(1, 1.4, 60), n(1.5, 1.9, 65), n(1.53, 1.9, 62), n(3, 4, 67)];
  const track = buildWindTrack(notes, 'holes', 0);

  it('moves the fingers in the last 60 ms before a note, so that they arrive at its start', () => {
    const [startL] = holesClosed(60);
    const [, endR] = holesClosed(65);
    expect(stateAt(track, 1.5 - WIND_MOTION.fingerSec - 0.001).fingersR).toBeCloseTo(
      holesClosed(60)[1],
      6,
    );
    const middle = stateAt(track, 1.47).fingersR;
    expect(middle).toBeLessThan(holesClosed(60)[1]);
    expect(middle).toBeGreaterThan(endR);
    expect(stateAt(track, 1.5).fingersR).toBeCloseTo(endR, 6);
    expect(stateAt(track, 0).fingersL).toBe(startL);
  });

  it('breathes in during the 0.4 s before a phrase, and out over the phrase', () => {
    expect(stateAt(track, 0.5).breath).toBe(0);
    expect(stateAt(track, 0.8).breath).toBeGreaterThan(0.3);
    expect(stateAt(track, 1).breath).toBeCloseTo(1, 9);
    expect(stateAt(track, 1.5).breath).toBeLessThan(1);
    // A rest of 1.1 s starts a new phrase at 3 s.
    expect(stateAt(track, 2.5).breath).toBe(0);
    expect(stateAt(track, 2.8).breath).toBeGreaterThan(0.3);
    expect(stateAt(track, 3).breath).toBeCloseTo(1, 9);
  });

  it('moves the trombone slide in the last 0.1 s before a note', () => {
    const slide = buildWindTrack([n(1, 1.4, 58), n(2, 2.4, 40)], 'slide', 34);
    expect(stateAt(slide, 1.5).slide).toBe(0);
    expect(stateAt(slide, 2 - WIND_MOTION.slideSec).slide).toBeCloseTo(0, 9);
    expect(stateAt(slide, 1.95).slide).toBeGreaterThan(0.2);
    expect(stateAt(slide, 2).slide).toBeCloseTo(1, 9);
  });
});
