import { describe, expect, it } from 'vitest';

import { MathUtils } from 'three';
import {
  axisAngle,
  basisRotation,
  euler,
  invert,
  multiply,
  reject,
  rotate,
  rotationBetween,
} from './math.ts';
import type { Vec3 } from './tuples.ts';

function expectClose(actual: readonly number[], expected: readonly number[]): void {
  expect(actual).toHaveLength(expected.length);
  for (const [i, value] of expected.entries()) {
    expect(actual[i]).toBeCloseTo(value, 9);
  }
}

describe('rotate', () => {
  it('turns +x to -z with 90 degrees around +y', () => {
    expectClose(rotate(axisAngle([0, 1, 0], 90 * MathUtils.DEG2RAD), [1, 0, 0]), [0, 0, -1]);
  });

  it('applies the right factor of a product first', () => {
    const aroundX = axisAngle([1, 0, 0], 90 * MathUtils.DEG2RAD);
    const aroundY = axisAngle([0, 1, 0], 90 * MathUtils.DEG2RAD);
    // +z turns to +x around y, then +x stays on x.
    expectClose(rotate(multiply(aroundX, aroundY), [0, 0, 1]), [1, 0, 0]);
    // +z turns to -y around x, then -y stays on y.
    expectClose(rotate(multiply(aroundY, aroundX), [0, 0, 1]), [0, -1, 0]);
  });

  it('undoes a rotation with its inverse', () => {
    const q = euler(0.3, -1.1, 2.0);
    const v: Vec3 = [0.2, -0.7, 1.5];
    expectClose(rotate(invert(q), rotate(q, v)), v);
  });
});

describe('euler', () => {
  it('gives the quaternion of the XYZ order of three.js', () => {
    // three.js: new Quaternion().setFromEuler(new Euler(0.5, 1, 1.5, 'XYZ')).
    expectClose(
      euler(0.5, 1, 1.5),
      [0.47549814868872275, 0.19188947262442094, 0.6663847940267409, 0.5413051331545425],
    );
  });
});

describe('rotationBetween', () => {
  it('turns the first direction into the second', () => {
    const from: Vec3 = [0, -1, 0];
    const to: Vec3 = [0.6, 0, -0.8];
    expectClose(rotate(rotationBetween(from, to), from), to);
  });

  it('turns a direction into its opposite', () => {
    expectClose(rotate(rotationBetween([1, 0, 0], [-1, 0, 0]), [1, 0, 0]), [-1, 0, 0]);
  });
});

describe('basisRotation', () => {
  it('turns the x and y axes to the given axes', () => {
    const xAxis: Vec3 = [0, 0, -1];
    const yAxis: Vec3 = [Math.SQRT1_2, Math.SQRT1_2, 0];
    const q = basisRotation(xAxis, yAxis);
    expectClose(rotate(q, [1, 0, 0]), xAxis);
    expectClose(rotate(q, [0, 1, 0]), yAxis);
    expect(Math.hypot(...q)).toBeCloseTo(1, 9);
  });

  it('handles a half turn', () => {
    const q = basisRotation([-1, 0, 0], [0, -1, 0]);
    expectClose(rotate(q, [1, 0, 0]), [-1, 0, 0]);
    expectClose(rotate(q, [0, 1, 0]), [0, -1, 0]);
  });
});

describe('reject', () => {
  it('removes the part along the axis', () => {
    expectClose(reject([1, 2, 3], [0, 1, 0]), [1, 0, 3]);
  });
});
