import { describe, expect, it } from 'vitest';

import { PORTRAIT_RULE, defaultView, farPlane, portraitShare, portraitWide } from './view.ts';

describe('defaultView', () => {
  it('puts the camera in front of the stage and to the right (design 4.5)', () => {
    const view = defaultView(10, 1440, 900);
    expect(view.distance).toBeCloseTo(33, 9);
    const [x, y, z] = view.position;
    expect(Math.hypot(x, y, z)).toBeCloseTo(33, 9);
    // Elevation 28 degrees, azimuth 30 degrees to the right of the audience axis (+z).
    expect((Math.asin(y / 33) * 180) / Math.PI).toBeCloseTo(28, 9);
    expect((Math.atan2(x, z) * 180) / Math.PI).toBeCloseTo(30, 9);
    expect(view.target).toEqual([0, 0, 0]);
  });

  it('keeps the view of the reference on a viewport as wide as it is tall, or wider', () => {
    expect(defaultView(10, 800, 800).distance).toBeCloseTo(33, 9);
    expect(defaultView(10, 1920, 900).distance).toBeCloseTo(33, 9);
  });

  it('gives a lower, more frontal, and nearer camera in portrait (design 4.5, SC8)', () => {
    const view = defaultView(10, 390, 844);
    const [x, y, z] = view.position;
    // The full rule: 0.2 of the azimuth, 4° lower, and 0.68 of the default distance.
    expect(view.distance).toBeCloseTo((0.68 * 33 * 844) / 390, 9);
    expect((Math.asin(y / view.distance) * 180) / Math.PI).toBeCloseTo(24, 9);
    expect((Math.atan2(x, z) * 180) / Math.PI).toBeCloseTo(6, 9);
  });

  it('changes the view with no jump from portrait to landscape', () => {
    let previous = defaultView(10, 500, 1000).position;
    for (let width = 501; width <= 1100; width++) {
      const next = defaultView(10, width, 1000).position;
      const step = Math.hypot(...next.map((v, k) => v - (previous[k] ?? 0)));
      expect(step, `width ${width}`).toBeLessThan(0.15);
      previous = next;
    }
  });
});

describe('portraitShare', () => {
  it('is 0 at the aspect 1 and wider, 1 at 0.6 and narrower, and smooth between', () => {
    expect(portraitShare(1)).toBe(0);
    expect(portraitShare(1.6)).toBe(0);
    expect(portraitShare(0.6)).toBe(1);
    expect(portraitShare(390 / 844)).toBe(1);
    expect(portraitShare(0.8)).toBeCloseTo(0.5, 9);
    expect(portraitShare(0.99)).toBeLessThan(0.01);
  });
});

describe('portraitWide', () => {
  it('removes the zoom of a wide variant in portrait, and keeps the move of the shot', () => {
    const phone = portraitWide(0, 0.4, 0.82 * 0.88, 0.82, 390 / 844);
    expect(phone.zoom).toBeCloseTo(0.88 * PORTRAIT_RULE.nearer, 9);
    const desktop = portraitWide(0, 0.4, 0.82 * 0.88, 0.82, 1.6);
    expect(desktop).toEqual({ azimuth: 0, elevation: 0.4, zoom: 0.82 * 0.88 });
  });
});

describe('farPlane', () => {
  it('adds three stage sides to the distance (design 4.5)', () => {
    expect(farPlane(20, 8)).toBe(44);
  });
});
