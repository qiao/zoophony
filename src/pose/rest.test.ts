import { describe, expect, it } from 'vitest';

import { seatWeight, smoothstep, transportWeight } from './rest.ts';
import type { SeatAudibility, Transport } from './types.ts';

function transport(playing: boolean, changedAtWall: number | null, weightAtChange = 0): Transport {
  return { playing, changedAtWall, weightAtChange };
}

function seat(
  audible: boolean,
  changedAtWall: number,
  previousChangeAtWall: number | null = null,
): SeatAudibility {
  return { audible, changedAtWall, previousChangeAtWall };
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
    const s = seat(true, 20, 10);
    expect(seatWeight(s, 20)).toBe(0);
    expect(seatWeight(s, 20.15)).toBeCloseTo(0.5, 9);
    expect(seatWeight(s, 20.3)).toBeCloseTo(1, 9);
  });

  it('lifts from the weight at the change after a short mute', () => {
    const s = seat(true, 10.3, 10);
    expect(seatWeight(s, 10.3)).toBeCloseTo(0.5, 9);
    expect(seatWeight(s, 10.45)).toBeCloseTo(1, 9);
  });

  it('lowers from the weight at the change after a short unmute', () => {
    const s = seat(false, 20.15, 20);
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
