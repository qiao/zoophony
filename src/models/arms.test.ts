import { describe, expect, it } from 'vitest';

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

  it('closes the two parts of the arm tube with half balls around the elbow joint', () => {
    const { mesh, body } = variant({});
    const p = body.positions;
    for (const bone of ['upperArmL', 'forearmL', 'upperArmR', 'forearmR'] as const) {
      const part = cornersOn(mesh, [bone]);
      expect(openEdges(part), bone).toBe(0);
      expect(volumeOf(part), bone).toBeGreaterThan(0);
      expect(surfaceCount(part), bone).toBe(1);
    }
    // The upper arm ends 0.16 H below the elbow joint, and the forearm starts 0.16 H above it:
    // the radius of the arm at the elbow. The flat ends of the first split showed a rim in a
    // bent elbow.
    const elbow = p.forearmR[1];
    expect(elbow - boundsOf(mesh, 'upperArmR').min[1]).toBeCloseTo(0.16 * H, 6);
    expect(
      Math.max(...cornersOn(mesh, ['forearmR']).filter((_, i) => i % 3 === 1)) - elbow,
    ).toBeCloseTo(0.16 * H, 6);
    expect(mesh.fillers.every((f) => f === 0)).toBe(true);
  });
});
