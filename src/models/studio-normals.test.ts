import { describe, expect, it } from 'vitest';

import { FINISH_ORDER } from './mesh.ts';
import type { Finish } from './mesh.ts';
import { unpackStudioMesh } from './studio-format.ts';
import type { StudioMesh } from './studio-format.ts';
import { studioNormals } from './studio-normals.ts';
import { STUDIO_RABBIT } from './studio/rabbit.ts';

/**
 * Makes two triangles that share the edge from (0, 0, 0) to (1, 0, 0): one on the floor, facing
 * up, and one that turns up from the far side of the edge by a fold angle.
 *
 * @param fold The angle between the normals of the two faces, in degrees.
 * @param finishes The finish of each face.
 * @returns The mesh.
 */
function hinge(
  fold: number,
  finishes: readonly [Finish, Finish] = ['matte', 'matte'],
): Pick<StudioMesh, 'positions' | 'corners' | 'finishes'> {
  const turn = (fold * Math.PI) / 180;
  return {
    // The vertices: the two ends of the edge, a point on the floor, and a point of the fold.
    positions: Float32Array.from([
      0,
      0,
      0,
      1,
      0,
      0,
      0.5,
      0,
      1,
      0.5,
      Math.sin(turn),
      -Math.cos(turn),
    ]),
    corners: Uint32Array.from([0, 2, 1, 0, 1, 3]),
    finishes: Uint8Array.from(finishes, (finish) => FINISH_ORDER.indexOf(finish)),
  };
}

/**
 * Gives the normal of a corner.
 *
 * @param normals The normals of the corners.
 * @param c The corner.
 * @returns The normal.
 */
function normalOf(normals: Float32Array, c: number): [number, number, number] {
  return [normals[c * 3] ?? 0, normals[c * 3 + 1] ?? 0, normals[c * 3 + 2] ?? 0];
}

/**
 * Gives the angle between two unit vectors, in degrees.
 *
 * @param a The first vector.
 * @param b The second vector.
 * @returns The angle.
 */
function angle(a: readonly number[], b: readonly number[]): number {
  const dot = (a[0] ?? 0) * (b[0] ?? 0) + (a[1] ?? 0) * (b[1] ?? 0) + (a[2] ?? 0) * (b[2] ?? 0);
  return (Math.acos(Math.min(1, Math.max(-1, dot))) * 180) / Math.PI;
}

describe('studioNormals (design 4.4, 4.5)', () => {
  it('gives the corners of an edge below the crease angle one normal between the two faces', () => {
    const normals = studioNormals(hinge(20), 35);
    // Corner 0 of the floor face and corner 3 of the folded face are the same vertex.
    expect(angle(normalOf(normals, 0), normalOf(normals, 3))).toBeLessThan(0.05);
    expect(angle(normalOf(normals, 0), [0, 1, 0])).toBeGreaterThan(5);
    expect(angle(normalOf(normals, 0), [0, 1, 0])).toBeLessThan(15);
  });

  it('keeps an edge above the crease angle sharp, with the normal of each face', () => {
    const normals = studioNormals(hinge(50), 35);
    expect(angle(normalOf(normals, 0), [0, 1, 0])).toBeLessThan(0.05);
    expect(angle(normalOf(normals, 0), normalOf(normals, 3))).toBeCloseTo(50, 3);
  });

  it('keeps each face of another finish flat, and does not count it for a matte face', () => {
    const normals = studioNormals(hinge(20, ['matte', 'lacquer']), 35);
    for (const c of [0, 1, 2]) {
      expect(angle(normalOf(normals, c), [0, 1, 0])).toBeLessThan(0.05);
    }
    expect(angle(normalOf(normals, 3), normalOf(normals, 5))).toBeLessThan(0.05);
    expect(angle(normalOf(normals, 3), [0, 1, 0])).toBeCloseTo(20, 3);
  });

  it('gives each corner of the rabbit a unit normal within the crease angle of its face', () => {
    const mesh = unpackStudioMesh(STUDIO_RABBIT.mesh);
    const crease = 40;
    const normals = studioNormals(mesh, crease);
    const flat = studioNormals(mesh, 0);
    let smoothed = 0;
    for (let c = 0; c < mesh.corners.length; c++) {
      const normal = normalOf(normals, c);
      expect(Math.hypot(...normal)).toBeCloseTo(1, 5);
      const turn = angle(normal, normalOf(flat, c));
      expect(turn).toBeLessThanOrEqual(crease + 1e-3);
      if (turn > 1) {
        smoothed++;
      }
    }
    expect(smoothed).toBeGreaterThan(mesh.corners.length / 2);
  });
});
