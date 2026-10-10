import { describe, expect, it } from 'vitest';

import { MathUtils, Quaternion, Vector3 } from 'three';
import { toQuat } from './tuples.ts';
import {
  FINISH_ORDER,
  MeshBuilder,
  applyTransform,
  blendSkin,
  splitByCentroid,
  splitByFacing,
  splitByField,
  srgb,
  transform,
  triangleNormal,
} from './mesh.ts';
import { box, loft } from './primitives.ts';
import { volumeOf } from './test-limbs.ts';
import type { Vec3 } from './tuples.ts';

describe('srgb', () => {
  it('converts a hex color to linear values', () => {
    const [r, g, b] = srgb('#ff8000');
    expect(r).toBe(1);
    expect(g).toBeCloseTo(0.2158605, 6);
    expect(b).toBe(0);
  });
});

describe('applyTransform', () => {
  it('scales, then rotates, then moves a point', () => {
    const turn = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), 90 * MathUtils.DEG2RAD);
    const t = transform([1, 2, 3], toQuat(turn), [2, 1, 1]);
    // (1, 0, 0) scales to (2, 0, 0), turns to (0, 2, 0), and moves to (1, 4, 3).
    const [x, y, z] = applyTransform(t, [1, 0, 0]);
    expect(x).toBeCloseTo(1, 9);
    expect(y).toBeCloseTo(4, 9);
    expect(z).toBeCloseTo(3, 9);
  });
});

describe('MeshBuilder', () => {
  it('keeps the parts in order, with the color, the bone, and the finish of each triangle', () => {
    const builder = new MeshBuilder();
    builder.add(box(1, 1, 1), { color: [0, 0, 1], finish: 'metal', bone: 3 });
    builder.add(box(1, 1, 1), { color: [1, 0, 0], bone: 2 });
    const mesh = builder.build();

    expect(builder.triangleCount).toBe(24);
    expect(mesh.positions).toHaveLength(24 * 9);
    expect(mesh.finishes).toHaveLength(24);
    expect(mesh.finishes[0]).toBe(FINISH_ORDER.indexOf('metal'));
    expect(mesh.finishes.at(-1)).toBe(FINISH_ORDER.indexOf('matte'));
    expect(mesh.colors[2]).toBe(1);
    expect(mesh.colors.at(-3)).toBe(1);
    expect(mesh.bones[0]).toBe(3);
    expect(mesh.bones.at(-1)).toBe(2);
  });

  it('makes a part with no skin rule rigid: its second bone is its bone, with the weight 0', () => {
    const builder = new MeshBuilder();
    builder.add(box(1, 1, 1), { color: [1, 1, 1], bone: 3 });
    const mesh = builder.build();

    expect(mesh.blendBones).toHaveLength(36);
    expect(mesh.blendWeights).toHaveLength(36);
    expect([...mesh.blendBones]).toEqual([...mesh.bones]);
    expect(mesh.blendWeights.every((w) => w === 0)).toBe(true);
  });

  it('gives each corner of a skinned part the skin of its placed position', () => {
    const builder = new MeshBuilder();
    builder.add(box(1, 1, 1), { color: [1, 1, 1], bone: 3 });
    // The box moves up by 1, so its corners are at y = 0.5 and y = 1.5. The rule blends the
    // lower corners to bone 6 with the weight 0.25, and the upper corners follow bone 5 alone.
    // The bone 9 of the part has no effect.
    builder.add(box(1, 1, 1), {
      color: [1, 1, 1],
      bone: 9,
      at: transform([0, 1, 0]),
      skin: ([, y]) =>
        y < 1
          ? { bone: 4, blendBone: 6, blendWeight: 0.25 }
          : { bone: 5, blendBone: 4, blendWeight: 0 },
    });
    const mesh = builder.build();

    for (let c = 36; c < 72; c++) {
      const low = (mesh.positions[c * 3 + 1] ?? 0) < 1;
      expect(mesh.bones[c]).toBe(low ? 4 : 5);
      expect(mesh.blendBones[c]).toBe(low ? 6 : 5);
      expect(mesh.blendWeights[c]).toBe(low ? 0.25 : 0);
    }
  });

  it('refuses a skin rule with a second weight above 0.5', () => {
    const builder = new MeshBuilder();
    expect(() =>
      builder.add(box(1, 1, 1), {
        color: [1, 1, 1],
        skin: () => ({ bone: 1, blendBone: 2, blendWeight: 0.75 }),
      }),
    ).toThrow('0.75');
  });

  it('keeps the faces outside under a mirror scale', () => {
    const builder = new MeshBuilder();
    builder.add(box(1, 1, 1), {
      color: [1, 1, 1],
      at: transform([5, 0, 0], undefined, [-1, 1, 1]),
    });
    const positions = [...builder.build().positions];
    for (let t = 0; t < 12; t++) {
      const n = new Vector3(...triangleNormal(positions, t));
      const center = [0, 1, 2].map(
        (axis) =>
          ((positions[t * 9 + axis] ?? 0) +
            (positions[t * 9 + 3 + axis] ?? 0) +
            (positions[t * 9 + 6 + axis] ?? 0)) /
          3,
      );
      const outward = new Vector3((center[0] ?? 0) - 5, center[1] ?? 0, center[2] ?? 0);
      expect(n.dot(outward)).toBeGreaterThan(0);
    }
  });
});

describe('MeshBuilder.addMesh', () => {
  it('places a built mesh and keeps its colors, bones, and finishes', () => {
    const part = new MeshBuilder();
    part.add(box(1, 1, 1), { color: [0, 1, 0], finish: 'metal', bone: 4 });
    part.add(box(1, 1, 1), { color: [1, 0, 0], finish: 'lacquer', bone: 2 });
    const data = part.build();
    const merged = new MeshBuilder();
    merged.add(box(1, 1, 1), { color: [0, 0, 1], finish: 'varnish' });
    merged.addMesh(data, transform([10, 0, 0]));
    const mesh = merged.build();

    expect(mesh.positions).toHaveLength(36 * 9);
    expect([0, 12, 24].map((t) => mesh.finishes[t])).toEqual(
      (['varnish', 'metal', 'lacquer'] as const).map((f) => FINISH_ORDER.indexOf(f)),
    );
    // The own box comes first, then the placed boxes at x = 10.
    expect(mesh.positions[0]).toBeLessThan(1);
    expect(mesh.positions[12 * 9]).toBeGreaterThan(9);
    expect(mesh.colors[12 * 9 + 1]).toBe(1);
    expect(mesh.bones[12 * 3]).toBe(4);
    expect(mesh.colors.at(-3)).toBe(1);
    expect(mesh.bones.at(-1)).toBe(2);
  });

  it('marks the triangles of a filler, also in a merged mesh', () => {
    const part = new MeshBuilder();
    part.add(box(1, 1, 1), { color: [1, 1, 1], bone: 2 });
    part.add(box(1, 1, 1), { color: [1, 1, 1], bone: 2, filler: true });
    const merged = new MeshBuilder();
    merged.add(box(1, 1, 1), { color: [1, 1, 1] });
    merged.addMesh(part.build(), transform());
    const mesh = merged.build();

    expect(mesh.fillers).toHaveLength(36);
    expect(mesh.fillers.slice(0, 24).every((f) => f === 0)).toBe(true);
    expect(mesh.fillers.slice(24).every((f) => f === 1)).toBe(true);
  });

  it('keeps the second bone and its weight of each corner', () => {
    const part = new MeshBuilder();
    part.add(box(1, 1, 1), {
      color: [0, 1, 0],
      skin: () => ({ bone: 5, blendBone: 4, blendWeight: 0.25 }),
    });
    const merged = new MeshBuilder();
    merged.add(box(1, 1, 1), { color: [0, 0, 1], bone: 2 });
    merged.addMesh(part.build(), transform([10, 0, 0]));
    const mesh = merged.build();

    expect([mesh.bones[0], mesh.blendBones[0], mesh.blendWeights[0]]).toEqual([2, 2, 0]);
    expect([mesh.bones.at(-1), mesh.blendBones.at(-1), mesh.blendWeights.at(-1)]).toEqual([
      5, 4, 0.25,
    ]);
  });
});

describe('blendSkin', () => {
  it('makes the bone with the larger weight the main bone', () => {
    expect(blendSkin(4, 5, 0.25)).toEqual({ bone: 4, blendBone: 5, blendWeight: 0.25 });
    expect(blendSkin(4, 5, 0.5)).toEqual({ bone: 4, blendBone: 5, blendWeight: 0.5 });
    expect(blendSkin(4, 5, 0.75)).toEqual({ bone: 5, blendBone: 4, blendWeight: 0.25 });
    expect(blendSkin(4, 5, 1)).toEqual({ bone: 5, blendBone: 4, blendWeight: 0 });
  });

  it('refuses a weight that is not from 0 to 1', () => {
    expect(() => blendSkin(4, 5, 1.5)).toThrow('1.5');
    expect(() => blendSkin(4, 5, -0.1)).toThrow('-0.1');
    expect(() => blendSkin(4, 5, Number.NaN)).toThrow('NaN');
  });
});

describe('splitByFacing', () => {
  it('finds the faces that point in a direction', () => {
    const [front, rest] = splitByFacing(box(1, 1, 1), [0, 0, -1], 0.5);
    expect(front.length / 9).toBe(2);
    expect(rest.length / 9).toBe(10);
  });
});

describe('splitByCentroid', () => {
  it('finds the triangles whose centroids match a test', () => {
    // The +y face of the box has its centroids at y = 0.5, and the side faces at y = ±1/6.
    const [top, rest] = splitByCentroid(box(1, 1, 1), ([, y]) => y > 0.4);
    expect(top.length / 9).toBe(2);
    expect(rest.length / 9).toBe(10);
    expect(Math.min(...top.filter((_, i) => i % 3 === 1))).toBeCloseTo(0.5, 9);
  });
});

/** A closed loft of 12 corners whose neighbor rings turn by half a side, as the trunk grid. */
const TURNED_LOFT = loft(
  [
    { y: 0, halfWidth: 0, front: 0, back: 0 },
    { y: 0.2, halfWidth: 0.5, front: 0.6, back: 0.4, turn: 0.5 },
    { y: 0.5, halfWidth: 0.6, front: 0.7, back: 0.5 },
    { y: 0.8, halfWidth: 0.5, front: 0.6, back: 0.4, turn: 0.5 },
    { y: 1, halfWidth: 0, front: 0, back: 0 },
  ],
  12,
);

/**
 * Gives the corners of a corner list as points.
 *
 * @param corners The corner list, 9 numbers for each triangle.
 * @returns The points.
 */
function pointsOf(corners: readonly number[]): Vec3[] {
  return Array.from({ length: corners.length / 3 }, (_, c): Vec3 => [
    corners[c * 3] ?? 0,
    corners[c * 3 + 1] ?? 0,
    corners[c * 3 + 2] ?? 0,
  ]);
}

/**
 * Gives the keys of the corners of a corner list, to 1 µm, with x times a factor. A value of
 * -1e-16 and a value of 0 get the same key.
 *
 * @param corners The corner list, 9 numbers for each triangle.
 * @param mirror The factor of x: 1, or -1 for the mirror image.
 * @returns The key of each corner.
 */
function cornerKeys(corners: readonly number[], mirror: 1 | -1): string[] {
  return pointsOf(corners).map(([x, y, z]) =>
    [x * mirror, y, z].map((v) => (Math.round(v * 1e6) + 0).toString()).join(','),
  );
}

/**
 * Gives the keys of the triangles of a corner list, with x times a factor. The key of a triangle
 * does not depend on the order of its corners.
 *
 * @param corners The corner list, 9 numbers for each triangle.
 * @param mirror The factor of x: 1, or -1 for the mirror image.
 * @returns The keys.
 */
function triangleKeys(corners: readonly number[], mirror: 1 | -1): string[] {
  const points = cornerKeys(corners, mirror);
  return Array.from({ length: points.length / 3 }, (_, t) =>
    points
      .slice(t * 3, t * 3 + 3)
      .toSorted()
      .join(' '),
  );
}

/**
 * Counts the edges of a corner list that do not have exactly two triangles. A closed solid has
 * none.
 *
 * @param corners The corner list, 9 numbers for each triangle.
 * @returns The count.
 */
function openEdgeCount(corners: readonly number[]): number {
  const points = cornerKeys(corners, 1);
  const edges = new Map<string, number>();
  for (let c = 0; c < points.length; c++) {
    const p = points[c] ?? '';
    const q = points[c - (c % 3) + ((c + 1) % 3)] ?? '';
    const edge = p < q ? `${p}|${q}` : `${q}|${p}`;
    edges.set(edge, (edges.get(edge) ?? 0) + 1);
  }
  return [...edges.values()].filter((count) => count !== 2).length;
}

describe('splitByField', () => {
  /** A slanted plane that crosses the facets of the loft: below 0 is inside. */
  const slant = ([, y, z]: Vec3): number => y - 0.45 + 0.3 * z;

  it('cuts the triangles along the zero line, so that no triangle crosses it (design 4.5)', () => {
    const [inside, outside] = splitByField(TURNED_LOFT, slant);

    // Each corner lies on its side of the line, or on the line.
    expect(Math.max(...pointsOf(inside).map(slant))).toBeLessThan(1e-9);
    expect(Math.min(...pointsOf(outside).map(slant))).toBeGreaterThan(-1e-9);
    // The line cuts some triangles in three, so the parts have more triangles than the loft.
    const triangles = (inside.length + outside.length) / 9;
    expect(triangles).toBeGreaterThan(TURNED_LOFT.length / 9 + 12);
    // The border is the corners that both parts share. They lie on the line, or within 0.01 of
    // an edge from it where a cut moves onto a corner. Thus the border has no sawtooth.
    const outsideKeys = new Set(cornerKeys(outside, 1));
    const border = pointsOf(inside).filter((_, c) =>
      outsideKeys.has(cornerKeys(inside, 1)[c] ?? ''),
    );
    expect(new Set(cornerKeys(border.flat(), 1)).size).toBeGreaterThanOrEqual(24);
    for (const point of border) {
      expect(Math.abs(slant(point))).toBeLessThan(0.005);
    }
  });

  it('keeps the solid closed, its volume, and the direction of each face', () => {
    const [inside, outside] = splitByField(TURNED_LOFT, slant);
    const parts = [...inside, ...outside];

    // The two triangles of a cut edge cut it at the same point, so no seam opens.
    expect(openEdgeCount(TURNED_LOFT)).toBe(0);
    expect(openEdgeCount(parts)).toBe(0);
    expect(volumeOf(parts)).toBeCloseTo(volumeOf(TURNED_LOFT), 9);
    // Each piece points out, as the triangle that it comes from.
    for (let t = 0; t < parts.length / 9; t++) {
      const n = new Vector3(...triangleNormal(parts, t));
      const middle = new Vector3(...(pointsOf(parts.slice(t * 9, t * 9 + 9))[0] ?? [0, 0, 0]));
      expect(n.dot(middle.sub(new Vector3(0, 0.5, 0))), `triangle ${t}`).toBeGreaterThan(0);
    }
  });

  it('cuts the left half as the mirror image of the right half', () => {
    // A stripe of 30° on each side of the front, as the belly stripe of the torso.
    const stripe = ([x, , z]: Vec3): number => Math.atan2(Math.abs(x), -z) - 0.5;
    for (const part of splitByField(TURNED_LOFT, stripe)) {
      const plain = new Set(triangleKeys(part, 1));
      for (const key of triangleKeys(part, -1)) {
        expect(plain.has(key)).toBe(true);
      }
    }
  });

  it('puts a cut near a corner onto the corner, so that it makes no sliver', () => {
    // The line passes 0.001 from the corner (0, 1, 0) of the triangle.
    const triangle = [0, 0, 0, 1, 0, 0, 0, 1, 0];
    const [inside, outside] = splitByField(triangle, ([, y]) => y - 0.999);

    expect(inside.length / 9).toBe(1);
    expect(outside.length / 9).toBe(0);
    expect(splitByField(triangle, ([, y]) => y - 0.5).map((part) => part.length / 9)).toEqual([
      2, 1,
    ]);
  });

  it('keeps a triangle whole when it does not cross the line', () => {
    const [inside, outside] = splitByField(box(1, 1, 1), ([, y]) => y - 0.5);

    expect(inside.length / 9).toBe(12);
    expect(outside).toEqual([]);
  });
});
