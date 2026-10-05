import { describe, expect, it } from 'vitest';

import { Quaternion, Vector3 } from 'three';

import { lastAtOrBefore, mixRotation } from './blend.ts';

const Y_AXIS = new Vector3(0, 1, 0);
const Z_AXIS = new Vector3(0, 0, 1);

/**
 * Makes a turn around an axis.
 *
 * @param axis The unit axis.
 * @param angle The angle, in radians.
 * @returns The rotation.
 */
function turn(axis: Vector3, angle: number): Quaternion {
  return new Quaternion().setFromAxisAngle(axis, angle);
}

function expectClose(actual: Quaternion, expected: Quaternion): void {
  for (const [i, value] of expected.toArray().entries()) {
    expect(actual.toArray()[i]).toBeCloseTo(value, 12);
  }
}

describe('mixRotation', () => {
  it('gives the ends at the weights 0 and 1, and a unit rotation between', () => {
    const a = turn(Y_AXIS, 0);
    const b = turn(Y_AXIS, 1);
    expect(mixRotation(a, b, 0, new Quaternion())).toEqual(a);
    expectClose(mixRotation(a, b, 1, new Quaternion()), b);
    const half = mixRotation(a, b, 0.5, new Quaternion());
    expect(half.length()).toBeCloseTo(1, 12);
    expectClose(half, turn(Y_AXIS, 0.5));
  });

  it('takes the shorter path when the two quaternions point to opposite sides', () => {
    const a = turn(Z_AXIS, 0.2);
    const b = turn(Z_AXIS, 0.4);
    const negated = new Quaternion(-b.x, -b.y, -b.z, -b.w);
    expectClose(mixRotation(a, negated, 0.5, new Quaternion()), turn(Z_AXIS, 0.3));
  });

  it('writes the mix into one of its inputs', () => {
    const a = turn(Z_AXIS, 0.2);
    const b = turn(Z_AXIS, 0.4);
    expectClose(mixRotation(a, b, 0.5, b), turn(Z_AXIS, 0.3));
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
