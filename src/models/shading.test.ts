import { describe, expect, it } from 'vitest';

import { MeshBuilder, blendSkin, splitByCentroid, transform } from './mesh.ts';
import type { MeshData, PartOptions } from './mesh.ts';
import { ball, box, cylinder, quad } from './primitives.ts';
import { buildPlayer } from './player.ts';
import { boneIndex } from './rig.ts';
import { shadeMesh, weldCorners } from './shading.ts';

/** Reads the normal of one corner. */
function normalAt(normals: Float32Array, corner: number): [number, number, number] {
  return [normals[corner * 3] ?? 0, normals[corner * 3 + 1] ?? 0, normals[corner * 3 + 2] ?? 0];
}

/** Gives the corners of a mesh whose position is near a point. */
function cornersAt(mesh: MeshData, point: readonly [number, number, number]): number[] {
  const found: number[] = [];
  for (let c = 0; c < mesh.bones.length; c++) {
    const d = Math.hypot(
      (mesh.positions[c * 3] ?? 0) - point[0],
      (mesh.positions[c * 3 + 1] ?? 0) - point[1],
      (mesh.positions[c * 3 + 2] ?? 0) - point[2],
    );
    if (d < 1e-6) {
      found.push(c);
    }
  }
  return found;
}

/**
 * A corner on the top rim of `cylinder(1, 1, 1, 16)`. The lathe turns its rings by half a side,
 * so its corners are at 11.25° plus a multiple of 22.5° from +z toward +x.
 */
const RIM = [Math.sin(Math.PI / 16), 1, Math.cos(Math.PI / 16)] as const;

/** Splits the faces of the cylinder at the corner {@link RIM}. */
function atSeam([x, , z]: readonly [number, number, number]): boolean {
  return Math.atan2(x, z) < Math.PI / 16;
}

describe('weldCorners', () => {
  it('welds the corners of one bone at one point into one vertex', () => {
    const builder = new MeshBuilder();
    builder.add(box(1, 1, 1), { color: [1, 1, 1] });
    const welds = weldCorners(builder.build());
    expect(welds.start.length - 1).toBe(8);
    expect(welds.corners.length).toBe(36);
    expect(welds.start.at(-1)).toBe(36);
  });

  it('welds the corners of two bones at one point', () => {
    const builder = new MeshBuilder();
    builder.add(box(1, 1, 1), { color: [1, 1, 1], bone: 1 });
    builder.add(box(1, 1, 1), { color: [1, 1, 1], bone: 2 });
    builder.add(box(1, 1, 1), { color: [1, 1, 1], bone: 2, at: transform([2, 0, 0]) });
    expect(weldCorners(builder.build()).start.length - 1).toBe(16);
  });
});

describe('shadeMesh normals', () => {
  it('keeps the hard edges of a box, whose faces turn by 90°', () => {
    const builder = new MeshBuilder();
    builder.add(box(1, 1, 1), { color: [1, 1, 1] });
    const mesh = builder.build();
    const normals = shadeMesh(mesh, null).normals;
    for (let t = 0; t < 12; t++) {
      const a = normalAt(normals, t * 3);
      for (let k = 1; k < 3; k++) {
        expect(normalAt(normals, t * 3 + k)).toEqual(a);
      }
      // Each normal is a face normal: one axis only.
      expect(a.filter((value) => Math.abs(value) > 1e-6)).toHaveLength(1);
    }
  });

  it('smooths the side of a cylinder of 16 sides and keeps the edge of its cap', () => {
    const builder = new MeshBuilder();
    builder.add(cylinder(1, 1, 1, 16), { color: [1, 1, 1] });
    const mesh = builder.build();
    const normals = shadeMesh(mesh, null).normals;
    // A corner on the rim: the side corners point out from the axis, the cap corners up.
    const rim = cornersAt(mesh, RIM);
    expect(rim.length).toBeGreaterThan(2);
    const side = rim.filter((c) => Math.abs(normalAt(normals, c)[1]) < 0.5);
    const cap = rim.filter((c) => Math.abs(normalAt(normals, c)[1]) >= 0.5);
    expect(side.length).toBeGreaterThan(0);
    expect(cap.length).toBeGreaterThan(0);
    for (const c of side) {
      const [x, y, z] = normalAt(normals, c);
      expect(x).toBeCloseTo(RIM[0], 5);
      expect(y).toBeCloseTo(0, 5);
      expect(z).toBeCloseTo(RIM[2], 5);
    }
    for (const c of cap) {
      expect(normalAt(normals, c)[1]).toBeCloseTo(1, 5);
    }
  });

  it('smooths the seam between the parts of two bones', () => {
    // Two halves of one cylinder on two bones, as the torso on `spine` and `chest`.
    const [left, right] = splitByCentroid(cylinder(1, 1, 1, 16), atSeam);
    const builder = new MeshBuilder();
    builder.add(left, { color: [1, 1, 1], bone: 1 });
    builder.add(right, { color: [1, 1, 1], bone: 2 });
    const mesh = builder.build();
    const normals = shadeMesh(mesh, null).normals;
    const side = cornersAt(mesh, RIM).filter((c) => Math.abs(normalAt(normals, c)[1]) < 0.5);
    expect(side.length).toBeGreaterThan(1);
    for (const c of side) {
      const [x, , z] = normalAt(normals, c);
      expect(x * RIM[0] + z * RIM[2]).toBeCloseTo(1, 5);
    }
  });

  it('smooths across the color split of a part on one bone', () => {
    const [left, right] = splitByCentroid(cylinder(1, 1, 1, 16), atSeam);
    const builder = new MeshBuilder();
    builder.add(left, { color: [1, 1, 1] });
    builder.add(right, { color: [0, 0, 0] });
    const mesh = builder.build();
    const normals = shadeMesh(mesh, null).normals;
    const side = cornersAt(mesh, RIM).filter((c) => Math.abs(normalAt(normals, c)[1]) < 0.5);
    expect(side.length).toBeGreaterThan(1);
    for (const c of side) {
      const [x, , z] = normalAt(normals, c);
      expect(x * RIM[0] + z * RIM[2]).toBeCloseTo(1, 5);
    }
  });

  it('gives each corner a unit normal', () => {
    const builder = new MeshBuilder();
    builder.add(cylinder(1, 0.5, 2, 10), { color: [1, 1, 1], finish: 'metal' });
    builder.add(box(1, 2, 3), { color: [1, 1, 1], at: transform([3, 0, 0]) });
    const normals = shadeMesh(builder.build(), null).normals;
    for (let c = 0; c < normals.length / 3; c++) {
      expect(Math.hypot(...normalAt(normals, c))).toBeCloseTo(1, 5);
    }
  });
});

/** A floor of 0.02 m quads from x = -0.3 to 0.3, with its vertices on the y = 0 plane. */
function floorCorners(): number[] {
  const out: number[] = [];
  for (let i = 0; i < 30; i++) {
    const x = -0.3 + i * 0.02;
    out.push(...quad([x, 0, 0.1], [x + 0.02, 0, 0.1], [x + 0.02, 0, -0.1], [x, 0, -0.1]));
  }
  return out;
}

/** The parents of the bones of a player. */
const PARENTS = buildPlayer('rabbit', 'violin').skeleton.parents;

/**
 * Builds a floor on one bone with a wall on another bone, and gives the light of the floor
 * vertex next to the wall and of the floor vertex at the far end.
 *
 * @param floorBone The bone of the floor.
 * @param wallBone The bone of the wall.
 * @param wallSkin The skin rule of the wall. Default: the wall is rigid on `wallBone`.
 * @param filler Whether the wall is a filler. Default: no.
 */
function floorLight(
  floorBone: number,
  wallBone: number,
  wallSkin?: PartOptions['skin'],
  filler = false,
) {
  const builder = new MeshBuilder();
  builder.add(floorCorners(), { color: [1, 1, 1], bone: floorBone });
  const wall = { color: [1, 1, 1], bone: wallBone, at: transform([0.11, 0.1, 0]), filler } as const;
  builder.add(box(0.02, 0.2, 0.2), wallSkin ? { ...wall, skin: wallSkin } : wall);
  const mesh = builder.build();
  const { light } = shadeMesh(mesh, PARENTS);
  const at = (point: readonly [number, number, number]): number =>
    light?.[cornersAt(mesh, point)[0] ?? -1] ?? Number.NaN;
  return { near: at([0.08, 0, 0.1]), far: at([-0.3, 0, 0.1]) };
}

describe('shadeMesh occlusion', () => {
  it('darkens a floor beside a wall, and keeps the far floor lit', () => {
    const { near, far } = floorLight(boneIndex('chest'), boneIndex('chest'));
    expect(near).toBeLessThan(0.9);
    expect(far).toBe(1);
  });

  it('lets the bones of the body shade each other', () => {
    expect(floorLight(boneIndex('chest'), boneIndex('head')).near).toBeLessThan(0.9);
  });

  it('keeps an arm from shading the torso', () => {
    expect(floorLight(boneIndex('chest'), boneIndex('upperArmL')).near).toBe(1);
  });

  it('reads the main bone of a corner with two bones (design 4.7)', () => {
    const chest = boneIndex('chest');
    const arm = boneIndex('upperArmL');
    // A wall mainly on the arm does not shade the torso. A wall mainly on the chest does.
    expect(floorLight(chest, chest, () => blendSkin(chest, arm, 0.6)).near).toBe(1);
    expect(floorLight(chest, chest, () => blendSkin(chest, arm, 0.4)).near).toBeLessThan(0.9);
  });

  it('lets no filler shade the skin around it (design 4.5)', () => {
    const chest = boneIndex('chest');
    expect(floorLight(chest, chest, undefined, true).near).toBe(1);
  });

  it('keeps a convex part fully lit', () => {
    const builder = new MeshBuilder();
    builder.add(ball(0.1, 16, 8), { color: [1, 1, 1] });
    const { light } = shadeMesh(builder.build(), PARENTS);
    expect(new Set(light)).toEqual(new Set([1]));
  });

  it('gives no occlusion to a mesh with no parents', () => {
    const builder = new MeshBuilder();
    builder.add(floorCorners(), { color: [1, 1, 1] });
    expect(shadeMesh(builder.build(), null).light).toBeNull();
  });
});

/**
 * Gives the corners at the vertices of the neck band: each corner at the place of a corner of a
 * triangle with a corner on `neck`.
 *
 * @param mesh The mesh.
 * @returns The corners.
 */
function neckBandCorners(mesh: MeshData): number[] {
  const neck = boneIndex('neck');
  const key = (c: number): string =>
    [0, 1, 2].map((axis) => Math.round((mesh.positions[c * 3 + axis] ?? 0) * 1e5)).join(',');

  const places = new Set<string>();
  for (let t = 0; t < mesh.bones.length / 3; t++) {
    if ([0, 1, 2].some((k) => mesh.bones[t * 3 + k] === neck)) {
      for (let k = 0; k < 3; k++) {
        places.add(key(t * 3 + k));
      }
    }
  }

  return [...mesh.bones.keys()].filter((c) => places.has(key(c)));
}

/** Players of the narrow, the default, and the wide necks, and of the large species. */
const NECK_PLAYERS = [
  ['bear', 'baton'],
  ['rabbit', 'violin'],
  ['fox-red', 'violin'],
  ['deer', 'harp'],
  ['hippo', 'contrabass'],
] as const;

describe('shadeMesh neck band (design 4.5)', () => {
  it('removes the down part of the normals at each vertex of a triangle on `neck`', () => {
    const builder = new MeshBuilder();
    builder.add(ball(0.1, 8, 4), { color: [1, 1, 1], finish: 'fur', bone: boneIndex('neck') });
    builder.add(ball(0.1, 8, 4), {
      color: [1, 1, 1],
      finish: 'fur',
      bone: boneIndex('head'),
      at: transform([0.5, 0, 0]),
    });
    const mesh = builder.build();
    const { normals } = shadeMesh(mesh, null);

    const neck = neckBandCorners(mesh);
    expect(neck.length).toBeGreaterThan(0);
    for (const c of neck) {
      const [x, y, z] = normalAt(normals, c);
      expect(y, `corner ${c}`).toBeGreaterThanOrEqual(-1e-6);
      expect(Math.hypot(x, y, z)).toBeCloseTo(1, 5);
      // The normal keeps its side: it points away from the axis of the ball.
      const t = Math.floor(c / 3);
      const middle = (axis: number): number =>
        [0, 1, 2].reduce((sum, k) => sum + (mesh.positions[t * 9 + k * 3 + axis] ?? 0), 0) / 3;
      expect(x * middle(0) + z * middle(2)).toBeGreaterThan(0);
    }
    // The ball on `head` keeps the normals of its lower half.
    const head = [...mesh.bones.keys()].filter((c) => !neck.includes(c));
    expect(Math.min(...head.map((c) => normalAt(normals, c)[1]))).toBeLessThan(-0.5);
  });

  it('turns no normal of the nape or the throat of a body down (design 4.5)', () => {
    for (const [species, instrument] of NECK_PLAYERS) {
      const player = buildPlayer(species, instrument);
      const { mesh } = player;
      const { normals } = shadeMesh(mesh, player.skeleton.parents);

      const band = neckBandCorners(mesh);
      expect(band.length, species).toBeGreaterThan(3 * 2 * 12);
      // The faces under the head point down by up to 56°. Their normals made the nape of the
      // conductor and a collar under the chin of each rabbit dark (luma 17 and 89 against 37
      // and 160 around them).
      const lowest = Math.min(...band.map((c) => normalAt(normals, c)[1]));
      expect(lowest, species).toBeGreaterThanOrEqual(-1e-6);
    }
  });

  it('keeps 0.6 of the light on the neck band of a body (design 4.5)', () => {
    for (const [species, instrument] of NECK_PLAYERS) {
      const player = buildPlayer(species, instrument);
      const { mesh } = player;
      const { light } = shadeMesh(mesh, player.skeleton.parents);

      // The head left 0.4 of the light on the throat, the floor of the other folds.
      const least = Math.min(...neckBandCorners(mesh).map((c) => light?.[c] ?? 0));
      expect(least, species).toBeGreaterThanOrEqual(0.6 - 1e-6);
      expect(least, species).toBeLessThan(0.7);
    }
  });
});
