import { describe, expect, it } from 'vitest';

import { boneIndex } from './rig.ts';
import { H, boundsOf, rabbit, variant } from './test-body.ts';
import { cornersOn, openEdges, ringRadii, surfaceCount, volumeOf } from './test-limbs.ts';

describe('buildArms', () => {
  it('gives the arm segments of design 4.5: 0.7 H and 0.65 H', () => {
    const { positions } = rabbit();
    expect(positions.upperArmL[1] - positions.forearmL[1]).toBeCloseTo(0.7 * H, 9);
    expect(positions.forearmL[1] - positions.handL[1]).toBeCloseTo(0.65 * H, 9);
  });

  it('keeps the finger block point 0.05 H below the knuckles', () => {
    const { body } = variant({});
    for (const side of ['L', 'R'] as const) {
      const block = side === 'L' ? body.fingerBlockL : body.fingerBlockR;
      const knuckles = body.positions[`fingers${side}`];
      expect(block.map((v, i) => v - (knuckles[i] ?? 0))).toEqual([
        expect.closeTo(0, 9),
        expect.closeTo(-0.05 * H, 9),
        expect.closeTo(0, 9),
      ]);
    }
  });

  it('makes each arm a round tube of 8 sides from the shoulder dome to the wrist', () => {
    for (const girth of [1, 0.75]) {
      const { mesh, body } = variant({ girth });
      const p = body.positions;
      const upper = cornersOn(mesh, ['upperArmR']);
      const fore = cornersOn(mesh, ['forearmR']);
      const radii: readonly (readonly [readonly number[], number])[] = [
        [ringRadii(upper, p.upperArmR, [0, 1, 0]), 0.2],
        [ringRadii(upper, p.forearmR, [0, 1, 0]), 0.16],
        [ringRadii(fore, p.handR, [0, 1, 0]), 0.12],
      ];
      for (const [ring, radius] of radii) {
        expect(ring, `${girth} ${radius}`).toHaveLength(8);
        for (const r of ring) {
          expect(r / H, `${girth} ${radius}`).toBeCloseTo(radius * girth, 5);
        }
      }
      // The dome rises over the shoulder joint by the radius at the shoulder.
      expect(boundsOf(mesh, 'upperArmR').max[1] - p.upperArmR[1]).toBeCloseTo(0.2 * girth * H, 6);
    }
  });

  it('closes the two parts of the arm tube, and puts the elbow filler inside the skin', () => {
    const { mesh, body } = variant({});
    const p = body.positions;
    for (const bone of ['upperArmL', 'forearmL', 'upperArmR', 'forearmR'] as const) {
      const part = cornersOn(mesh, [bone]);
      expect(openEdges(part), bone).toBe(0);
      expect(volumeOf(part), bone).toBeGreaterThan(0);
    }
    // The forearm holds its tube and the filler ball of 0.9 of the elbow radius.
    expect(surfaceCount(cornersOn(mesh, ['forearmR']))).toBe(2);
    let fillers = 0;
    for (let t = 0; t < mesh.fillers.length; t++) {
      if (mesh.fillers[t] !== 1) {
        continue;
      }

      fillers++;
      const side = Math.sign(mesh.positions[t * 9] ?? 0);
      expect(mesh.bones[t * 3]).toBe(boneIndex(side < 0 ? 'forearmL' : 'forearmR'));
      for (let k = 0; k < 3; k++) {
        const x = (mesh.positions[t * 9 + k * 3] ?? 0) - side * p.forearmR[0];
        const z = (mesh.positions[t * 9 + k * 3 + 2] ?? 0) - p.forearmR[2];
        // The faces of a ring of 8 sides are cos(22.5°) of the radius from the axis.
        expect(Math.hypot(x, z)).toBeLessThan(Math.cos(Math.PI / 8) * 0.16 * H);
      }
    }
    expect(fillers).toBe(2 * 32);
  });
});
