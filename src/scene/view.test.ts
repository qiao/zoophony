import { describe, expect, it } from 'vitest';

import { defaultView, farPlane } from './view.ts';

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

  it('moves back on a viewport that is taller than wide (design 4.5)', () => {
    expect(defaultView(10, 390, 844).distance).toBeCloseTo((33 * 844) / 390, 9);
    expect(defaultView(10, 800, 800).distance).toBeCloseTo(33, 9);
  });
});

describe('farPlane', () => {
  it('adds three stage sides to the distance (design 4.5)', () => {
    expect(farPlane(20, 8)).toBe(44);
  });
});
