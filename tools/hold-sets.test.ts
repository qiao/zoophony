import { describe, expect, it } from 'vitest';

import { MathUtils } from 'three';

import { CONDUCTOR } from '../src/models/cast.ts';
import { buildPlayer } from '../src/models/player.ts';
import { CONDUCTOR_HOLD, conductorRig } from '../src/pose/conductor.ts';
import { BOWED_HOLDS, holdOf } from '../src/pose/bowed-rig.ts';
import { HANDS_HOLDS } from '../src/pose/hands.ts';
import { setHold, setHolds } from './hold-sets.ts';

describe('setHold', () => {
  it('changes a number and a list of a hold in memory, and puts them back', () => {
    const lean = HANDS_HOLDS.piano.lean;
    const offset = HANDS_HOLDS.piano.restL.lap.offset;
    const { undo } = setHolds('piano.lean=16deg; piano.restL.lap.offset=-0.8,0.1,0');
    expect(HANDS_HOLDS.piano.lean).toBeCloseTo(16 * MathUtils.DEG2RAD, 12);
    expect(HANDS_HOLDS.piano.restL.lap.offset).toEqual([-0.8, 0.1, 0]);

    undo();
    expect(HANDS_HOLDS.piano.lean).toBe(lean);
    expect(HANDS_HOLDS.piano.restL.lap.offset).toBe(offset);
  });

  it('stops on an unknown key, a list of another length, and a value that is not a number', () => {
    expect(() => setHold('piano.nope=1')).toThrow('"nope" of piano.nope is not known');
    expect(() => setHold('drums.lean=1')).toThrow('names no hold value');
    expect(() => setHold('piano.palmL=1,2')).toThrow('has 3 numbers');
    expect(() => setHold('piano.lean=abc')).toThrow('is not a number');
    expect(() => setHold('piano.action=pluck')).toThrow('is not a number or a list of numbers');
  });

  it('puts back the changes of a list when one change does not fit', () => {
    const lean = HANDS_HOLDS.piano.lean;
    expect(() => setHolds('piano.lean=1;piano.nope=1')).toThrow('is not known');
    expect(HANDS_HOLDS.piano.lean).toBe(lean);
  });

  it('reaches the rig of the conductor, which reads its hold when the plan is built', () => {
    const model = buildPlayer(CONDUCTOR.species, CONDUCTOR.instrument);
    const before = conductorRig(model).readyDirection;
    const { undo } = setHold(`conductor.readyLift=${CONDUCTOR_HOLD.readyLift / 2}`);
    try {
      expect(conductorRig(model).readyDirection[1]).toBeLessThan(before[1] - 0.1);
    } finally {
      undo();
    }
  });

  it('changes the own hold of a species with the root <instrument>@<species>', () => {
    const own = holdOf('rabbit', 'violin');
    const lean = own.lean;
    expect(own).not.toBe(BOWED_HOLDS.violin);
    const { undo } = setHold('violin@rabbit.lean=20deg');
    try {
      expect(holdOf('rabbit', 'violin').lean).toBeCloseTo(20 * MathUtils.DEG2RAD, 12);
      expect(BOWED_HOLDS.violin.lean).not.toBeCloseTo(20 * MathUtils.DEG2RAD, 12);
    } finally {
      undo();
    }
    expect(holdOf('rabbit', 'violin').lean).toBe(lean);

    // The hold of the instrument does not change the own hold of the species.
    const shared = setHold('violin.lean=20deg');
    try {
      expect(holdOf('rabbit', 'violin').lean).toBe(lean);
    } finally {
      shared.undo();
    }
    expect(() => setHold('drums.lean=1')).toThrow('violin@rabbit');
  });
});
