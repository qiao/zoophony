import { describe, expect, it } from 'vitest';

import { proportionsOf } from './proportions.ts';
import { SPECIES } from './species.ts';

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
