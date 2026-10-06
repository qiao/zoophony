import { describe, expect, it } from 'vitest';

import { DEMO_IDS } from '../app/demos.ts';
import { DEMO_LOUDNESS, TARGET_LOUDNESS, demoGainDb } from './demo-loudness.ts';

describe('demoGainDb (design 6.8)', () => {
  it('brings each demo to the target loudness', () => {
    for (const id of DEMO_IDS) {
      expect(DEMO_LOUDNESS[id] + demoGainDb(id)).toBeCloseTo(TARGET_LOUDNESS, 5);
    }
  });

  it('turns the loud Beethoven demo down and the quiet Mozart concerto up', () => {
    expect(demoGainDb('beethoven-5')).toBe(-3);
    expect(demoGainDb('mozart-k488')).toBe(4.1);
    expect(demoGainDb(DEMO_IDS[0])).toBe(0);
  });
});
