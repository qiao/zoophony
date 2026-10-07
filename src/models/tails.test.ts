import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { buildBiped } from './biped.ts';
import { seated } from './body-frame.ts';
import { MeshBuilder, srgb } from './mesh.ts';
import { SPECIES } from './species.ts';
import type { SpeciesParams } from './species.ts';
import {
  H,
  boundsOf,
  bottomOf,
  reachFrom,
  spanOf,
  trianglesOn,
  variant,
  verticesWithColor,
} from './test-body.ts';
import { boneIndex } from './rig.ts';
import { cornersOn, largestFold, openEdges, surfaceCount, volumeOf } from './test-limbs.ts';

/** The tail types that the tests build (design 4.3). */
const TAIL_TYPES: readonly SpeciesParams['tail'][] = ['none', 'puff', 'bushy', 'thin', 'flat'];

describe('addTail', () => {
  it('builds each tail type on its bones, with faces that point out', () => {
    for (const tail of TAIL_TYPES) {
      const { mesh } = variant({ tail });
      const bones = { none: 0, puff: 1, bushy: 2, thin: 2, flat: 2 }[tail];
      expect(trianglesOn(mesh, 'tail1') > 0).toBe(bones >= 1);
      expect(trianglesOn(mesh, 'tail2') > 0).toBe(bones === 2);
      // A long tail is one closed tube on both bones.
      if (bones >= 1) {
        expect(volumeOf(cornersOn(mesh, ['tail1', 'tail2']))).toBeGreaterThan(0);
      }
    }
  });

  it('gives the tails the lengths of design 4.5, with a round tip', () => {
    for (const [tail, total] of [
      ['bushy', 1.1],
      ['thin', 0.7],
      ['flat', 0.5],
    ] as const) {
      const { mesh, body } = variant({ tail });
      const { tail1, tail2 } = body.positions;
      expect(
        new Vector3(...tail2).distanceTo(new Vector3(...tail1)) + reachFrom(mesh, 'tail2', tail2),
        tail,
      ).toBeCloseTo(total * H, 6);
    }
    // The flat tail is a paddle of 0.45 H wide and at most 0.06 H thick, with its broad face
    // to the back.
    const paddle = boundsOf(variant({ tail: 'flat' }).mesh, 'tail2');
    expect(paddle.max[0] - paddle.min[0]).toBeLessThanOrEqual(0.45 * H + 1e-6);
    expect(paddle.max[0] - paddle.min[0]).toBeGreaterThan(0.45 * Math.cos(Math.PI / 8) * H);
    // The puff is a ball of 0.42 H, and it stands 0.25 H out of the back of the torso.
    const puff = variant({ tail: 'puff' }).mesh;
    expect(spanOf(puff, 'tail1')).toBeCloseTo(0.42 * H, 6);
    expect(boundsOf(puff, 'tail1').max[2] - boundsOf(puff, 'spine').max[2]).toBeGreaterThan(
      0.25 * H,
    );
  });

  it('gives the bushy tail a tip of the belly color above the floor, seated and standing', () => {
    const belly = srgb(SPECIES.rabbit.colors.belly);
    for (const stance of [seated(0.4), { kind: 'standing' } as const]) {
      const builder = new MeshBuilder();
      const body = buildBiped(builder, { ...SPECIES.rabbit, tail: 'bushy' }, stance);
      const mesh = builder.build();
      const tip = verticesWithColor(mesh, belly, ['tail2']);
      expect(tip.length).toBeGreaterThan(0);
      // The tip is the lowest part of the tail, 0.12 m above the floor.
      expect(Math.min(...tip.map((p) => p[1]))).toBeCloseTo(bottomOf(mesh, 'tail2'), 9);
      expect(bottomOf(mesh, 'tail2')).toBeGreaterThan(0.1);
      expect(body.positions.tail2[1]).toBeGreaterThan(bottomOf(mesh, 'tail2'));
    }
  });

  it('makes each long tail one closed round tube that blends its bones at the joint', () => {
    for (const tail of ['bushy', 'thin', 'flat'] as const) {
      const { mesh, body } = variant({ tail });
      const whole = cornersOn(mesh, ['tail1', 'tail2']);
      expect(openEdges(whole), tail).toBe(0);
      expect(surfaceCount(whole), tail).toBe(1);

      // The band of smoothstep(-0.08 H, 0.08 H) gives the ring at the joint the weight 0.5.
      const joint = new Vector3(...body.positions.tail2);
      let blended = 0;
      for (let c = 0; c < mesh.bones.length; c++) {
        const p = new Vector3(
          mesh.positions[c * 3],
          mesh.positions[c * 3 + 1],
          mesh.positions[c * 3 + 2],
        );
        const onTail = [boneIndex('tail1'), boneIndex('tail2')].includes(mesh.bones[c] ?? -1);
        if (onTail && (mesh.blendWeights[c] ?? 0) > 0 && p.distanceTo(joint) < 0.3 * H) {
          blended++;
          const pair = [mesh.bones[c], mesh.blendBones[c]].toSorted((a = 0, b = 0) => a - b);
          expect(pair, tail).toEqual([boneIndex('tail1'), boneIndex('tail2')]);
        }
      }
      expect(blended, tail).toBeGreaterThan(0);
      expect(
        mesh.blendWeights.some((w) => Math.abs(w - 0.5) < 1e-6),
        tail,
      ).toBe(true);

      // The faces of a round tube turn by less than 40° from their neighbors near the joint. The
      // first tails were two lathes with flat ends there. The flat paddle has a sharp rim.
      if (tail !== 'flat') {
        const tube = cornersOn(mesh, ['tail1', 'tail2']);
        expect(largestFold(tube, body.positions.tail2, 0.3 * H, [0, 0, 1]), tail).toBeLessThan(40);
      }
    }
  });

  it('rounds the puff tail: no face turns by 40° from its neighbor', () => {
    const { mesh, body } = variant({ tail: 'puff' });
    // A ball of 10 sides and 5 rings. The icosahedron of the first puff had faces 42° apart.
    for (const facing of [
      [0, 0, 1],
      [0, 0, -1],
    ] as const) {
      expect(largestFold(cornersOn(mesh, ['tail1']), body.positions.tail1, H, facing)).toBeLessThan(
        40,
      );
    }
  });
});
