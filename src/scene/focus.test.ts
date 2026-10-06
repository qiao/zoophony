import { describe, expect, it } from 'vitest';

import { FIELD_OF_VIEW, defaultView, farPlane } from '../shots/view.ts';
import { LENS, apertureAt, blurAt, blurScale, focusOf } from './focus.ts';

describe('blurScale', () => {
  it('follows the thin lens: the scale halves when the focus distance doubles', () => {
    const near = blurScale(4, 30, 0.07);
    expect(blurScale(8, 30, 0.07)).toBeCloseTo(near / 2, 12);
    // A = 0.07 m, s = 4 m, and tan(15°) = 0.268: 0.07 / (2 × 4 × 0.268) = 0.0327.
    expect(near).toBeCloseTo(0.07 / (8 * Math.tan(Math.PI / 12)), 12);
  });

  it('gives a narrow field of view more blur', () => {
    expect(blurScale(4, 20, 0.07)).toBeGreaterThan(blurScale(4, 30, 0.07));
  });
});

describe('blurAt', () => {
  it('is 0 at the focus, negative in front of it, and positive behind it', () => {
    const scale = blurScale(4, 30, LENS.aperture);
    expect(blurAt(4, 4, scale)).toBe(0);
    expect(blurAt(3, 4, scale)).toBeLessThan(0);
    expect(blurAt(12, 4, scale)).toBeGreaterThan(0);
  });

  it('limits the disc to the largest blur', () => {
    const scale = blurScale(4, 30, LENS.aperture);
    expect(blurAt(0.2, 4, scale)).toBe(-LENS.maxBlur);
    expect(blurAt(1e6, 0.5, blurScale(0.5, 30, LENS.aperture))).toBe(LENS.maxBlur);
  });
});

describe('apertureAt', () => {
  it('opens fully for a close camera, and closes for a far camera, with no jump', () => {
    const side = 11.19;
    expect(apertureAt(4, side)).toBe(LENS.aperture);
    expect(apertureAt(1.5 * side, side)).toBe(0);
    const steps = [1.0, 1.1, 1.2, 1.3, 1.4, 1.5].map((k) => apertureAt(k * side, side));
    expect(steps).toEqual(steps.toSorted((a, b) => b - a));
  });
});

describe('focusOf (design 4.5, post effects)', () => {
  // The stage of the default demo, and the default view at 1440 × 900.
  const side = 11.19;
  const view = defaultView(side, 1440, 900);

  it('keeps the stage of the default view sharp, and skips the blur passes there', () => {
    const focus = focusOf(
      view.position,
      view.target,
      FIELD_OF_VIEW,
      farPlane(view.distance, side),
      side,
    );
    expect(focus.active).toBe(false);
    // The near corner and the far corner of the stage are about S / √2 nearer and farther.
    for (const depth of [focus.distance - side / Math.SQRT2, focus.distance + side / Math.SQRT2]) {
      expect(Math.abs(blurAt(depth, focus.distance, focus.scale))).toBeLessThan(LENS.sharpBlur);
    }
  });

  it('gives a close shot a shallow depth of field: the back of the hall is a large disc', () => {
    const focus = focusOf([0, 1.5, 4], [0, 1, 0], FIELD_OF_VIEW, 40, side);
    expect(focus.active).toBe(true);
    // The hall wall stands about 15 m behind the subject of the shot.
    expect(blurAt(19, focus.distance, focus.scale)).toBeGreaterThan(0.02);
    // A player 1 m behind the subject is a little soft, as in the close shots of scene.png.
    expect(blurAt(5, focus.distance, focus.scale)).toBeGreaterThan(LENS.sharpBlur);
  });

  it('skips the blur when even the far plane is sharp', () => {
    const focus = focusOf([0, 0, 200], [0, 0, 0], FIELD_OF_VIEW, 230, 200);
    expect(focus.active).toBe(false);
  });
});
