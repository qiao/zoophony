import { describe, expect, it } from 'vitest';

import { buildBiped } from './biped.ts';
import { FLAP_EAR_ANGLE } from './ears.ts';
import type { BodyBones } from './biped.ts';
import { cross, dot, length, sub } from './math.ts';
import type { Vec3 } from './math.ts';
import { MeshBuilder, srgb } from './mesh.ts';
import type { MeshData } from './mesh.ts';
import { BONE_NAMES, boneIndex } from './rig.ts';
import type { BoneName } from './rig.ts';
import { SPECIES } from './species.ts';
import type { SpeciesParams } from './species.ts';

const SEAT = 0.45;

/** The head height `H` of the rabbit (design 4.5, body proportions). */
const H = 0.38;

/** The mesh and the bones of the rabbit body. */
interface RabbitBody {
  readonly mesh: MeshData;
  readonly positions: BodyBones['positions'];
}

function rabbit(): RabbitBody {
  const builder = new MeshBuilder();
  const body = buildBiped(builder, SPECIES.rabbit, SEAT);
  return { mesh: builder.build(), positions: body.positions };
}

/** Finds the lowest vertex of the parts that follow one bone. */
function bottomOf(mesh: MeshData, bone: BoneName): number {
  let bottom = Infinity;
  for (let v = 0; v < mesh.bones.length; v++) {
    if (mesh.bones[v] === boneIndex(bone)) {
      bottom = Math.min(bottom, mesh.positions[v * 3 + 1] ?? Infinity);
    }
  }
  return bottom;
}

/** Finds the highest vertex of the parts that follow one bone. */
function topOf(mesh: MeshData, bone: BoneName): number {
  let top = -Infinity;
  for (let v = 0; v < mesh.bones.length; v++) {
    if (mesh.bones[v] === boneIndex(bone)) {
      top = Math.max(top, mesh.positions[v * 3 + 1] ?? -Infinity);
    }
  }
  return top;
}

/** The smallest and the largest x, y, and z of the parts that follow one bone. */
interface Bounds {
  readonly min: Vec3;
  readonly max: Vec3;
}

function boundsOf(mesh: MeshData, bone: BoneName): Bounds {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let v = 0; v < mesh.bones.length; v++) {
    if (mesh.bones[v] !== boneIndex(bone)) {
      continue;
    }
    for (let k = 0; k < 3; k++) {
      const value = mesh.positions[v * 3 + k] ?? 0;
      min[k] = Math.min(min[k] ?? Infinity, value);
      max[k] = Math.max(max[k] ?? -Infinity, value);
    }
  }
  return {
    min: [min[0] ?? 0, min[1] ?? 0, min[2] ?? 0],
    max: [max[0] ?? 0, max[1] ?? 0, max[2] ?? 0],
  };
}

/** Counts the triangles that follow one bone. */
function trianglesOn(mesh: MeshData, bone: BoneName): number {
  let count = 0;
  for (let t = 0; t < mesh.bones.length / 3; t++) {
    if (mesh.bones[t * 3] === boneIndex(bone)) {
      count++;
    }
  }
  return count;
}

/**
 * Calculates the signed volume of the triangles of one bone. It is larger than 0 when the
 * corners of each closed part go counterclockwise when seen from outside.
 */
function volumeOn(mesh: MeshData, bone: BoneName): number {
  let volume = 0;
  const p = mesh.positions;
  for (let t = 0; t < mesh.bones.length / 3; t++) {
    if (mesh.bones[t * 3] !== boneIndex(bone)) {
      continue;
    }
    const at = (k: number): Vec3 => [
      p[t * 9 + k * 3] ?? 0,
      p[t * 9 + k * 3 + 1] ?? 0,
      p[t * 9 + k * 3 + 2] ?? 0,
    ];
    volume += dot(at(0), cross(at(1), at(2))) / 6;
  }
  return volume;
}

/** Finds the largest distance of a vertex of one bone from a point. */
function reachFrom(mesh: MeshData, bone: BoneName, from: Vec3): number {
  let reach = 0;
  for (let v = 0; v < mesh.bones.length; v++) {
    if (mesh.bones[v] === boneIndex(bone)) {
      const p: Vec3 = [
        mesh.positions[v * 3] ?? 0,
        mesh.positions[v * 3 + 1] ?? 0,
        mesh.positions[v * 3 + 2] ?? 0,
      ];
      reach = Math.max(reach, length(sub(p, from)));
    }
  }
  return reach;
}

/** Finds the largest distance between two vertices of one bone. */
function spanOf(mesh: MeshData, bone: BoneName): number {
  const points: Vec3[] = [];
  for (let v = 0; v < mesh.bones.length; v++) {
    if (mesh.bones[v] === boneIndex(bone)) {
      points.push([
        mesh.positions[v * 3] ?? 0,
        mesh.positions[v * 3 + 1] ?? 0,
        mesh.positions[v * 3 + 2] ?? 0,
      ]);
    }
  }
  let span = 0;
  for (const a of points) {
    for (const b of points) {
      span = Math.max(span, length(sub(a, b)));
    }
  }
  return span;
}

/** Builds the body of a variant of the rabbit. */
function variant(change: Partial<SpeciesParams>): BuiltBody {
  const builder = new MeshBuilder();
  const body = buildBiped(builder, { ...SPECIES.rabbit, ...change }, SEAT);
  return { mesh: builder.build(), body };
}

/** The mesh and the bones of one body. */
interface BuiltBody {
  readonly mesh: MeshData;
  readonly body: BodyBones;
}

const EAR_TYPES: readonly SpeciesParams['ears'][] = [
  'long',
  'pointed',
  'round',
  'large-round',
  'floppy',
  'large-flap',
  'small',
  'none',
];

describe('buildBiped', () => {
  it('builds the rabbit body within the budget of 1,200 triangles (design 4.5)', () => {
    const { mesh } = rabbit();
    expect(mesh.positions.length / 9).toBeLessThanOrEqual(1200);
  });

  it('makes each part rigid: the three corners of a triangle follow one bone (design 4.4)', () => {
    const { mesh } = rabbit();
    for (let t = 0; t < mesh.bones.length / 3; t++) {
      expect(mesh.bones[t * 3 + 1]).toBe(mesh.bones[t * 3]);
      expect(mesh.bones[t * 3 + 2]).toBe(mesh.bones[t * 3]);
    }
  });

  it('puts the top of the head 2.6 H above the seat, with H 0.38 m (design 4.5)', () => {
    const { mesh } = rabbit();
    expect(topOf(mesh, 'head')).toBeCloseTo(SEAT + 2.6 * H, 6);
  });

  it('puts the torso above the chest bone on `chest`, with the arms (design 4.7)', () => {
    const { mesh, positions } = rabbit();
    const chest = positions.chest[1];
    expect(chest).toBeCloseTo(SEAT + 0.85 * H, 9);
    expect(bottomOf(mesh, 'chest')).toBeCloseTo(chest, 6);
    expect(topOf(mesh, 'chest')).toBeCloseTo(SEAT + 1.3 * H, 6);
    expect(topOf(mesh, 'spine')).toBeCloseTo(chest, 6);
    expect(bottomOf(mesh, 'spine')).toBeCloseTo(SEAT, 6);
  });

  it('gives the long ears 1.1 H on the ear bones (design 4.5)', () => {
    const { mesh, positions } = rabbit();
    // The ears lean back and out, so their height is a little less than their length.
    const earHeight = topOf(mesh, 'earL') - positions.earL[1];
    expect(earHeight).toBeGreaterThan(1.05 * H);
    expect(earHeight).toBeLessThanOrEqual(1.1 * H);
  });

  it('rests the feet on the floor for each size and seat height (design 4.5)', () => {
    for (const size of [0.75, 1, 1.35]) {
      for (const seat of [SEAT, 0.6]) {
        const builder = new MeshBuilder();
        buildBiped(builder, { ...SPECIES.rabbit, size }, seat);
        const mesh = builder.build();
        // The mesh data holds 32-bit floats.
        expect(bottomOf(mesh, 'footL')).toBeCloseTo(0, 6);
        expect(bottomOf(mesh, 'footR')).toBeCloseTo(0, 6);
      }
    }
  });

  it('puts the left side of the animal at -x, because it faces -z', () => {
    const { positions } = rabbit();
    expect(positions.upperArmL[0]).toBeLessThan(0);
    expect(positions.upperArmR[0]).toBeGreaterThan(0);
    expect(positions.shinL[2]).toBeLessThan(positions.thighL[2]);
  });

  it('gives the arm segments of design 4.5: 0.6 H and 0.55 H', () => {
    const { positions } = rabbit();
    expect(positions.upperArmL[1] - positions.forearmL[1]).toBeCloseTo(0.6 * H, 9);
    expect(positions.forearmL[1] - positions.handL[1]).toBeCloseTo(0.55 * H, 9);
  });

  it('places a bone for each body bone of the rig', () => {
    const { positions } = rabbit();
    const instrumentBones = new Set(['instrument', 'bow', 'malletL', 'malletR', 'baton', 'slide']);
    const bodyBones = BONE_NAMES.filter((name) => !instrumentBones.has(name));
    expect(Object.keys(positions).toSorted()).toEqual(bodyBones.toSorted());
  });

  it('builds each ear type on the ear bones, with the left ear as the mirror image of the right', () => {
    for (const ears of EAR_TYPES) {
      const { mesh, body } = variant({ ears });
      const left = boundsOf(mesh, 'earL');
      const right = boundsOf(mesh, 'earR');
      expect(trianglesOn(mesh, 'earL')).toBe(trianglesOn(mesh, 'earR'));
      expect(body.positions.earL[0]).toBeCloseTo(-body.positions.earR[0], 9);
      if (ears === 'none') {
        expect(trianglesOn(mesh, 'earR')).toBe(0);
        continue;
      }
      expect(trianglesOn(mesh, 'earR')).toBeGreaterThan(0);
      expect(left.min[0]).toBeCloseTo(-right.max[0], 6);
      expect(left.max[1]).toBeCloseTo(right.max[1], 6);
      // The faces of each part point out, also on the mirror side.
      expect(volumeOn(mesh, 'earL')).toBeGreaterThan(0);
      expect(volumeOn(mesh, 'earR')).toBeCloseTo(volumeOn(mesh, 'earL'), 9);
    }
  });

  it('gives the ears the sizes of design 4.5', () => {
    // A pointed ear reaches 0.45 H from its base.
    const pointed = variant({ ears: 'pointed' });
    expect(reachFrom(pointed.mesh, 'earR', pointed.body.positions.earR)).toBeCloseTo(0.45 * H, 6);
    // The disc ears are 0.3, 0.45, and 0.2 H wide.
    for (const [ears, width] of [
      ['round', 0.3],
      ['large-round', 0.45],
      ['small', 0.2],
    ] as const) {
      const { mesh } = variant({ ears });
      expect(spanOf(mesh, 'earR')).toBeCloseTo(width * H, 6);
    }
    // A floppy ear hangs 0.5 H down from its base.
    const floppy = variant({ ears: 'floppy' });
    const drop = floppy.body.positions.earR[1] - boundsOf(floppy.mesh, 'earR').min[1];
    expect(drop).toBeGreaterThan(0.4 * H);
    expect(drop).toBeLessThan(0.5 * H);
  });

  it('makes the large-flap ear 0.9 H wide, with the inner ear on its front face', () => {
    const { mesh } = variant({ ears: 'large-flap', accentParts: ['inner-ears'] });
    const { min, max } = boundsOf(mesh, 'earR');
    const back: Vec3 = [Math.sin(FLAP_EAR_ANGLE), 0, Math.cos(FLAP_EAR_ANGLE)];
    // The plate is 0.06 H thick, so its extent along `back` is a little more than 0.9 H.
    const width = (max[0] - min[0]) * back[0] + (max[2] - min[2]) * back[2];
    expect(width).toBeGreaterThan(0.9 * H);
    expect(width).toBeLessThan(1.0 * H);
    // The vertices of the inner ear are in front of the plate.
    const accent = srgb(SPECIES.rabbit.colors.accent);
    const front: Vec3 = [Math.cos(FLAP_EAR_ANGLE), 0, -Math.sin(FLAP_EAR_ANGLE)];
    const inner: number[] = [];
    const outer: number[] = [];
    for (let v = 0; v < mesh.bones.length; v++) {
      if (mesh.bones[v] !== boneIndex('earR')) {
        continue;
      }
      const p: Vec3 = [
        mesh.positions[v * 3] ?? 0,
        mesh.positions[v * 3 + 1] ?? 0,
        mesh.positions[v * 3 + 2] ?? 0,
      ];
      const isInner = Math.abs((mesh.colors[v * 3] ?? 0) - accent[0]) < 1e-6;
      (isInner ? inner : outer).push(dot(p, front));
    }
    expect(inner.length).toBeGreaterThan(0);
    expect(Math.min(...inner)).toBeGreaterThan(Math.max(...outer) - 1e-6);
  });

  it('refuses a shape parameter that step 4 adds', () => {
    const later: readonly SpeciesParams[] = [
      { ...SPECIES.rabbit, snout: 'trunk' },
      { ...SPECIES.rabbit, tail: 'bushy' },
      { ...SPECIES.rabbit, facePattern: 'mask' },
    ];
    for (const species of later) {
      expect(() => buildBiped(new MeshBuilder(), species, SEAT)).toThrow(
        /not built yet \(step 4\)/,
      );
    }
  });
});
