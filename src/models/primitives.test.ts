import { describe, expect, it } from 'vitest';

import { dot, sub } from './math.ts';
import type { Vec3 } from './math.ts';
import { triangleNormal } from './mesh.ts';
import { box, cylinder, icosphere, lathe, loft, prism, wedge } from './primitives.ts';

function centroid(corners: readonly number[], t: number): Vec3 {
  const sum = (axis: number): number =>
    ((corners[t * 9 + axis] ?? 0) +
      (corners[t * 9 + 3 + axis] ?? 0) +
      (corners[t * 9 + 6 + axis] ?? 0)) /
    3;
  return [sum(0), sum(1), sum(2)];
}

/** Counts the triangles whose normal does not point away from an inner point of a convex solid. */
function inwardFaces(corners: readonly number[], inside: Vec3): number {
  let count = 0;
  for (let t = 0; t < corners.length / 9; t++) {
    if (dot(triangleNormal(corners, t), sub(centroid(corners, t), inside)) <= 0) {
      count++;
    }
  }
  return count;
}

describe('primitives', () => {
  it('makes a box of 12 outward triangles', () => {
    const corners = box(1, 2, 3);
    expect(corners.length / 9).toBe(12);
    expect(inwardFaces(corners, [0, 0, 0])).toBe(0);
    expect(Math.max(...corners.filter((_, i) => i % 3 === 2))).toBe(1.5);
  });

  it('makes a limb cylinder of 6 segments with 24 outward triangles (design 4.5)', () => {
    const corners = cylinder(0.1, 0.08, 0.5, 6);
    expect(corners.length / 9).toBe(24);
    expect(inwardFaces(corners, [0, 0.25, 0])).toBe(0);
  });

  it('makes a cone with no empty triangles', () => {
    const corners = cylinder(0.1, 0, 0.5, 6);
    expect(corners.length / 9).toBe(12);
    expect(inwardFaces(corners, [0, 0.1, 0])).toBe(0);
  });

  it('makes a head icosphere of detail 1 with 80 outward triangles (design 4.5)', () => {
    const corners = icosphere(0.5, 1);
    expect(corners.length / 9).toBe(80);
    expect(inwardFaces(corners, [0, 0, 0])).toBe(0);
    for (let i = 0; i < corners.length; i += 3) {
      expect(Math.hypot(corners[i] ?? 0, corners[i + 1] ?? 0, corners[i + 2] ?? 0)).toBeCloseTo(
        0.5,
        6,
      );
    }
  });

  it('makes a closed torso lathe of 8 segments with outward triangles (design 4.5)', () => {
    const corners = lathe(
      [
        [0, 0],
        [0.5, 0.2],
        [0.4, 1],
        [0, 1.3],
      ],
      8,
    );
    // The first and the last step lose the triangles at the radius 0.
    expect(corners.length / 9).toBe(8 + 16 + 8);
    expect(inwardFaces(corners, [0, 0.6, 0])).toBe(0);
  });

  it('makes a prism with outward triangles', () => {
    const outline = [
      [1, 0],
      [0, -1],
      [-1, 0],
      [0, 1],
    ] as const;
    const corners = prism(outline, -0.1, 0.1);
    expect(corners.length / 9).toBe(16);
    expect(inwardFaces(corners, [0, 0, 0])).toBe(0);
  });

  it('makes a closed loft with a corner at the front and outward triangles', () => {
    const corners = loft(
      [
        { y: 0, halfWidth: 0, front: 0, back: 0, z: -0.1 },
        { y: 0.3, halfWidth: 0.6, front: 0.45, back: 0.35 },
        { y: 0.8, halfWidth: 0.3, front: 0.25, back: 0.3 },
      ],
      8,
    );
    // The point loses one triangle of each segment, and the top ring gets a cap.
    expect(corners.length / 9).toBe(8 + 16 + 8);
    expect(inwardFaces(corners, [0, 0.4, 0])).toBe(0);
    const zs = corners.filter((_, i) => i % 3 === 2);
    expect(Math.min(...zs)).toBeCloseTo(-0.45, 9);
    expect(Math.max(...zs)).toBeCloseTo(0.35, 9);
  });

  it('makes a wedge of 12 outward triangles that slopes down to the front', () => {
    const corners = wedge(0.4, 0.2, 0.1, 0.6);
    expect(corners.length / 9).toBe(12);
    expect(inwardFaces(corners, [0, 0.05, 0])).toBe(0);
    let frontTop = 0;
    for (let i = 0; i < corners.length; i += 3) {
      if ((corners[i + 2] ?? 0) < 0) {
        frontTop = Math.max(frontTop, corners[i + 1] ?? 0);
      }
    }
    expect(frontTop).toBeCloseTo(0.1, 9);
  });
});
