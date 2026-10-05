import { describe, expect, it } from 'vitest';

import { dot, normalize, sub } from './math.ts';
import type { Vec3 } from './tuples.ts';
import { triangleNormal } from './mesh.ts';
import { box, cylinder, icosphere, lathe, loft, prism, tube, wedge } from './primitives.ts';

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

  it('makes an icosphere of detail 1 with 80 outward triangles', () => {
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
    // The left half is the mirror image of the right half, triangle by triangle.
    const key = (t: number, mirror: number): string =>
      [0, 1, 2]
        .map((k) =>
          [0, 1, 2]
            .map((axis) =>
              (
                Math.round((corners[t * 9 + k * 3 + axis] ?? 0) * (axis === 0 ? mirror : 1) * 1e6) +
                0
              ).toString(),
            )
            .join(','),
        )
        .toSorted()
        .join(' ');
    const triangles = corners.length / 9;
    const plain = new Set(Array.from({ length: triangles }, (_, t) => key(t, 1)));
    for (let t = 0; t < triangles; t++) {
      expect(plain.has(key(t, -1))).toBe(true);
    }
  });

  it('makes triangle facets between rings that turn by half a segment', () => {
    const rings = [
      { y: 0, halfWidth: 0, front: 0, back: 0 },
      { y: 0.2, halfWidth: 0.5, front: 0.5, back: 0.5 },
      { y: 0.5, halfWidth: 0.6, front: 0.6, back: 0.6, turn: 0.5 },
      { y: 0.8, halfWidth: 0.4, front: 0.4, back: 0.4 },
    ];
    const corners = loft(rings, 8);
    // 8 triangles at the point, 16 for each of the two steps, and a cap of 8.
    expect(corners.length / 9).toBe(8 + 32 + 8);
    expect(inwardFaces(corners, [0, 0.4, 0])).toBe(0);
    // The turned ring has no corner at the front: its front corners are 22.5° to the sides.
    const front = Math.min(
      ...corners.filter((_, i) => i % 3 === 2 && Math.abs((corners[i - 1] ?? 0) - 0.5) < 1e-9),
    );
    expect(front).toBeCloseTo(-0.6 * Math.cos(Math.PI / 8), 9);
    // Each triangle between two rings has two corners on one ring and one on the other, and no
    // two triangles are in one plane, so the step has no flat quads.
    const normals = new Set<string>();
    for (let t = 8; t < 40; t++) {
      const n = normalize(triangleNormal(corners, t));
      normals.add(n.map((v) => Math.round(v * 1e6)).join(','));
    }
    expect(normals.size).toBe(32);
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

  it('makes a faceted tube with a turned middle ring and outward triangles', () => {
    const corners = tube(
      [
        { radius: 0.1, y: 0, turn: 0 },
        { radius: 0.12, y: 0.25, turn: 0.5 },
        { radius: 0.08, y: 0.5, turn: 0 },
      ],
      6,
    );
    expect(corners.length / 9).toBe(6 * 2 * 2 + 12);
    expect(inwardFaces(corners, [0, 0.25, 0])).toBe(0);
    // The middle ring has its corners between the corners of the end rings.
    const middle = [];
    for (let i = 0; i < corners.length; i += 3) {
      if (Math.abs((corners[i + 1] ?? 0) - 0.25) < 1e-9) {
        middle.push(Math.atan2(corners[i] ?? 0, corners[i + 2] ?? 0));
      }
    }
    for (const angle of middle) {
      const step = (angle / (2 * Math.PI)) * 6;
      expect(Math.abs(step - Math.round(step))).toBeCloseTo(0.5, 9);
    }
    // Each edge between two rings joins a corner to a nearest corner of the other ring, so that
    // the facets are triangles with no long diagonal.
    const near = Math.hypot(0.12 * Math.sin(Math.PI / 6), 0.12 * Math.cos(Math.PI / 6) - 0.1, 0.25);
    for (let t = 0; t < corners.length / 9; t++) {
      for (let k = 0; k < 3; k++) {
        const p = corners.slice(t * 9 + k * 3, t * 9 + k * 3 + 3);
        const q = corners.slice(t * 9 + ((k + 1) % 3) * 3, t * 9 + ((k + 1) % 3) * 3 + 3);
        const [px = 0, py = 0, pz = 0] = p;
        const [qx = 0, qy = 0, qz = 0] = q;
        if (Math.abs(py - qy) > 1e-9 && Math.min(py, qy) < 0.2) {
          expect(Math.hypot(px - qx, py - qy, pz - qz)).toBeLessThan(near + 1e-9);
        }
      }
    }
  });
});
