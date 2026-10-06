import { describe, expect, it } from 'vitest';

import type { Vec3 } from '../models/tuples.ts';
import { CLOSE_BEAM_OPACITY, SHOT_BEAM_OPACITY, freeBeamOpacity } from './beam-opacity.ts';
import { defaultDistance, defaultView } from './view.ts';

const SIDE = 11;

/**
 * Gives a camera on the ray of the default view at a factor of the default distance.
 *
 * @param factor The factor of the default distance.
 * @param aspect The aspect of the view.
 * @returns The camera position.
 */
function cameraAtRatio(factor: number, aspect: number): Vec3 {
  const [x, y, z] = defaultView(SIDE, aspect, 1).position;
  return [x * factor, y * factor, z * factor];
}

describe('SHOT_BEAM_OPACITY (design 5.6)', () => {
  it('keeps the full beam in the wide and high shots, and fades it in the close shots', () => {
    expect(SHOT_BEAM_OPACITY.wide).toBe(1);
    expect(SHOT_BEAM_OPACITY.high).toBe(1);
    for (const kind of ['conductor', 'section', 'solo'] as const) {
      expect(SHOT_BEAM_OPACITY[kind]).toBe(CLOSE_BEAM_OPACITY);
    }
    expect(CLOSE_BEAM_OPACITY).toBeLessThan(0.3);
  });
});

describe('freeBeamOpacity (design 2.5, 4.5)', () => {
  it('gives the full beam at the default view and at the distance of a high shot', () => {
    for (const aspect of [1440 / 900, 1, 390 / 844]) {
      expect(freeBeamOpacity(SIDE, aspect, defaultView(SIDE, aspect, 1).position)).toBe(1);
      expect(freeBeamOpacity(SIDE, aspect, cameraAtRatio(0.6, aspect))).toBe(1);
    }
  });

  it('fades the beam for a camera near the stage', () => {
    for (const aspect of [1440 / 900, 390 / 844]) {
      expect(freeBeamOpacity(SIDE, aspect, cameraAtRatio(0.3, aspect))).toBe(CLOSE_BEAM_OPACITY);
      expect(freeBeamOpacity(SIDE, aspect, [0, 2, 0])).toBe(CLOSE_BEAM_OPACITY);
    }
  });

  it('reads the distance to the stage center as a factor of the default distance', () => {
    // A phone in portrait has a default distance 2.16 times larger, so the same camera is nearer.
    const phone = 390 / 844;
    const far = defaultDistance(SIDE, phone) * 0.6;
    expect(freeBeamOpacity(SIDE, phone, [0, 0, far])).toBe(1);
    expect(freeBeamOpacity(SIDE, 1, [0, 0, far])).toBe(1);
    const near = defaultDistance(SIDE, 1) * 0.6;
    expect(freeBeamOpacity(SIDE, phone, [0, 0, near])).toBe(CLOSE_BEAM_OPACITY);
  });

  it('changes the beam with no jump when the camera zooms in', () => {
    const aspect = 1440 / 900;
    let last = freeBeamOpacity(SIDE, aspect, cameraAtRatio(1, aspect));
    for (let factor = 1; factor >= 0.1; factor -= 0.001) {
      const opacity = freeBeamOpacity(SIDE, aspect, cameraAtRatio(factor, aspect));
      expect(opacity).toBeLessThanOrEqual(last);
      expect(last - opacity).toBeLessThan(0.02);
      last = opacity;
    }
    expect(last).toBe(CLOSE_BEAM_OPACITY);
  });
});
