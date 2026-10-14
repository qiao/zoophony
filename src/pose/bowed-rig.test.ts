import { describe, expect, it } from 'vitest';

import { buildPlayer } from '../models/player.ts';
import { bowedRig, holdOf } from './bowed-rig.ts';

describe('the reached part of the bow hair (design 5.3)', () => {
  it('keeps the free hair of the hold at each end of the reached part', () => {
    const model = buildPlayer('rabbit', 'violin');
    const hold = holdOf('rabbit', 'violin');

    for (const freeHair of [0.04, 0.08]) {
      const rig = bowedRig(model, 'violin', { ...hold, freeHair });
      const [low, high] = rig.bowRange;
      const label = `free hair ${freeHair} m`;
      // The rabbit reaches the whole hair inside a free hair of 0.04 m or more, so the range
      // touches both ends.
      expect(low, label).toBeCloseTo(freeHair, 6);
      expect(high, label).toBeLessThanOrEqual(rig.hairLength - freeHair + 1e-6);
      expect(high, label).toBeGreaterThan(rig.hairLength - freeHair - 0.005);
    }
  });
});
