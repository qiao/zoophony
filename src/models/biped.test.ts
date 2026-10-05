import { describe, expect, it } from 'vitest';

import { buildBiped } from './biped.ts';
import type { BodyBones } from './biped.ts';
import { MeshBuilder } from './mesh.ts';
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

  it('refuses a shape parameter that step 4 adds', () => {
    const fox: SpeciesParams = { ...SPECIES.rabbit, ears: 'pointed' };
    expect(() => buildBiped(new MeshBuilder(), fox, SEAT)).toThrow(/pointed/);
  });
});
