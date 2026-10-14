import { describe, expect, it } from 'vitest';

import { SPECIES } from '../src/models/species.ts';
import { SPECIES_HOLDS } from '../src/pose/bowed-rig.ts';
import {
  holdReachLines,
  holdReachVariantLines,
  parseReachOptions,
  ruleFactor,
  ruleSize,
  violinReachAt,
} from './hold-reach.ts';
import type { HoldReach } from './hold-reach.ts';

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

describe('ruleSize', () => {
  const reach: HoldReach = {
    arms: { L: 0.4, R: 0.4 },
    length: 0.5,
    scale: 0.8,
    scroll: 0.3,
    stopRange: [0, 1],
    bowRange: [0, 0.4],
    hairLength: 0.4,
    ruleFactor: 0.5,
  };

  it('multiplies the scale and the length by the factor of the rule', () => {
    expect(ruleSize(reach)).toEqual({ scale: 0.4, length: 0.25 });
  });

  it('gives null when no length puts the scroll in the palm', () => {
    expect(ruleSize({ ...reach, ruleFactor: null })).toBeNull();
  });
});

describe('pnpm hold-reach (design 4.6)', () => {
  it('puts the scroll in the middle of the palm when the player has the violin of the rule', () => {
    // The violin of the app is larger than the violin of the rule for the rabbit.
    const reach = violinReachAt('rabbit', 'chair', 1);
    const factor = reach.ruleFactor;
    if (factor === null) {
      throw new Error('The rule gives no violin for the rabbit.');
    }

    const rebuilt = violinReachAt('rabbit', 'chair', reach.scale * factor);
    expect(factor).toBeLessThan(1);
    expect(rebuilt.length).toBeCloseTo(reach.length * factor, 6);
    expect(Math.abs(rebuilt.scroll - rebuilt.arms.L)).toBeLessThan(1e-3);
  });

  it('puts the violin scale of the species back after the measure', () => {
    const before = SPECIES.rabbit.violinScale;
    violinReachAt('rabbit', 'chair', 0.3);
    violinReachAt('fox-tan', 'chair', 0.3);
    expect(SPECIES.rabbit.violinScale).toBe(before);
    expect(Object.hasOwn(SPECIES['fox-tan'], 'violinScale')).toBe(false);
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

describe('parseReachOptions', () => {
  it('gives the violin on the chair with no variant by default', () => {
    expect(parseReachOptions([])).toEqual({ instrument: 'violin', support: 'chair', sets: [] });
  });

  it('reads each --set as one variant beside the other options', () => {
    const options = parseReachOptions([
      '--set',
      'violin@rabbit.lean=12deg',
      '--support',
      'stand',
      '--set',
      'violin@rabbit.slant=0;violin@rabbit.lean=0',
    ]);
    expect(options.support).toBe('stand');
    expect(options.sets).toEqual([
      'violin@rabbit.lean=12deg',
      'violin@rabbit.slant=0;violin@rabbit.lean=0',
    ]);
  });

  it('stops on an unknown option, on an option with no value, and on a value that is not permitted', () => {
    expect(() => parseReachOptions(['--glow', 'x'])).toThrow('is not known');
    expect(() => parseReachOptions(['--set'])).toThrow('has no value');
    expect(() => parseReachOptions(['--support', 'floor'])).toThrow('--support takes one of');
  });
});

describe('holdReachVariantLines', () => {
  /**
   * Gives the distance from the left shoulder joint to the scroll of each report of the lines.
   *
   * @param lines The lines of the reports.
   * @returns The distances, in meters.
   */
  const scrolls = (lines: readonly string[]): number[] =>
    lines.flatMap((line) => {
      const match = /to the scroll in the playing pose: ([\d.]+) m/.exec(line);
      return match ? [Number(match[1])] : [];
    });

  it('measures each variant with its changes, and puts the holds back after it', () => {
    const shift = SPECIES_HOLDS.rabbit?.violin?.playShift;
    const lines = holdReachVariantLines('rabbit', {
      instrument: 'violin',
      support: 'chair',
      sets: ['violin@rabbit.playShift=-0.054,-0.005,0.311'],
    });

    expect(lines[0]).toBe('base:');
    expect(lines).toContain('violin@rabbit.playShift=-0.054,-0.005,0.311:');
    const [base = 0, moved = 0] = scrolls(lines);
    // The violin moves 0.16 H back, so its scroll comes nearer to the left shoulder joint.
    expect(moved).toBeLessThan(base - 0.01);
    expect(SPECIES_HOLDS.rabbit?.violin?.playShift).toEqual(shift);
  });

  it('stops on a variant that does not fit before the first report', () => {
    expect(() =>
      holdReachVariantLines('rabbit', {
        instrument: 'violin',
        support: 'chair',
        sets: ['violin@rabbit.nothing=1'],
      }),
    ).toThrow('is not known');
  });
});
