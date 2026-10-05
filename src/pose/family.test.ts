import { describe, expect, it } from 'vitest';

import type { InstrumentId } from '../models/instruments/types.ts';
import { MOTION_FAMILIES, isInFamily } from './family.ts';

const INSTRUMENTS = Object.keys(MOTION_FAMILIES).filter(
  (id): id is InstrumentId => id in MOTION_FAMILIES,
);

describe('isInFamily', () => {
  it('finds the instruments of the given motion families only', () => {
    expect(isInFamily('violin', ['bowed'])).toBe(true);
    expect(isInFamily('horn', ['woodwind', 'brass'])).toBe(true);
    expect(isInFamily('flute', ['woodwind', 'brass'])).toBe(true);
    expect(isInFamily('piano', ['bowed', 'woodwind', 'brass'])).toBe(false);
    expect(isInFamily('baton', [])).toBe(false);
  });

  it('agrees with the table of the motion families for each instrument', () => {
    expect(INSTRUMENTS).toHaveLength(22);
    for (const id of INSTRUMENTS) {
      expect(isInFamily(id, [MOTION_FAMILIES[id]]), id).toBe(true);
    }
  });
});
