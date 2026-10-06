import { describe, expect, it } from 'vitest';

import { StageCamera } from './camera.ts';
import { defaultView } from '../shots/view.ts';

/** The stage side of the Boulanger demo, in meters. */
const SIDE = 11.19;

describe('StageCamera (design 2.5, 5.6)', () => {
  /** A solo shot: 4 m from a player on the left, 25° up. */
  const target = [-3, 0.9, -1] as const;
  const position = [
    -3 + 4 * Math.cos(0.44) * 0.5,
    0.9 + 4 * Math.sin(0.44),
    -1 + 4 * Math.cos(0.44) * 0.866,
  ] as const;

  /**
   * Expects the camera at the position of the solo shot.
   *
   * @param camera The camera.
   */
  function expectShotPosition(camera: StageCamera): void {
    const p = camera.camera.position;
    expect(p.x).toBeCloseTo(position[0], 6);
    expect(p.y).toBeCloseTo(position[1], 6);
    expect(p.z).toBeCloseTo(position[2], 6);
  }

  it('keeps the camera of the last shot at the first update in Free mode, also at 4 m', () => {
    for (const damping of [false, true]) {
      const camera = new StageCamera(null, SIDE, !damping);
      camera.resize(1440, 900);
      camera.follow({ position, target, fov: 24, beam: 1 });
      expect(camera.target).toEqual(target);
      camera.update(1000);
      expectShotPosition(camera);
      expect(camera.camera.fov).toBe(24);
      camera.dispose();
    }
  });

  it('moves the orbit target of a close shot to the stage center in 0.4 s (UX audit SC6)', () => {
    // A drag in a close shot turned the view around a point 4 m away.
    const camera = new StageCamera(null, SIDE, false);
    camera.resize(1440, 900);
    camera.follow({ position, target, fov: 24, beam: 1 });
    camera.update(1000);
    for (const k of [0, 1, 2]) {
      expect(camera.target[k]).toBeCloseTo(target[k] ?? 0, 9);
    }
    camera.update(1200);
    // Half way in time is half way on the smoothstep.
    for (const k of [0, 1, 2]) {
      expect(camera.target[k]).toBeCloseTo((target[k] ?? 0) / 2, 6);
    }
    expectShotPosition(camera);
    camera.update(1400);
    camera.update(1500);
    for (const k of [0, 1, 2]) {
      expect(camera.target[k]).toBeCloseTo(0, 9);
    }
    expectShotPosition(camera);
    camera.dispose();
  });

  it('moves the orbit target at once with reduced motion, and keeps a wide target', () => {
    const reduced = new StageCamera(null, SIDE, true);
    reduced.resize(1440, 900);
    reduced.follow({ position, target, fov: 24, beam: 1 });
    reduced.update(1000);
    expect(reduced.target.map((v) => Math.abs(v) < 1e-9)).toEqual([true, true, true]);
    expectShotPosition(reduced);
    reduced.dispose();
    // A wide shot looks at the stage center already.
    const wide = new StageCamera(null, SIDE, false);
    wide.resize(1440, 900);
    wide.follow({ position: [20, 10, 30], target: [0, 0, -0.5], fov: 30, beam: 1 });
    wide.update(1000);
    wide.update(2000);
    expect(wide.target).toEqual([0, 0, -0.5]);
    wide.dispose();
  });

  it('gives the default view and the field of view of 4.5 on "Reset view"', () => {
    const camera = new StageCamera(null, SIDE, false);
    camera.resize(1440, 900);
    camera.follow({ position: [2, 3, 4], target: [0, 1, 0], fov: 24, beam: 1 });
    camera.reset();
    const view = defaultView(SIDE, 1440, 900);
    const p = camera.camera.position;
    expect(p.x).toBeCloseTo(view.position[0], 6);
    expect(p.y).toBeCloseTo(view.position[1], 6);
    expect(p.z).toBeCloseTo(view.position[2], 6);
    expect(camera.target).toEqual([0, 0, 0]);
    expect(camera.camera.fov).toBe(30);
    expect(camera.aspect).toBeCloseTo(1.6, 9);
  });

  it('keeps the view of a shot on a resize', () => {
    const camera = new StageCamera(null, SIDE, false);
    camera.resize(1440, 900);
    camera.follow({ position: [2, 3, 4], target: [0, 1, 0], fov: 24, beam: 1 });
    camera.resize(390, 844);
    expect(camera.camera.position.toArray()).toEqual([2, 3, 4]);
  });
});
