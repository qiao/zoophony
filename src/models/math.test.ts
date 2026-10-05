import { describe, expect, it } from 'vitest';

import {
  DEG,
  applyTransform,
  axisAngle,
  euler,
  invert,
  multiply,
  rotate,
  rotationBetween,
  transform,
} from './math.ts';
import type { Vec3 } from './math.ts';

function expectClose(actual: readonly number[], expected: readonly number[]): void {
  expect(actual).toHaveLength(expected.length);
  for (const [i, value] of expected.entries()) {
    expect(actual[i]).toBeCloseTo(value, 9);
  }
}

describe('rotate', () => {
  it('turns +x to -z with 90 degrees around +y', () => {
    expectClose(rotate(axisAngle([0, 1, 0], 90 * DEG), [1, 0, 0]), [0, 0, -1]);
  });

  it('applies the right factor of a product first', () => {
    const aroundX = axisAngle([1, 0, 0], 90 * DEG);
    const aroundY = axisAngle([0, 1, 0], 90 * DEG);
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

describe('applyTransform', () => {
  it('scales, then rotates, then moves a point', () => {
    const t = transform([1, 2, 3], axisAngle([0, 0, 1], 90 * DEG), [2, 1, 1]);
    // (1, 0, 0) scales to (2, 0, 0), turns to (0, 2, 0), and moves to (1, 4, 3).
    expectClose(applyTransform(t, [1, 0, 0]), [1, 4, 3]);
  });
});
