import { describe, expect, it } from 'vitest';

import {
  DEFAULT_TARGET,
  PORTRAIT_RULE,
  defaultView,
  farPlane,
  landscapeZoom,
  portraitShare,
  wideView,
} from './view.ts';

describe('defaultView', () => {
  it('puts the camera in front of the stage on the audience axis (design 4.5, scene.png 01)', () => {
    const view = defaultView(10, 1440, 900);
    // The landscape rule: 0.56 of the default distance of 33 m on a desktop.
    expect(view.distance).toBeCloseTo(0.56 * 33, 9);
    // The target is 0.25 m below the stage center on the stage top.
    expect(view.target).toEqual([0, -0.25, 0]);
    const [x, y, z] = view.position.map((v, k) => v - (DEFAULT_TARGET[k] ?? NaN));
    expect(Math.hypot(x ?? NaN, y ?? NaN, z ?? NaN)).toBeCloseTo(view.distance, 9);
    // Elevation 25 degrees above the target, on the audience axis (+z).
    expect((Math.asin((y ?? NaN) / view.distance) * 180) / Math.PI).toBeCloseTo(25, 9);
    expect(x).toBeCloseTo(0, 9);
    expect(z).toBeGreaterThan(0);
  });

  it('keeps the width of the orchestra on a narrower landscape viewport', () => {
    // A wider viewport keeps the distance of the desktop. A narrower one moves the camera back
    // with the width, up to the aspect 1.
    expect(defaultView(10, 1920, 900).distance).toBeCloseTo(0.56 * 33, 9);
    expect(defaultView(10, 1200, 900).distance).toBeCloseTo(0.56 * 33 * (1.6 / (4 / 3)), 9);
    expect(defaultView(10, 800, 800).distance).toBeCloseTo(0.56 * 1.6 * 33, 9);
  });

  it('gives a lower and nearer camera in portrait (design 4.5, SC8)', () => {
    const view = defaultView(10, 390, 844);
    const [x, y, z] = view.position.map((v, k) => v - (view.target[k] ?? NaN));
    // The full rule: 4° lower, and 0.68 of the default distance.
    expect(view.distance).toBeCloseTo((0.68 * 33 * 844) / 390, 9);
    expect((Math.asin((y ?? NaN) / view.distance) * 180) / Math.PI).toBeCloseTo(21, 9);
    expect(x).toBeCloseTo(0, 9);
    expect(z).toBeGreaterThan(0);
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

describe('landscapeZoom', () => {
  it('is 0.56 at the aspect 1.6 and wider, and grows with 1 / aspect to the aspect 1', () => {
    expect(landscapeZoom(2.4)).toBeCloseTo(0.56, 9);
    expect(landscapeZoom(1.6)).toBeCloseTo(0.56, 9);
    expect(landscapeZoom(1.2)).toBeCloseTo((0.56 * 1.6) / 1.2, 9);
    expect(landscapeZoom(1)).toBeCloseTo(0.896, 9);
    expect(landscapeZoom(0.5)).toBeCloseTo(0.896, 9);
  });
});

describe('wideView', () => {
  it('removes the zoom of a wide variant in portrait, and keeps the move of the shot', () => {
    const phone = wideView(0, 0.4, 1.1 * 0.92, 1.1, 390 / 844);
    expect(phone.zoom).toBeCloseTo(0.92 * PORTRAIT_RULE.nearer, 9);
    const desktop = wideView(0, 0.4, 1.1 * 0.92, 1.1, 1.6);
    expect(desktop.azimuth).toBe(0);
    expect(desktop.elevation).toBe(0.4);
    expect(desktop.zoom).toBeCloseTo(1.1 * 0.92 * 0.56, 9);
  });
});

describe('farPlane', () => {
  it('adds three stage sides to the distance (design 4.5)', () => {
    expect(farPlane(20, 8)).toBe(44);
  });
});
