import { describe, expect, it } from 'vitest';

import { FINISH_ORDER, srgb } from './mesh.ts';
import type { Finish, MeshData } from './mesh.ts';
import { cylinder } from './primitives.ts';
import { BONE_NAMES, boneIndex } from './rig.ts';
import type { BoneName } from './rig.ts';
import { proportionsOf } from './proportions.ts';
import { SPECIES, TEETH_COLOR } from './species.ts';
import type { AccentPart, SpeciesParams } from './species.ts';
import {
  H,
  boundsOf,
  joinsAtMostOneJoint,
  rabbit,
  variant,
  verticesWithColor,
} from './test-body.ts';

describe('buildBiped', () => {
  it('builds the rabbit body within the budget of 2,600 triangles (design 4.5)', () => {
    const { mesh } = rabbit();
    expect(mesh.positions.length / 9).toBeLessThanOrEqual(2600);
  });

  it('makes each triangle follow one bone, or a bone and its parent (design 4.4)', () => {
    const { mesh } = rabbit();
    for (let t = 0; t < mesh.bones.length / 3; t++) {
      expect(joinsAtMostOneJoint(mesh, t), `triangle ${t}`).toBe(true);
    }
  });

  it('puts the left side of the animal at -x, because it faces -z', () => {
    const { positions } = rabbit();
    expect(positions.upperArmL[0]).toBeLessThan(0);
    expect(positions.upperArmR[0]).toBeGreaterThan(0);
    expect(positions.shinL[2]).toBeLessThan(positions.thighL[2]);
  });

  it('places a bone for each body bone of the rig', () => {
    const { positions } = rabbit();
    const instrumentBones = new Set(['instrument', 'bow', 'malletL', 'malletR', 'baton', 'slide']);
    const bodyBones = BONE_NAMES.filter((name) => !instrumentBones.has(name));
    expect(Object.keys(positions).toSorted()).toEqual(bodyBones.toSorted());
  });

  it('gives the accent color to each accent part, and to no other part (design 4.5)', () => {
    const red = '#ff0000';
    const parts: readonly (readonly [AccentPart, Partial<SpeciesParams>, readonly BoneName[]])[] = [
      ['inner-ears', {}, ['earL', 'earR']],
      ['ears', {}, ['earL', 'earR']],
      ['nose', {}, ['head']],
      ['snout', { snout: 'flat-nose' }, ['head']],
      ['horn', { snout: 'horn' }, ['head']],
      ['beak', { snout: 'beak' }, ['head', 'jaw']],
      // The accent arms also color a band over the shoulders, as on the panda.
      ['arms', {}, ['upperArmL', 'upperArmR', 'forearmL', 'forearmR', 'chest', 'neck']],
      ['hands', {}, ['handL', 'handR', 'fingersL', 'fingersR']],
      ['legs', {}, ['thighL', 'thighR', 'shinL', 'shinR']],
      // The accent feet also color the lower part of the shins, as the socks of the fox.
      ['feet', {}, ['footL', 'footR', 'shinL', 'shinR']],
      ['tail', { tail: 'thin' }, ['tail1', 'tail2']],
      ['face-pattern', { facePattern: 'eye-patches' }, ['head']],
    ];
    const colors = { ...SPECIES.rabbit.colors, accent: red };
    for (const [part, change, bones] of parts) {
      const plain = variant({ ...change, colors, accentParts: [] }).mesh;
      expect(verticesWithColor(plain, srgb(red))).toHaveLength(0);
      const { mesh } = variant({ ...change, colors, accentParts: [part] });
      const accented = new Set<BoneName>();
      for (let v = 0; v < mesh.bones.length; v++) {
        if (mesh.colors[v * 3] === 1 && mesh.colors[v * 3 + 1] === 0) {
          accented.add(BONE_NAMES[mesh.bones[v] ?? 0] ?? 'root');
        }
      }
      expect([...accented].toSorted()).toEqual([...bones].toSorted());
    }
  });

  it('gives the fur finish to the fur, and keeps the parts with no fur matte (design 4.5)', () => {
    // The parts with no fur get the accent color red or the color of the teeth. All other parts
    // except the eyes have fur.
    const red = '#ff0000';
    const colors = { ...SPECIES.rabbit.colors, accent: red };
    const cases: readonly Partial<SpeciesParams>[] = [
      { accentParts: ['nose', 'inner-ears'] },
      { snout: 'horn', accentParts: ['horn', 'nose', 'inner-ears'] },
      { snout: 'beak', accentParts: ['beak', 'inner-ears'] },
      { snout: 'buck-teeth', ears: 'small', accentParts: ['nose', 'inner-ears'] },
      { snout: 'trunk', ears: 'large-flap', tail: 'thin', accentParts: ['inner-ears'] },
      {
        snout: 'flat-nose',
        ears: 'round',
        tail: 'bushy',
        accentParts: ['snout', 'nose', 'inner-ears'],
      },
      { snout: 'long', ears: 'floppy', tail: 'flat', accentParts: ['nose'] },
    ];
    const noFur = [srgb(red), srgb(TEETH_COLOR)];
    const eyes = new Set([boneIndex('eyeL'), boneIndex('eyeR')]);
    for (const change of cases) {
      const { mesh } = variant({ ...change, colors });
      let matteCount = 0;
      for (let t = 0; t < mesh.finishes.length; t++) {
        const color = [0, 1, 2].map((k) => mesh.colors[t * 9 + k] ?? 0);
        const expected: Finish = eyes.has(mesh.bones[t * 3] ?? 0)
          ? 'lacquer'
          : noFur.some((c) => c.every((value, k) => Math.abs(value - (color[k] ?? 0)) < 1e-6))
            ? 'matte'
            : 'fur';
        expect(FINISH_ORDER[mesh.finishes[t] ?? 0], `${JSON.stringify(change)} ${t}`).toBe(
          expected,
        );
        if (expected === 'matte') {
          matteCount++;
        }
      }
      expect(matteCount, JSON.stringify(change)).toBeGreaterThan(0);
    }

    // The antlers have the belly color, which the lower face has too. They are matte: 3 thin
    // cylinders of 6 sides on each side of the head.
    const matte = (mesh: MeshData): number =>
      mesh.finishes.filter((f) => f === FINISH_ORDER.indexOf('matte')).length;
    const antlers = variant({ ears: 'antlered' }).mesh;
    const pointed = variant({ ears: 'pointed' }).mesh;
    expect(matte(antlers) - matte(pointed)).toBe((2 * 3 * cylinder(1, 1, 1, 6).length) / 9);
  });

  it('makes a thin body with a girth of 0.75 (review of step 4, the meerkat)', () => {
    const round = variant({}).mesh;
    const { mesh, body } = variant({ girth: 0.75 });
    const width = (m: MeshData, bone: BoneName): number => {
      const b = boundsOf(m, bone);
      return b.max[0] - b.min[0];
    };
    expect(width(mesh, 'spine')).toBeCloseTo(0.75 * width(round, 'spine'), 6);
    expect(width(mesh, 'thighL')).toBeCloseTo(0.75 * width(round, 'thighL'), 6);
    const { shoulderSpread } = proportionsOf(SPECIES.rabbit);
    expect(body.positions.upperArmR[0]).toBeCloseTo(0.75 * shoulderSpread * H, 9);
    // The head keeps its size.
    expect(width(mesh, 'head')).toBeCloseTo(width(round, 'head'), 6);
  });
});
