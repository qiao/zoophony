import { describe, expect, it } from 'vitest';

import { insideBeam } from './beam.ts';

describe('insideBeam (design 4.5)', () => {
  it('holds the points of the cone from the light circle of 0.75 S to the light at 1.2 S', () => {
    const S = 10;
    expect(insideBeam(S, [0, 0.1, 0])).toBe(true);
    expect(insideBeam(S, [7.4, 0.01, 0])).toBe(true);
    expect(insideBeam(S, [7.6, 0.01, 0])).toBe(false);
    // Half way up, the radius is (7.5 + 0.2) / 2 = 3.85 m.
    expect(insideBeam(S, [0, 6, 3.8])).toBe(true);
    expect(insideBeam(S, [0, 6, 3.9])).toBe(false);
    expect(insideBeam(S, [0, 12.5, 0])).toBe(false);
    expect(insideBeam(S, [0, -0.1, 0])).toBe(false);
  });
});
