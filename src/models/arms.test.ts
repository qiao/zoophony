import { describe, expect, it } from 'vitest';

import { BONE_NAMES } from './rig.ts';
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

  it('grows the mitten by 1.2, and keeps its palm side and its finger tips in place', () => {
    const { mesh, body } = variant({});
    // The first mitten balls were icosahedra: they reached 0.851 of their half sizes.
    const reach = (1 + Math.sqrt(5)) / 2 / Math.hypot(1, (1 + Math.sqrt(5)) / 2);
    for (const [side, sign] of [
      ['L', -1],
      ['R', 1],
    ] as const) {
      const palm = boundsOf(mesh, `hand${side}`);
      const fingers = boundsOf(mesh, `fingers${side}`);
      const wrist = body.positions[`hand${side}`];
      const block = side === 'L' ? body.fingerBlockL : body.fingerBlockR;
      // The palm ball is 1.2 × 0.18 H high, and its inner side stays where the bow lies.
      expect(palm.max[1] - palm.min[1]).toBeCloseTo(1.2 * 0.18 * H, 6);
      const inner = sign > 0 ? palm.min[0] : palm.max[0];
      expect(inner).toBeCloseTo(wrist[0] - sign * reach * 0.13 * H, 6);
      // The tip of the finger ball stays, and the ball grows toward the knuckles.
      expect(fingers.min[1]).toBeCloseTo(block[1] - reach * 0.08 * H, 6);
      expect(fingers.max[1] - fingers.min[1]).toBeCloseTo(1.2 * 0.16 * H, 6);
    }
  });

  it('makes each arm a round tube of 6 sides from the shoulder dome to the wrist', () => {
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
        expect(ring, `${girth} ${radius}`).toHaveLength(6);
        for (const r of ring) {
          expect(r / H, `${girth} ${radius}`).toBeCloseTo(radius * girth, 5);
        }
      }
      // The dome rises over the shoulder joint by the radius at the shoulder.
      expect(boundsOf(mesh, 'upperArmR').max[1] - p.upperArmR[1]).toBeCloseTo(0.2 * girth * H, 6);
    }
  });

  it('closes the arm tube, and puts the elbow filler inside the skin', () => {
    const { mesh, body } = variant({});
    const p = body.positions;
    for (const side of ['L', 'R'] as const) {
      // The tube and the filler ball of 0.9 of the elbow radius.
      const arm = cornersOn(mesh, [`upperArm${side}`, `forearm${side}`]);
      expect(openEdges(arm), side).toBe(0);
      expect(volumeOf(arm), side).toBeGreaterThan(0);
      expect(surfaceCount(arm), side).toBe(2);
    }

    let fillers = 0;
    for (let t = 0; t < mesh.fillers.length; t++) {
      if (mesh.fillers[t] !== 1) {
        continue;
      }

      fillers++;
      const side = Math.sign(mesh.positions[t * 9] ?? 0);
      expect(BONE_NAMES[mesh.bones[t * 3] ?? 0]).toBe(side < 0 ? 'forearmL' : 'forearmR');
      for (let k = 0; k < 3; k++) {
        const x = (mesh.positions[t * 9 + k * 3] ?? 0) - side * p.forearmR[0];
        const z = (mesh.positions[t * 9 + k * 3 + 2] ?? 0) - p.forearmR[2];
        // The faces of a ring of 6 sides are cos(30°) of the radius from the axis.
        expect(Math.hypot(x, z)).toBeLessThan(Math.cos(Math.PI / 6) * 0.16 * H);
      }
    }
    // A ball of 6 sides and 3 rings has 24 triangles.
    expect(fillers).toBe(2 * 24);
  });

  it('blends only the ring of the elbow joint, half on each bone (design 4.7)', () => {
    const { mesh, body } = variant({});
    const elbow = body.positions.forearmR[1];
    let blended = 0;
    for (let c = 0; c < mesh.bones.length; c++) {
      const weight = mesh.blendWeights[c] ?? 0;
      const bone = BONE_NAMES[mesh.bones[c] ?? 0] ?? '';
      if (weight === 0 || !/^upperArm[LR]$/.test(bone)) {
        continue;
      }

      // The band of smoothstep(-0.06 H, 0.06 H) holds the rings at -0.06, 0, and 0.06 H.
      blended++;
      expect(weight).toBeCloseTo(0.5, 6);
      expect(mesh.positions[c * 3 + 1]).toBeCloseTo(elbow, 6);
      expect(BONE_NAMES[mesh.blendBones[c] ?? 0]).toMatch(/^forearm[LR]$/);
    }
    expect(blended).toBeGreaterThan(0);
  });
});
