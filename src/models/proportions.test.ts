import { describe, expect, it } from 'vitest';

import { buildBiped } from './biped.ts';
import { seated } from './body-frame.ts';
import { MeshBuilder } from './mesh.ts';
import { proportionsOf } from './proportions.ts';
import type { BodyProportions } from './proportions.ts';
import { SPECIES } from './species.ts';
import type { SpeciesParams } from './species.ts';
import { boundsOf, joinsAtMostOneJoint } from './test-body.ts';
import { cornersOn, openEdges, volumeOf } from './test-limbs.ts';

/** The seat height of the bodies of these tests, in meters. */
const SEAT = 0.35;

/**
 * A skeleton far from the default: the red fox of option A of the proportions report
 * (`docs/research/2026-10-07-proportions.md`, 5.2), with a shallow torso.
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
  torsoDepth: 0.8,
  standingBase: 0.77,
};

/**
 * Builds the parametric red fox with a skeleton.
 *
 * @param proportions The skeleton.
 * @returns The mesh and the bones.
 */
function fox(proportions: Partial<BodyProportions>) {
  const { sculpt: _sculpt, ...parametric } = SPECIES['fox-red'];
  const species: SpeciesParams = { ...parametric, proportions };
  const builder = new MeshBuilder();
  const body = buildBiped(builder, species, seated(SEAT));
  return { mesh: builder.build(), body };
}

describe('proportionsOf (design 4.3)', () => {
  it('gives the skeleton of design 4.5 to a species with no proportions', () => {
    expect(proportionsOf(SPECIES.rabbit)).toEqual({
      headHeight: 0.38,
      headCenter: 1.8,
      shoulderHeight: 0.98,
      shoulderSpread: 0.52,
      upperArm: 0.7,
      forearm: 0.65,
      hipSpread: 0.32,
      seatedKnee: { forward: 0.66, height: 0.22 },
      torsoDepth: 1,
      standingBase: 0.77,
    });
  });

  it('scales the default head height with the size, and gives the knee of the leg group', () => {
    const bear = proportionsOf(SPECIES.bear);

    expect(bear.headHeight).toBeCloseTo(0.38 * 1.35, 12);
    expect(bear.seatedKnee).toEqual({ forward: 0.68, height: 0.24 });
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
  const { mesh, body } = fox(LONG_TORSO);
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

  it('keeps the edges of the trunk grid, with each triangle on one joint at most', () => {
    // The color borders cut the triangles, so the grid has open edges along each border. The map
    // of the heights moves the rings and keeps their order, so the grid keeps its edges.
    const bones = ['hips', 'spine', 'chest', 'neck', 'head'] as const;
    const trunk = cornersOn(mesh, bones);

    expect(openEdges(trunk)).toBe(openEdges(cornersOn(fox({}).mesh, bones)));
    expect(volumeOf(trunk)).toBeGreaterThan(0);
    for (let t = 0; t < mesh.bones.length / 3; t++) {
      expect(joinsAtMostOneJoint(mesh, t), `triangle ${t}`).toBe(true);
    }
  });

  it('scales the depth of the torso with the torso depth of the table', () => {
    const depth = (built: ReturnType<typeof fox>): number => {
      const box = boundsOf(built.mesh, 'spine');
      return box.max[2] - box.min[2];
    };

    expect(depth(fox({ torsoDepth: 0.8 })) / depth(fox({}))).toBeCloseTo(0.8, 6);
  });

  it('refuses a neck ring that is not above the shoulder joints', () => {
    expect(() => fox({ headCenter: 1.4 })).toThrow('not above the shoulder joints');
  });
});
