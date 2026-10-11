import { describe, expect, it } from 'vitest';
import {
  MAX_BLEND,
  PACKED_STEP,
  UV_STEPS,
  WEIGHT_STEPS,
  packCoordinate,
  packMesh,
  unpackMesh,
} from './packed-mesh.ts';
import type { PackedVertex } from './packed-mesh.ts';

/** Makes a vertex at a place in meters with a skin and skin coordinates. */
function vertex(
  place: readonly [number, number, number],
  bone = 0,
  blendBone = bone,
  blendStep = 0,
  uv: readonly [number, number] = [0, 0],
): PackedVertex {
  return {
    steps: [packCoordinate(place[0]), packCoordinate(place[1]), packCoordinate(place[2])],
    bone,
    blendBone,
    blendStep,
    uv: [Math.round(uv[0] * UV_STEPS), Math.round(uv[1] * UV_STEPS)],
  };
}

describe('the packed mesh of a rigged body', () => {
  it('reads back the places, the skins, the corners, and the skin coordinates', () => {
    const vertices = [
      vertex([0, 0, 0], 1, 1, 0, [0.25, 0.75]),
      vertex([0.5, -0.25, 1.75], 2, 3, WEIGHT_STEPS, [1, 0]),
      vertex([-0.5, 1, -0.125], 4, 1, 51, [0.125, 0.5]),
      vertex([3, 3, 3], 5),
    ];
    const mesh = unpackMesh(packMesh(vertices, [0, 1, 2, 2, 1, 0]));

    expect([...mesh.positions]).toEqual([0, 0, 0, 0.5, -0.25, 1.75, -0.5, 1, -0.125]);
    expect([...mesh.bones]).toEqual([1, 2, 4]);
    expect([...mesh.blendBones]).toEqual([1, 3, 1]);
    expect(mesh.blendWeights[1]).toBeCloseTo(MAX_BLEND, 6);
    expect(mesh.blendWeights[2]).toBeCloseTo(0.1, 6);
    expect([...mesh.corners]).toEqual([0, 1, 2, 2, 1, 0]);
    expect([...mesh.uvs]).toEqual([0.25, 0.75, 1, 0, 0.125, 0.5]);
  });

  it('keeps the vertices in the order of their first use and drops the unused ones', () => {
    const vertices = [vertex([1, 0, 0], 1), vertex([0, 1, 0], 2), vertex([0, 0, 1], 3)];
    const mesh = unpackMesh(packMesh(vertices, [2, 0, 1]));

    expect([...mesh.bones]).toEqual([3, 1, 2]);
    expect([...mesh.corners]).toEqual([0, 1, 2]);
  });

  it('rounds the two sides of 0 to mirror places', () => {
    const half = PACKED_STEP * 0.5;
    expect(packCoordinate(0.3 + half)).toBe(-packCoordinate(-0.3 - half));
    expect(Object.is(packCoordinate(-0), 0)).toBe(true);
  });

  it('packs a mesh with more bytes than one call of fromCharCode takes', () => {
    const vertices = Array.from({ length: 30_000 }, (_, i) => vertex([i * 0.01, 0, 0], i % 7));
    const triangles = Array.from({ length: 30_000 }, (_, i) => i);
    const mesh = unpackMesh(packMesh(vertices, triangles));

    expect(mesh.positions[29_999 * 3]).toBeCloseTo(299.99, 6);
    expect(mesh.corners).toHaveLength(30_000);
  });

  it('refuses a triangle that names a vertex that does not exist', () => {
    expect(() => packMesh([vertex([0, 0, 0])], [0, 0, 1])).toThrow(/vertex 1/);
  });
});
