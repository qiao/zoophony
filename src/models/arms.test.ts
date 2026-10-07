import { describe, expect, it } from 'vitest';

import { H, boundsOf, rabbit, variant } from './test-body.ts';

describe('buildArms', () => {
  it('gives the arm segments of design 4.5: 0.7 H and 0.65 H', () => {
    const { positions } = rabbit();
    expect(positions.upperArmL[1] - positions.forearmL[1]).toBeCloseTo(0.7 * H, 9);
    expect(positions.forearmL[1] - positions.handL[1]).toBeCloseTo(0.65 * H, 9);
  });

  it('gives the middle of each finger block, below the knuckles', () => {
    const { mesh, body } = variant({});
    for (const side of ['L', 'R'] as const) {
      const { min, max } = boundsOf(mesh, `fingers${side}`);
      const middle = min.map((low, i) => (low + (max[i] ?? 0)) / 2);
      const block = side === 'L' ? body.fingerBlockL : body.fingerBlockR;
      for (const [i, value] of block.entries()) {
        expect(value, `${side} ${i}`).toBeCloseTo(middle[i] ?? 0, 6);
      }
      expect(body.positions[`fingers${side}`][1] - block[1]).toBeCloseTo(0.05 * H, 9);
    }
  });
});
