import { describe, expect, it } from 'vitest';

import { Vector3 } from 'three';

import { triangleNormal } from './mesh.ts';
import { tube } from './primitives.ts';
import { sweep } from './sweep.ts';
import type { SweepRing } from './sweep.ts';
import type { Vec3 } from './tuples.ts';

/**
 * Counts the edges of a corner list that do not have exactly two triangles. A closed solid has
 * none.
 *
 * @param corners The corner list.
 * @returns The count of open or shared edges.
 */
function openEdges(corners: readonly number[]): number {
  const key = (i: number): string =>
    [0, 1, 2].map((k) => (corners[i * 3 + k] ?? 0).toFixed(6)).join(',');
  const edges = new Map<string, number>();
  for (let t = 0; t < corners.length / 9; t++) {
    for (let k = 0; k < 3; k++) {
      const a = key(t * 3 + k);
      const b = key(t * 3 + ((k + 1) % 3));
      const edge = a < b ? `${a}|${b}` : `${b}|${a}`;
      edges.set(edge, (edges.get(edge) ?? 0) + 1);
    }
  }
  return [...edges.values()].filter((count) => count !== 2).length;
}

/**
 * Calculates the signed volume of a closed corner list. It is larger than 0 when the corners go
 * counterclockwise when seen from outside.
 *
 * @param corners The corner list.
 * @returns The volume.
 */
function volumeOf(corners: readonly number[]): number {
  let volume = 0;
  for (let t = 0; t < corners.length / 9; t++) {
    const at = (k: number): Vector3 =>
      new Vector3(corners[t * 9 + k * 3], corners[t * 9 + k * 3 + 1], corners[t * 9 + k * 3 + 2]);
    volume += at(0).dot(new Vector3().crossVectors(at(1), at(2))) / 6;
  }
  return volume;
}

/**
 * Makes the rings of a tube of radius 0.1 that goes along -z, bends by 90° around a quarter
 * circle of radius 0.12, and goes down, as a seated leg.
 *
 * @returns The rings.
 */
function bentRings(): SweepRing[] {
  const ring = (at: Vec3, axis: Vec3, turn: number): SweepRing => ({ at, axis, radius: 0.1, turn });
  const rings = [ring([0, 0, 0.3], [0, 0, -1], 0), ring([0, 0, 0.12], [0, 0, -1], 0.5)];
  for (const [k, degrees] of [30, 60].entries()) {
    const a = (degrees * Math.PI) / 180;
    rings.push(
      ring(
        [0, -0.12 + 0.12 * Math.cos(a), 0.12 - 0.12 * Math.sin(a)],
        [0, -Math.sin(a), -Math.cos(a)],
        k % 2,
      ),
    );
  }
  rings.push(ring([0, -0.12, 0], [0, -1, 0], 0.5), ring([0, -0.5, 0], [0, -1, 0], 0));
  return rings;
}

describe('sweep', () => {
  it('gives the triangles of tube() on a straight path along +y', () => {
    const rings = [
      { radius: 0.2, y: 0, turn: 0 },
      { radius: 0.25, y: 0.3, turn: 0.5 },
      { radius: 0.15, y: 0.7, turn: 0 },
      { radius: 0, y: 0.8, turn: 0.5 },
    ];
    const swept = sweep(
      rings.map(({ radius, y, turn }) => ({ at: [0, y, 0], axis: [0, 1, 0], radius, turn })),
      { sides: 10, side: [1, 0, 0] },
    );
    const expected = tube(rings, 10);

    expect(swept).toHaveLength(expected.length);
    for (const [i, value] of expected.entries()) {
      expect(swept[i], `${i}`).toBeCloseTo(value, 12);
    }
  });

  it('makes a bent tube closed, with outward triangles and no fold at the bend', () => {
    const corners = sweep(bentRings(), { sides: 10, side: [1, 0, 0] });

    // 5 steps between 6 rings, and two caps.
    expect(corners.length / 9).toBe(5 * 20 + 2 * 10);
    expect(openEdges(corners)).toBe(0);
    expect(volumeOf(corners)).toBeGreaterThan(0);

    // Each face turns away from the path: from the middle of its own step.
    const rings = bentRings();
    for (let t = 0; t < 100; t++) {
      const step = Math.floor(t / 20);
      const middle = new Vector3(...(rings[step]?.at ?? [0, 0, 0]))
        .add(new Vector3(...(rings[step + 1]?.at ?? [0, 0, 0])))
        .multiplyScalar(0.5);
      const centroid = new Vector3(
        ((corners[t * 9] ?? 0) + (corners[t * 9 + 3] ?? 0) + (corners[t * 9 + 6] ?? 0)) / 3,
        ((corners[t * 9 + 1] ?? 0) + (corners[t * 9 + 4] ?? 0) + (corners[t * 9 + 7] ?? 0)) / 3,
        ((corners[t * 9 + 2] ?? 0) + (corners[t * 9 + 5] ?? 0) + (corners[t * 9 + 8] ?? 0)) / 3,
      );
      const normal = new Vector3(...triangleNormal(corners, t));
      expect(normal.dot(centroid.sub(middle)), `${t}`).toBeGreaterThan(0);
    }
  });

  it('turns the rings with the path, with no twist around it', () => {
    const corners = sweep(bentRings(), { sides: 10, side: [1, 0, 0] });

    // The first corner of each ring of turn 0 lies across the path in the y-z plane, on the
    // outer side of the bend: up on the first ring, forward (-z) on the last ring.
    expect(corners.slice(0, 3)).toEqual([
      expect.closeTo(0, 12),
      expect.closeTo(0.1, 12),
      expect.closeTo(0.3, 12),
    ]);
    // The caps follow the steps, one triangle of each cap for each side. The second corner of
    // the first triangle of the last cap is the first corner of the last ring.
    const lastCap = (5 * 20 + 1) * 9;
    expect(corners.slice(lastCap + 3, lastCap + 6)).toEqual([
      expect.closeTo(0, 12),
      expect.closeTo(-0.5, 12),
      expect.closeTo(-0.1, 12),
    ]);
  });

  it('splits at a ring into two open sweeps with the triangles of one sweep', () => {
    const rings = bentRings();
    const options = { sides: 10, side: [1, 0, 0] } as const;
    const whole = sweep(rings, options);
    const first = sweep(rings.slice(0, 4), { ...options, end: 'open' });
    const second = sweep(rings.slice(3), { ...options, start: 'open' });

    expect(openEdges([...first, ...second])).toBe(0);
    expect([...first, ...second].toSorted((a, b) => a - b)).toEqual(
      whole.toSorted((a, b) => a - b),
    );
  });

  it('flattens the rings across the path and the side direction', () => {
    const corners = sweep(
      [
        { at: [0, 0, 0], axis: [0, 1, 0], radius: 0.2, turn: 0, flat: 0.5 },
        { at: [0, 1, 0], axis: [0, 1, 0], radius: 0.2, turn: 0, flat: 0.5 },
      ],
      { sides: 8, side: [1, 0, 0] },
    );
    const xs = corners.filter((_, i) => i % 3 === 0);
    const zs = corners.filter((_, i) => i % 3 === 2);

    expect(Math.max(...xs)).toBeCloseTo(0.2, 12);
    expect(Math.max(...zs)).toBeCloseTo(0.1, 12);
  });
});
