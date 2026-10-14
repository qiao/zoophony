import { describe, expect, it } from 'vitest';

import { SPECIES } from '../src/models/species.ts';
import { holdReachLines, ruleFactor, violinReachAt } from './hold-reach.ts';

describe('ruleFactor', () => {
  it('gives the factor that puts the scroll at the distance of the arm from the shoulder', () => {
    // The tail end at the shoulder joint, and the scroll 1 m out.
    expect(ruleFactor([0, 0, 0], [1, 0, 0], [0, 0, 0], 0.5)).toBeCloseTo(0.5, 12);
    // The shoulder joint 0.3 m beside the line, and the scroll 0.4 m from the tail end.
    expect(ruleFactor([0, 0, 0], [0.4, 0, 0], [0, 0.3, 0], 0.5)).toBeCloseTo(1, 12);
  });

  it('gives null when no length of the instrument comes to the palm', () => {
    // The line stays 0.3 m from the shoulder joint, and the arm is 0.2 m long.
    expect(ruleFactor([0, 0, 0], [0.4, 0, 0], [0, 0.3, 0], 0.2)).toBeNull();
    // The scroll points away from the shoulder joint, and the tail end is out of reach.
    expect(ruleFactor([0, 0, 0], [-1, 0, 0], [1, 0, 0], 0.5)).toBeNull();
  });
});

describe('pnpm hold-reach (design 4.6)', () => {
  it('puts the scroll in the middle of the palm when the player has the violin of the rule', () => {
    // The violin of the app is about twice the violin of the rule for the rabbit.
    const reach = violinReachAt('rabbit', 'chair', 1);
    const factor = reach.ruleFactor;
    if (factor === null) {
      throw new Error('The rule gives no violin for the rabbit.');
    }

    const rebuilt = violinReachAt('rabbit', 'chair', reach.scale * factor);
    expect(factor).toBeLessThan(0.7);
    expect(rebuilt.length).toBeCloseTo(reach.length * factor, 6);
    expect(Math.abs(rebuilt.scroll - rebuilt.arms.L)).toBeLessThan(1e-3);
  });

  it('puts the violin scale of the species back after the measure', () => {
    const before = SPECIES.rabbit.violinScale;
    violinReachAt('rabbit', 'chair', 0.3);
    violinReachAt('fox-red', 'chair', 0.3);
    expect(SPECIES.rabbit.violinScale).toBe(before);
    expect(Object.hasOwn(SPECIES['fox-red'], 'violinScale')).toBe(false);
  });

  it('reports the arms, the reached parts, and the rule for each instrument', () => {
    const violin = holdReachLines('rabbit', 'violin', 'chair').join('\n');
    for (const part of [
      'Arm from the shoulder joint to the middle of the palm',
      'Left shoulder joint to the scroll',
      'stopRange',
      'bowRange',
      'Rule of a violin shop',
      'Real violins',
      'Check, rebuilt',
    ]) {
      expect(violin, part).toContain(part);
    }
    const viola = holdReachLines('rabbit', 'viola', 'chair').join('\n');
    expect(viola).toContain('Rule of a violin shop');
    expect(viola).toContain('no scale of the viola');
  });
});
