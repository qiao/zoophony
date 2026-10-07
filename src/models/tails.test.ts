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
  volumeOn,
} from './test-body.ts';

/** The tail types that the tests build (design 4.3). */
const TAIL_TYPES: readonly SpeciesParams['tail'][] = ['none', 'puff', 'bushy', 'thin', 'flat'];

describe('addTail', () => {
  it('builds each tail type on its bones, with faces that point out', () => {
    for (const tail of TAIL_TYPES) {
      const { mesh } = variant({ tail });
      const bones = { none: 0, puff: 1, bushy: 2, thin: 2, flat: 2 }[tail];
      expect(trianglesOn(mesh, 'tail1') > 0).toBe(bones >= 1);
      expect(trianglesOn(mesh, 'tail2') > 0).toBe(bones === 2);
      if (bones >= 1) {
        expect(volumeOn(mesh, 'tail1')).toBeGreaterThan(0);
      }
      if (bones === 2) {
        expect(volumeOn(mesh, 'tail2')).toBeGreaterThan(0);
      }
    }
  });

  it('gives the tails the lengths of design 4.5', () => {
    for (const [tail, total, tipRadius] of [
      ['bushy', 1.1, 0],
      ['thin', 0.7, 0.025],
    ] as const) {
      const { mesh, body } = variant({ tail });
      const { tail1, tail2 } = body.positions;
      const second = Math.sqrt(reachFrom(mesh, 'tail2', tail2) ** 2 - (tipRadius * H) ** 2);
      expect(new Vector3(...tail2).distanceTo(new Vector3(...tail1)) + second).toBeCloseTo(
        total * H,
        6,
      );
    }
    // The flat tail is a stalk and a paddle of 0.45 H wide and 0.06 H thick.
    const flat = variant({ tail: 'flat' });
    const { tail1, tail2 } = flat.body.positions;
    const paddle = Math.sqrt(
      reachFrom(flat.mesh, 'tail2', tail2) ** 2 - (0.225 ** 2 + 0.03 ** 2) * H * H,
    );
    expect(new Vector3(...tail2).distanceTo(new Vector3(...tail1)) + paddle).toBeCloseTo(
      0.5 * H,
      6,
    );
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
});
