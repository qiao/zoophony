import { describe, expect, it } from 'vitest';

import { srgb } from './mesh.ts';
import type { MeshData } from './mesh.ts';
import { BONE_NAMES } from './rig.ts';
import type { BoneName } from './rig.ts';
import { SPECIES } from './species.ts';
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

  it('makes a thin body with a girth of 0.75 (review of step 4, the meerkat)', () => {
    const round = variant({}).mesh;
    const { mesh, body } = variant({ girth: 0.75 });
    const width = (m: MeshData, bone: BoneName): number => {
      const b = boundsOf(m, bone);
      return b.max[0] - b.min[0];
    };
    expect(width(mesh, 'spine')).toBeCloseTo(0.75 * width(round, 'spine'), 6);
    expect(width(mesh, 'thighL')).toBeCloseTo(0.75 * width(round, 'thighL'), 6);
    expect(body.positions.upperArmR[0]).toBeCloseTo(0.75 * 0.52 * H, 9);
    // The head keeps its size.
    expect(width(mesh, 'head')).toBeCloseTo(width(round, 'head'), 6);
  });
});
