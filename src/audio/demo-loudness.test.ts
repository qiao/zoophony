import { describe, expect, it } from 'vitest';

import { DEMO_IDS, PERF_60 } from '../app/demos.ts';
import { DEMO_LOUDNESS, TARGET_LOUDNESS, pieceGainDb } from './demo-loudness.ts';

describe('pieceGainDb (design 6.8)', () => {
  it('brings each demo to the target loudness', () => {
    for (const id of DEMO_IDS) {
      expect(DEMO_LOUDNESS[id] + pieceGainDb(id)).toBeCloseTo(TARGET_LOUDNESS, 5);
    }
  });

  it('turns the loud Beethoven demo down and the quiet Mozart concerto up', () => {
    expect(pieceGainDb('beethoven-5')).toBe(-1.4);
    expect(pieceGainDb('mozart-k488')).toBe(7.3);
    expect(pieceGainDb(DEMO_IDS[0])).toBe(0.5);
  });

  it('gives 0 dB to a file of the user and to perf-60.mid', () => {
    expect(pieceGainDb(null)).toBe(0);
    expect(pieceGainDb(PERF_60)).toBe(0);
  });
});
