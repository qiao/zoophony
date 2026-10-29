import { describe, expect, it } from 'vitest';

import { DEMO_IDS, PERF_60 } from '../app/demos.ts';
import { DEMO_LOUDNESS, TARGET_LOUDNESS, pieceGainDb } from './demo-loudness.ts';

describe('pieceGainDb (design 6.8)', () => {
  it('brings each demo to the target loudness with each mix preset', () => {
    for (const mix of ['hall', 'cinematic'] as const) {
      for (const id of DEMO_IDS) {
        expect(DEMO_LOUDNESS[mix][id] + pieceGainDb(id, mix)).toBeCloseTo(TARGET_LOUDNESS, 5);
      }
    }
  });

  it('turns the loud Ode to Joy down and the quiet Eine kleine Nachtmusik up', () => {
    expect(pieceGainDb('beethoven-9', 'hall')).toBeLessThan(0);
    expect(pieceGainDb('mozart-k525', 'hall')).toBeGreaterThan(0);
  });

  it('gives 0 dB to a file of the user and to perf-60.mid', () => {
    expect(pieceGainDb(null, 'hall')).toBe(0);
    expect(pieceGainDb(PERF_60, 'hall')).toBe(0);
  });
});
