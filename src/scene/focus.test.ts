import { describe, expect, it } from 'vitest';

import type { Vec3 } from '../models/tuples.ts';
import {
  DEFAULT_TARGET,
  FIELD_OF_VIEW,
  defaultView,
  farPlane,
  orbitMinDistance,
} from '../shots/view.ts';
import {
  FREE_LENS,
  LENS,
  apertureAt,
  blurAt,
  blurScale,
  focusOf,
  freeFocusDistance,
  freeFocusOf,
} from './focus.ts';
import type { FocusSpot } from './focus.ts';

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

  it('limits the disc to the largest blur, and a near point to a smaller blur', () => {
    const scale = blurScale(4, 30, LENS.aperture);
    expect(blurAt(0.2, 4, scale)).toBe(-LENS.maxNearBlur);
    expect(LENS.maxNearBlur).toBeLessThan(LENS.maxBlur / 4);
    // The over-the-shoulder shot: the bear 2 m in front of the camera, the focus at 6 m.
    expect(blurAt(2, 6, blurScale(6, 30, LENS.aperture))).toBe(-LENS.maxNearBlur);
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
    // The hall wall stands about 15 m behind the subject of the shot. With the aperture of
    // 0.025 m, its disc is about 0.9%.
    expect(blurAt(19, focus.distance, focus.scale)).toBeGreaterThan(0.008);
    // A player 1 m behind the subject is a little soft, as in the close shots of scene.png.
    expect(blurAt(5, focus.distance, focus.scale)).toBeGreaterThan(LENS.sharpBlur);
  });

  it('skips the blur when even the far plane is sharp', () => {
    const focus = focusOf([0, 0, 200], [0, 0, 0], FIELD_OF_VIEW, 230, 200);
    expect(focus.active).toBe(false);
  });
});

describe('the focus of Free mode (design 4.5, bug report of 2026-10-07)', () => {
  // The stage of the default demo, and its highest point above the stage top.
  const side = 11.28;
  const top = 1.87;

  /** A row of seated players across the stage at z = 1, and the conductor at z = 3.6. */
  const spots: FocusSpot[] = [
    ...[-2, -1, 0, 1, 2].map((x) => ({ x, z: 1, top: 0.87 })),
    { x: 0, z: 3.6, top: 1.9 },
  ];

  /**
   * Gives the camera at the near limit of Free mode in a direction from the stage center.
   *
   * @param degrees The elevation, in degrees.
   * @returns The camera position.
   */
  function nearCamera(degrees: number): Vec3 {
    const e = (degrees * Math.PI) / 180;
    const direction: Vec3 = [0, Math.sin(e), Math.cos(e)];
    const d = orbitMinDistance(DEFAULT_TARGET, direction, side, top);
    return [
      0,
      (DEFAULT_TARGET[1] ?? 0) + d * direction[1],
      (DEFAULT_TARGET[2] ?? 0) + d * direction[2],
    ];
  }

  it('focuses on the first player in the middle of the frame', () => {
    // The camera of the deepest zoom of the default view (33°) looks at the head of a tall
    // conductor.
    const camera = nearCamera(33);
    const orbit = Math.hypot(
      camera[1] - (DEFAULT_TARGET[1] ?? 0),
      camera[2] - (DEFAULT_TARGET[2] ?? 0),
    );
    const distance = freeFocusDistance(camera, DEFAULT_TARGET, side, spots);
    // The head of the conductor is nearer than the orbit target.
    expect(distance).toBeLessThan(orbit - 2);
    expect(distance).toBeGreaterThan(2);
    // The old focus on the orbit target blurred the head by the full near limit of 7 px.
    const old = focusOf(camera, DEFAULT_TARGET, FIELD_OF_VIEW, 40, side);
    expect(blurAt(distance, old.distance, old.scale)).toBe(-LENS.maxNearBlur);
  });

  it('focuses on the stage top when no player stands in the middle of the frame', () => {
    const camera = nearCamera(80);
    const floor = camera[1] / Math.sin((80 * Math.PI) / 180);
    expect(freeFocusDistance(camera, DEFAULT_TARGET, side, [])).toBeCloseTo(floor, 9);
    // A player under the camera: the focus is on the top of its head.
    const below: FocusSpot = { x: 0, z: ((DEFAULT_TARGET[2] ?? 0) + camera[2]) / 2, top: 0.87 };
    const head = (camera[1] - 0.87 - FREE_LENS.radius) / Math.sin((80 * Math.PI) / 180);
    expect(freeFocusDistance(camera, DEFAULT_TARGET, side, [below])).toBeCloseTo(head, 1);
  });

  it('focuses on the target when the axis meets no player and no stage top', () => {
    expect(freeFocusDistance([0, 5, 30], [0, 5, 0], side, spots)).toBeCloseTo(30, 9);
  });

  it('keeps the default view sharp', () => {
    const view = defaultView(side, 1440, 900);
    const distance = freeFocusDistance(view.position, view.target, side, spots);
    const focus = freeFocusOf(
      view.distance,
      distance,
      FIELD_OF_VIEW,
      farPlane(view.distance, side),
      side,
    );
    expect(focus.active).toBe(false);
  });

  it('blurs the stage and the hall less than a shot at the near limit', () => {
    const camera = nearCamera(33);
    const orbit = Math.hypot(
      camera[1] - (DEFAULT_TARGET[1] ?? 0),
      camera[2] - (DEFAULT_TARGET[2] ?? 0),
    );
    const distance = freeFocusDistance(camera, DEFAULT_TARGET, side, spots);
    const free = freeFocusOf(orbit, distance, FIELD_OF_VIEW, 40, side);
    const shot = focusOf(camera, [0, 1.9, 3.6], FIELD_OF_VIEW, 40, side);
    // The back of the stage stands about 13 m from the camera, and the hall wall 25 m.
    for (const depth of [13, 25]) {
      expect(blurAt(depth, free.distance, free.scale)).toBeLessThan(
        0.5 * blurAt(depth, shot.distance, shot.scale),
      );
    }
    // At most about 9 px at the height 900 px.
    expect(blurAt(25, free.distance, free.scale)).toBeLessThan(0.01);
  });
});
