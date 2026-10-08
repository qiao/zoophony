import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { convexHull } from './hull.ts';
import { triangleNormal } from './mesh.ts';
import type { Vec3 } from './tuples.ts';

/**
 * Gives the corners of a corner list as points.
 *
 * @param corners The corner list.
 * @returns One point for each corner.
 */
function cornersOf(corners: readonly number[]): Vector3[] {
  const out: Vector3[] = [];
  for (let i = 0; i < corners.length; i += 3) {
    out.push(new Vector3(corners[i] ?? 0, corners[i + 1] ?? 0, corners[i + 2] ?? 0));
  }
  return out;
}

/**
 * Gives the volume inside a closed corner list.
 *
 * @param corners The corner list, counterclockwise from outside.
 * @returns The volume.
 */
function volumeOf(corners: readonly number[]): number {
  let volume = 0;
  const points = cornersOf(corners);
  for (let i = 0; i + 2 < points.length; i += 3) {
    const [a, b, c] = [points[i], points[i + 1], points[i + 2]];
    if (a && b && c) {
      volume += a.dot(new Vector3().crossVectors(b, c)) / 6;
    }
  }
  return volume;
}

describe('convexHull', () => {
  const cube: Vec3[] = [-1, 1].flatMap((x) =>
    [-1, 1].flatMap((y) => [-1, 1].map((z): Vec3 => [x, y, z])),
  );

  it.each([
    ['in order', [[0, 0, 0], ...cube, [0.5, -0.2, 0.3]]],
    ['in the reverse order', [[0, 0, 0], ...cube.toReversed(), [0.5, -0.2, 0.3]]],
  ] as const)('makes a closed solid with the faces out, from points %s', (_, points) => {
    const hull = convexHull(points);

    // A cube has 6 square faces of 2 triangles. The points inside add no corner.
    expect(hull.length / 9).toBe(12);
    expect(volumeOf(hull)).toBeCloseTo(8, 9);
    for (let t = 0; t < hull.length / 9; t++) {
      const normal = new Vector3(...triangleNormal(hull, t));
      const center = cornersOf(hull.slice(t * 9, t * 9 + 9))
        .reduce((sum, p) => sum.add(p), new Vector3())
        .divideScalar(3);
      expect(normal.dot(center)).toBeGreaterThan(0);
    }
    for (const p of cornersOf(hull)) {
      expect(Math.max(Math.abs(p.x), Math.abs(p.y), Math.abs(p.z))).toBe(1);
    }
  });

  it('gives the same solid for each order of the points', () => {
    // A corner of the unit cube and the far corner: a solid of two tetrahedra, 0.5 in volume.
    const points: Vec3[] = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
      [0, 0, 0],
      [1, 1, 1],
    ];
    for (const order of [points, points.toReversed()]) {
      const hull = convexHull(order);
      expect(hull.length / 9).toBe(6);
      expect(volumeOf(hull)).toBeCloseTo(0.5, 9);
    }
  });

  it('keeps the points on a face plane on that plane, so that the face stays flat', () => {
    // The point in the middle of the top face adds no volume, and each triangle of the top is
    // flat.
    const hull = convexHull([...cube, [0, 1, 0], [0.3, 1, -0.6]]);
    expect(volumeOf(hull)).toBeCloseTo(8, 9);
    for (let t = 0; t < hull.length / 9; t++) {
      const ys = [1, 4, 7].map((k) => hull[t * 9 + k] ?? 0);
      if (ys.some((y) => y === 1) && ys.some((y) => y !== 1)) {
        expect(new Vector3(...triangleNormal(hull, t)).normalize().y).toBeCloseTo(0, 9);
      }
    }
  });

  it('refuses points on one plane', () => {
    expect(() =>
      convexHull([
        [0, 0, 0],
        [1, 0, 0],
        [0, 0, 1],
        [1, 0, 1],
      ]),
    ).toThrow();
  });
});
