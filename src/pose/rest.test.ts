import { describe, expect, it } from 'vitest';

import { mulberry32 } from './random.ts';
import {
  FULL_PHASE,
  REST_PHASE,
  phaseWeight,
  restPhase,
  seatWeight,
  smoothstep,
  transportWeight,
} from './rest.ts';
import type { SeatAudibility, Transport } from './types.ts';

function transport(
  playing: boolean,
  changedAtWall: number | null,
  weightAtChange = 0,
  holdSec = 3,
): Transport {
  return { playing, changedAtWall, weightAtChange, startSec: 0, holdSec };
}

function seat(audible: boolean, changedAtWall: number, weightAtChange = 1): SeatAudibility {
  return { audible, changedAtWall, weightAtChange };
}

describe('transportWeight (design 5.2)', () => {
  it('keeps the rest pose before the first play', () => {
    expect(transportWeight(transport(false, null), 0)).toBe(0);
    expect(transportWeight(transport(false, null), 100)).toBe(0);
    expect(transportWeight(transport(false, 5), 6)).toBe(0);
    expect(transportWeight(transport(false, 5), 9)).toBe(0);
  });

  it('lifts the instruments in 0.3 s when play starts', () => {
    const t = transport(true, 10);
    expect(transportWeight(t, 10)).toBe(0);
    expect(transportWeight(t, 10.15)).toBeCloseTo(0.5, 9);
    expect(transportWeight(t, 10.3)).toBeCloseTo(1, 9);
    expect(transportWeight(t, 50)).toBe(1);
  });

  it('keeps the instruments up for 3 s after a pause, then lowers them in 0.6 s', () => {
    const t = transport(false, 20, 1);
    expect(transportWeight(t, 20)).toBe(1);
    expect(transportWeight(t, 23)).toBe(1);
    expect(transportWeight(t, 23.3)).toBeCloseTo(0.5, 9);
    expect(transportWeight(t, 23.6)).toBeCloseTo(0, 9);
    expect(transportWeight(t, 30)).toBe(0);
  });

  it('lowers the instruments at once after a pause in the count-in', () => {
    const t = transport(false, 20, 1, 0);
    expect(transportWeight(t, 20)).toBe(1);
    expect(transportWeight(t, 20.3)).toBeCloseTo(0.5, 9);
    expect(transportWeight(t, 21)).toBe(0);
  });

  it('keeps the instruments up when play starts again within 3 s of a pause', () => {
    const t = transport(true, 21, 1);
    expect(transportWeight(t, 21)).toBe(1);
    expect(transportWeight(t, 21.1)).toBe(1);
  });

  it('lifts from the weight at the change after a part of the lowering', () => {
    // The pause at 20 s lowered the instruments to 0.5 at 23.3 s.
    const t = transport(true, 23.3, 0.5);
    expect(transportWeight(t, 23.3)).toBeCloseTo(0.5, 9);
    expect(transportWeight(t, 23.45)).toBeCloseTo(1, 9);
  });

  it('pauses with the weight of a lift that did not end', () => {
    const t = transport(false, 10.15, 0.5);
    expect(transportWeight(t, 10.15)).toBeCloseTo(0.5, 9);
    expect(transportWeight(t, 13.15)).toBeCloseTo(0.5, 9);
    expect(transportWeight(t, 13.45)).toBeCloseTo(0, 9);
  });
});

describe('seatWeight (design 5.5)', () => {
  it('keeps a seat with no change in the playing pose', () => {
    expect(seatWeight(seat(true, 0), 100)).toBe(1);
  });

  it('lowers a silent seat in 0.6 s after the change', () => {
    const s = seat(false, 10);
    expect(seatWeight(s, 10)).toBe(1);
    expect(seatWeight(s, 10.3)).toBeCloseTo(0.5, 9);
    expect(seatWeight(s, 10.6)).toBeCloseTo(0, 9);
    expect(seatWeight(s, 20)).toBe(0);
  });

  it('lifts a seat that sounds again in 0.3 s', () => {
    const s = seat(true, 20, 0);
    expect(seatWeight(s, 20)).toBe(0);
    expect(seatWeight(s, 20.15)).toBeCloseTo(0.5, 9);
    expect(seatWeight(s, 20.3)).toBeCloseTo(1, 9);
  });

  it('lifts from the weight at the change after a short mute', () => {
    const s = seat(true, 10.3, 0.5);
    expect(seatWeight(s, 10.3)).toBeCloseTo(0.5, 9);
    expect(seatWeight(s, 10.45)).toBeCloseTo(1, 9);
  });

  it('lowers from the weight at the change after a short unmute', () => {
    const s = seat(false, 20.15, 0.5);
    expect(seatWeight(s, 20.15)).toBeCloseTo(0.5, 9);
    expect(seatWeight(s, 20.45)).toBeCloseTo(0, 9);
  });
});

describe('smoothstep', () => {
  it('eases from 0 to 1 with a flat start and end', () => {
    expect(smoothstep(-1)).toBe(0);
    expect(smoothstep(0)).toBe(0);
    expect(smoothstep(0.5)).toBe(0.5);
    expect(smoothstep(1)).toBe(1);
    expect(smoothstep(2)).toBe(1);
    expect(smoothstep(0.01)).toBeLessThan(0.001);
  });
});

describe('restPhase (design 5.2)', () => {
  it('gives a duration of 0.5 to 0.8 of the transport time, inside it', () => {
    const next = mulberry32(3);
    const spans: number[] = [];
    for (let i = 0; i < 1000; i++) {
      const phase = restPhase(next);
      const span = phase.to - phase.from;
      expect(phase.from).toBeGreaterThanOrEqual(0);
      expect(phase.to).toBeLessThanOrEqual(1);
      expect(span).toBeGreaterThanOrEqual(REST_PHASE.spanMin);
      expect(span).toBeLessThanOrEqual(REST_PHASE.spanMax);
      spans.push(span);
    }
    expect(Math.min(...spans)).toBeLessThan(0.52);
    expect(Math.max(...spans)).toBeGreaterThan(0.78);
  });

  it('spreads the start of the lift over the time that remains', () => {
    const next = mulberry32(4);
    const phases = Array.from({ length: 1000 }, () => restPhase(next));
    expect(Math.min(...phases.map((p) => p.from))).toBeLessThan(0.01);
    expect(Math.max(...phases.map((p) => p.from))).toBeGreaterThan(0.45);
    expect(Math.max(...phases.map((p) => p.to))).toBeGreaterThan(0.99);
  });
});

describe('phaseWeight (design 5.2)', () => {
  it('follows the linear weight with the full phase', () => {
    for (const w of [0, 0.2, 0.5, 0.9, 1]) {
      expect(phaseWeight(FULL_PHASE, w)).toBe(smoothstep(w));
    }
  });

  it('lifts a player from its start to its end of the linear weight', () => {
    const phase = { from: 0.25, to: 0.75 };
    expect(phaseWeight(phase, 0)).toBe(0);
    expect(phaseWeight(phase, 0.25)).toBe(0);
    expect(phaseWeight(phase, 0.5)).toBeCloseTo(0.5, 9);
    expect(phaseWeight(phase, 0.75)).toBe(1);
    expect(phaseWeight(phase, 1)).toBe(1);
    // A lift of 0.3 s starts 0.075 s after the play and ends 0.225 s after it.
    const play = transport(true, 10);
    expect(phaseWeight(phase, transportWeight(play, 10.075))).toBeCloseTo(0, 9);
    expect(phaseWeight(phase, transportWeight(play, 10.15))).toBeCloseTo(0.5, 9);
    expect(phaseWeight(phase, transportWeight(play, 10.225))).toBeCloseTo(1, 9);
    // A lowering of 0.6 s starts 0.15 s after the hold and ends 0.45 s after it.
    const pause = transport(false, 20, 1);
    expect(phaseWeight(phase, transportWeight(pause, 23.15))).toBeCloseTo(1, 9);
    expect(phaseWeight(phase, transportWeight(pause, 23.3))).toBeCloseTo(0.5, 9);
    expect(phaseWeight(phase, transportWeight(pause, 23.45))).toBeCloseTo(0, 9);
  });
});
