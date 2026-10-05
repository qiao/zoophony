import { describe, expect, it } from 'vitest';

import { axisAngle } from '../models/math.ts';
import type { Quat } from '../models/tuples.ts';
import { lastAtOrBefore, mix, mixRotation } from './blend.ts';

describe('mix', () => {
  it('mixes two points', () => {
    expect(mix([0, 0, 0], [2, 4, -2], 0.25)).toEqual([0.5, 1, -0.5]);
  });
});

describe('mixRotation', () => {
  it('gives the ends at the weights 0 and 1, and a unit rotation between', () => {
    const a = axisAngle([0, 1, 0], 0);
    const b = axisAngle([0, 1, 0], 1);
    expect(mixRotation(a, b, 0)).toEqual(a);
    for (const [i, value] of mixRotation(a, b, 1).entries()) {
      expect(value).toBeCloseTo(b[i] ?? 0, 12);
    }
    const half = mixRotation(a, b, 0.5);
    expect(Math.hypot(...half)).toBeCloseTo(1, 12);
    for (const [i, value] of half.entries()) {
      expect(value).toBeCloseTo(axisAngle([0, 1, 0], 0.5)[i] ?? 0, 12);
    }
  });

  it('takes the shorter path when the two quaternions point to opposite sides', () => {
    const a = axisAngle([0, 0, 1], 0.2);
    const b = axisAngle([0, 0, 1], 0.4);
    const negated: Quat = [-b[0], -b[1], -b[2], -b[3]];
    const half = mixRotation(a, negated, 0.5);
    const expected = axisAngle([0, 0, 1], 0.3);
    for (const [i, value] of half.entries()) {
      expect(value).toBeCloseTo(expected[i] ?? 0, 12);
    }
  });
});

describe('lastAtOrBefore', () => {
  const times = Float64Array.from([1, 2, 2, 5]);

  it('finds the last time at or before a time', () => {
    expect(lastAtOrBefore(times, 0.5)).toBe(-1);
    expect(lastAtOrBefore(times, 1)).toBe(0);
    expect(lastAtOrBefore(times, 2)).toBe(2);
    expect(lastAtOrBefore(times, 4.9)).toBe(2);
    expect(lastAtOrBefore(times, 9)).toBe(3);
    expect(lastAtOrBefore(new Float64Array(0), 1)).toBe(-1);
  });
});
