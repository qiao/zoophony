import { describe, expect, it } from 'vitest';

import { seated } from './body-frame.ts';
import { DEFAULT_PROPORTIONS, proportionsOf } from './proportions.ts';
import type { BodyProportions } from './proportions.ts';
import { SPECIES } from './species.ts';
import { builtBody, joinsAtMostOneJoint } from './test-body.ts';
import type { BuiltBody } from './test-body.ts';
import { cornersOn, openEdges, volumeOf } from './test-limbs.ts';

/** The seat height of the bodies of these tests, in meters. */
const SEAT = 0.35;

/**
 * A skeleton far from the default: the red fox of option A of the proportions report
 * (`docs/research/2026-10-07-proportions.md`, 5.2).
 */
const LONG_TORSO: BodyProportions = {
  headHeight: 0.327,
  headCenter: 2.05,
  shoulderHeight: 1.47,
  shoulderSpread: 0.35,
  upperArm: 0.81,
  forearm: 0.75,
  hipSpread: 0.38,
  seatedKnee: { forward: 0.9, height: 0.12 },
  seatHeight: 0.92,
  standingBase: 0.77,
  standingThigh: 0.45,
};

/**
 * Builds the parametric wolf with a skeleton. The red fox has a body of its own (design 4.4).
 *
 * @param proportions The skeleton.
 * @returns The mesh and the bones.
 */
function wolf(proportions: Partial<BodyProportions>): BuiltBody {
  return builtBody({ ...SPECIES.wolf, proportions }, seated(SEAT));
}

describe('proportionsOf (design 4.3)', () => {
  it('gives the default skeleton to a species with no proportions', () => {
    expect(proportionsOf({ ...SPECIES.rabbit, proportions: {} })).toEqual({
      headHeight: 0.38,
      ...DEFAULT_PROPORTIONS,
    });
  });

  it('scales the default head height with the size', () => {
    const bear = proportionsOf({ ...SPECIES.bear, proportions: {} });

    expect(bear.headHeight).toBeCloseTo(0.38 * 1.35, 12);
  });

  it('keeps each value that a species gives, and fills the others with their defaults', () => {
    const own = proportionsOf({
      ...SPECIES['fox-red'],
      proportions: {
        headHeight: 0.327,
        shoulderHeight: 1.47,
        seatedKnee: { forward: 0.9, height: 0.12 },
      },
    });

    expect(own.headHeight).toBe(0.327);
    expect(own.shoulderHeight).toBe(1.47);
    expect(own.seatedKnee).toEqual({ forward: 0.9, height: 0.12 });
    expect(own.headCenter).toBe(1.8);
    expect(own.upperArm).toBe(0.7);
  });
});

describe('the skeleton of a species in the body (design 4.3)', () => {
  const { mesh, body } = wolf(LONG_TORSO);
  const p = body.positions;
  const h = LONG_TORSO.headHeight;
  const above = (point: readonly number[]): number => ((point[1] ?? NaN) - SEAT) / h;

  it('puts the head, the joints, and the knee at the places of the table', () => {
    expect(body.headHeight).toBe(h);
    expect(above(body.headCenter)).toBeCloseTo(2.05, 9);
    expect(above(p.head)).toBeCloseTo(1.55, 9);
    expect(above(p.upperArmR)).toBeCloseTo(1.47, 9);
    expect(p.upperArmR[0] / h).toBeCloseTo(0.35, 9);
    expect((p.upperArmR[1] - p.forearmR[1]) / h).toBeCloseTo(0.81, 9);
    expect((p.forearmR[1] - p.handR[1]) / h).toBeCloseTo(0.75, 9);
    expect(p.thighR[0] / h).toBeCloseTo(0.38, 9);
    expect(above(p.shinR)).toBeCloseTo(0.12, 9);
    expect((p.thighR[2] - p.shinR[2]) / h).toBeCloseTo(0.9, 9);
  });

  it('scales the torso below the joints, and keeps the neck between the joints and the head', () => {
    // The joints are 1.5 times as high as on the default skeleton (0.98 H).
    expect(above(p.hips)).toBeCloseTo(0.15 * 1.5, 9);
    expect(above(p.spine)).toBeCloseTo(0.45 * 1.5, 9);
    expect(above(p.chest)).toBeCloseTo(0.75 * 1.5, 9);
    expect(above(p.neck)).toBeGreaterThan(1.47);
    expect(above(p.neck)).toBeLessThan(1.55);
  });

  it('keeps the edges of the trunk, with each triangle on one joint at most', () => {
    // The map of the heights moves the rings and keeps their order, so the trunk keeps its edges.
    const bones = ['hips', 'spine', 'chest', 'neck', 'head'] as const;
    const trunk = cornersOn(mesh, bones);

    expect(openEdges(trunk)).toBe(openEdges(cornersOn(wolf({}).mesh, bones)));
    expect(volumeOf(trunk)).toBeGreaterThan(0);
    for (let t = 0; t < mesh.bones.length / 3; t++) {
      expect(joinsAtMostOneJoint(mesh, t), `triangle ${t}`).toBe(true);
    }
  });

  it('refuses a head bone that is not above the shoulder joints', () => {
    expect(() => wolf({ headCenter: 1.4 })).toThrow('not above the shoulder joints');
  });
});
