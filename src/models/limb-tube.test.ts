import { describe, expect, it } from 'vitest';

import { inMeters, limbTube } from './limb-tube.ts';
import { signedVolume } from './primitives.ts';

describe('limbTube', () => {
  it('makes a closed tube along its axis, with the corners near the radii of its rings', () => {
    const corners = limbTube(
      [0, 1, 0],
      [0, 0, 0],
      [
        [0, 0, 0, 0],
        [0.2, 0.1, 0.1, 0.1],
        [0.8, 0.2, 0.2, 0.2],
        [1, 0, 0, 0],
      ],
      [0, 0, -1],
      7,
    );

    // A closed tube with outward faces has a positive volume, a little less than its cylinder.
    const volume = signedVolume(corners);
    expect(volume).toBeGreaterThan(0);
    expect(volume).toBeLessThan(Math.PI * 0.2 ** 2);
    for (let i = 0; i < corners.length; i += 3) {
      const [x, y, z] = [corners[i] ?? 0, corners[i + 1] ?? 0, corners[i + 2] ?? 0];
      expect(y).toBeGreaterThanOrEqual(-1e-9);
      expect(y).toBeLessThanOrEqual(1 + 1e-9);
      // The jitter moves each corner by at most 5% of its radius.
      expect(Math.hypot(x, z)).toBeLessThanOrEqual(0.2 * 1.05 + 1e-9);
    }
  });
});

describe('inMeters', () => {
  it('scales the radii of each section by the head height, and keeps the place', () => {
    expect(inMeters(0.5, [[0.3, 1, 2, 3]])).toEqual([[0.3, 0.5, 1, 1.5]]);
  });
});
