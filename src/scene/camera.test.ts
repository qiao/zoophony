import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';

import { StageCamera } from './camera.ts';
import { DEFAULT_ELEVATION, DEFAULT_TARGET, defaultView, orbitMinDistance } from '../shots/view.ts';

/** The stage side of the Boulanger demo, in meters. */
const SIDE = 11.19;

/** The stage center that Free mode turns around: the target of the default view. */
const CENTER = new Vector3(...DEFAULT_TARGET);

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

  /**
   * Calculates the distance of the camera from the stage center.
   *
   * @param camera The camera.
   * @returns The distance, in meters.
   */
  function centerDistance(camera: StageCamera): number {
    return camera.camera.position.distanceTo(CENTER);
  }

  /**
   * Expects the camera on the ray from the stage center through the camera of the solo shot.
   *
   * @param camera The camera.
   */
  function expectOnShotRay(camera: StageCamera): void {
    const p = camera.camera.position.clone().sub(CENTER);
    const ray = new Vector3(...position).sub(CENTER);
    const k = p.length() / ray.length();
    expect(p.x).toBeCloseTo(ray.x * k, 6);
    expect(p.y).toBeCloseTo(ray.y * k, 6);
    expect(p.z).toBeCloseTo(ray.z * k, 6);
  }

  it('keeps the camera of the last shot at the first update in Free mode, also at 4 m', () => {
    const camera = new StageCamera(null, SIDE, false);
    camera.resize(1440, 900);
    camera.follow({ position, target, fov: 24, beam: 1, close: true, light: 1, spot: 0 });
    expect(camera.target).toEqual(target);
    camera.update(1000);
    expectShotPosition(camera);
    expect(camera.camera.fov).toBe(24);
    camera.dispose();
  });

  it('moves the target to the stage center and the camera out in 0.4 s (SC6, N19)', () => {
    // A drag in a close shot turned the view around a point 4 m away, and the camera stayed among
    // the stands.
    const camera = new StageCamera(null, SIDE, false);
    camera.resize(1440, 900);
    camera.follow({ position, target, fov: 24, beam: 1, close: true, light: 1, spot: 0 });
    camera.update(1000);
    for (const k of [0, 1, 2]) {
      expect(camera.target[k]).toBeCloseTo(target[k] ?? 0, 9);
    }
    const near = new Vector3(...position).distanceTo(CENTER);
    const far = 0.6 * defaultView(SIDE, 1440, 900).distance;
    camera.update(1200);
    // Half way in time is half way on the smoothstep.
    for (const k of [0, 1, 2]) {
      expect(camera.target[k]).toBeCloseTo(((target[k] ?? 0) + (DEFAULT_TARGET[k] ?? 0)) / 2, 6);
    }
    expect(centerDistance(camera)).toBeCloseTo((near + far) / 2, 6);
    expectOnShotRay(camera);
    camera.update(1400);
    camera.update(1500);
    for (const k of [0, 1, 2]) {
      expect(camera.target[k]).toBeCloseTo(DEFAULT_TARGET[k] ?? NaN, 9);
    }
    expect(centerDistance(camera)).toBeCloseTo(far, 6);
    expectOnShotRay(camera);
    camera.dispose();
  });

  it('moves the target and the camera at once with reduced motion, and keeps a wide view', () => {
    const reduced = new StageCamera(null, SIDE, true);
    reduced.resize(1440, 900);
    reduced.follow({ position, target, fov: 24, beam: 1, close: true, light: 1, spot: 0 });
    reduced.update(1000);
    expect(reduced.target.map((v, k) => Math.abs(v - (DEFAULT_TARGET[k] ?? NaN)) < 1e-9)).toEqual([
      true,
      true,
      true,
    ]);
    expect(centerDistance(reduced)).toBeCloseTo(0.6 * defaultView(SIDE, 1440, 900).distance, 6);
    expectOnShotRay(reduced);
    reduced.dispose();
    // A wide shot looks at the stage center already, from far away.
    const wide = new StageCamera(null, SIDE, false);
    wide.resize(1440, 900);
    wide.follow({
      position: [20, 10, 30],
      target: [0, 0, -0.5],
      fov: 30,
      beam: 1,
      close: false,
      light: 0,
      spot: 0,
    });
    wide.update(1000);
    wide.update(2000);
    expect(wide.target).toEqual([0, 0, -0.5]);
    expect(wide.camera.position.distanceTo(new Vector3(20, 10, 30))).toBeLessThan(1e-6);
    wide.dispose();
  });

  it('stops a zoom in Free mode at the box of the stage and the players (bug of 2026-10-07)', () => {
    const camera = new StageCamera(null, SIDE, false, 2.5);
    camera.resize(1440, 900);
    camera.reset();
    camera.update(1000);
    // A zoom moves the camera to 3 m from the stage center on the line of the default view.
    const direction = camera.camera.position.clone().sub(CENTER).normalize();
    camera.camera.position.copy(CENTER).addScaledVector(direction, 3);
    camera.update(1016);
    camera.update(1032);
    const limit = orbitMinDistance(DEFAULT_TARGET, direction.toArray(), SIDE, 2.5);
    // The line of the default view (33°) leaves the box through its top, 1 m above the highest
    // point of the players.
    expect(limit).toBeCloseTo(
      (2.5 + 1 - (DEFAULT_TARGET[1] ?? NaN)) / Math.sin(DEFAULT_ELEVATION),
      9,
    );
    expect(centerDistance(camera)).toBeCloseTo(limit, 6);
    // The camera stays on the line of the default view.
    const now = camera.camera.position.clone().sub(CENTER).normalize();
    expect(now.distanceTo(direction)).toBeLessThan(1e-9);
    camera.dispose();
  });

  it('moves a shot camera among the players out of the box in Free mode', () => {
    // An over-the-shoulder shot of the conductor looks at the stage center from 4 m.
    const camera = new StageCamera(null, SIDE, false, 2.5);
    camera.resize(1440, 900);
    const shot = [0, 1.5, 3.6] as const;
    camera.follow({
      position: shot,
      target: DEFAULT_TARGET,
      fov: 24,
      beam: 1,
      close: true,
      light: 1,
      spot: 0,
    });
    camera.update(1000);
    // The first frame keeps the camera of the shot, so the change of mode does not jump.
    expect(camera.camera.position.distanceTo(new Vector3(...shot))).toBeLessThan(1e-9);
    camera.update(1400);
    camera.update(1500);
    const direction = new Vector3(...shot).sub(CENTER).normalize();
    const limit = orbitMinDistance(DEFAULT_TARGET, direction.toArray(), SIDE, 2.5);
    expect(centerDistance(camera)).toBeGreaterThanOrEqual(limit - 1e-6);
    camera.dispose();
  });

  it('gives the default view and the field of view of 4.5 on "Reset view"', () => {
    const camera = new StageCamera(null, SIDE, false);
    camera.resize(1440, 900);
    camera.follow({
      position: [2, 3, 4],
      target: [0, 1, 0],
      fov: 24,
      beam: 1,
      close: true,
      light: 1,
      spot: 0,
    });
    camera.reset();
    const view = defaultView(SIDE, 1440, 900);
    const p = camera.camera.position;
    expect(p.x).toBeCloseTo(view.position[0], 6);
    expect(p.y).toBeCloseTo(view.position[1], 6);
    expect(p.z).toBeCloseTo(view.position[2], 6);
    expect(camera.target).toEqual(DEFAULT_TARGET);
    expect(camera.camera.fov).toBe(30);
    expect(camera.aspect).toBeCloseTo(1.6, 9);
  });

  it('keeps the view of a shot on a resize', () => {
    const camera = new StageCamera(null, SIDE, false);
    camera.resize(1440, 900);
    camera.follow({
      position: [2, 3, 4],
      target: [0, 1, 0],
      fov: 24,
      beam: 1,
      close: true,
      light: 1,
      spot: 0,
    });
    camera.resize(390, 844);
    expect(camera.camera.position.toArray()).toEqual([2, 3, 4]);
  });

  it('moves the frame beside the open drawer in about 200 ms, at once at the first call', () => {
    const camera = new StageCamera(null, SIDE, false);
    camera.resize(1440, 900);
    // The view offset of the bar: the middle of the frame is 34 px above the middle.
    expect(camera.frame).toEqual({ scale: 1, x: 720, y: 416 });
    camera.frameTo({ right: 352, lift: 0 }, null, 1000);
    expect(camera.frame.x).toBe(544);
    camera.frameTo({ right: 0, lift: 0 }, null, 1016);
    const early = camera.frame.x;
    expect(early).toBeGreaterThan(544);
    expect(early).toBeLessThan(640);
    // After 200 ms, 98% of the move of 176 px is done.
    camera.frameTo({ right: 0, lift: 0 }, null, 1216);
    expect(720 - camera.frame.x).toBeLessThan(0.02 * 176);
    camera.frameTo({ right: 352, lift: 0 }, null, 5000);
    const reduced = new StageCamera(null, SIDE, true);
    reduced.resize(1440, 900);
    reduced.frameTo({ right: 0, lift: 0 }, null, 1000);
    reduced.frameTo({ right: 352, lift: 0 }, null, 1016);
    expect(reduced.frame.x).toBe(544);
    // The projection follows the frame: the middle of the frame moves to x = 544.
    const view = camera.camera.view;
    expect(view?.offsetX).toBeCloseTo(176, 9);
    expect(view?.offsetY).toBeCloseTo(34, 9);
  });

  it('fits the frame of a close shot above the bar, and leaves the fit in Free mode in 0.4 s', () => {
    const camera = new StageCamera(null, SIDE, false);
    camera.resize(1440, 900);
    camera.follow({ position, target, fov: 24, beam: 0.15, close: true, light: 1, spot: 0 });
    // The frame of 900 px fits into the 832 px above the bar.
    expect(camera.frame.scale).toBeCloseTo(832 / 900, 9);
    expect(camera.frame.y).toBe(416);
    camera.follow({
      position: [20, 10, 30],
      target: [0, 0, 0],
      fov: 30,
      beam: 1,
      close: false,
      light: 0,
      spot: 0,
    });
    expect(camera.frame.scale).toBe(1);
    camera.follow({ position, target, fov: 24, beam: 0.15, close: true, light: 1, spot: 0 });
    camera.update(1000);
    expect(camera.frame.scale).toBeCloseTo(832 / 900, 9);
    camera.update(1200);
    expect(camera.frame.scale).toBeCloseTo(1 - (68 / 900) * 0.5, 9);
    camera.update(1400);
    expect(camera.frame.scale).toBe(1);
    const reduced = new StageCamera(null, SIDE, true);
    reduced.resize(1440, 900);
    reduced.follow({ position, target, fov: 24, beam: 0.15, close: true, light: 1, spot: 0 });
    reduced.update(1000);
    expect(reduced.frame.scale).toBe(1);
  });

  /**
   * Gives the place of a point on a canvas of 1440 × 900.
   *
   * @param camera The camera.
   * @param point The point.
   * @returns The x and the y on the canvas, in CSS pixels.
   */
  function onCanvas(camera: StageCamera, point: readonly [number, number, number]): number[] {
    camera.camera.updateMatrixWorld();
    const p = new Vector3(...point).project(camera.camera);
    return [((p.x + 1) / 2) * 1440, ((1 - p.y) / 2) * 900];
  }

  it('keeps the stage of the first screen clear of the play button (review of step 8, H1)', () => {
    const camera = new StageCamera(null, SIDE, false, 2.5);
    camera.resize(1440, 900);
    const front: [number, number, number] = [0, -0.4, SIDE / 2];
    // The front edge of the stage stands at 76% of the height in the default view, below the top
    // of the load ring.
    expect(onCanvas(camera, front)[1]).toBeGreaterThan(680);
    // The load ring of the play button, centered at 72% of the height.
    const ring = { left: 672, top: 600, right: 756, bottom: 684 };
    camera.frameTo({ right: 0, lift: 0 }, ring, 1000);
    expect(camera.frame.scale).toBeLessThan(0.9);
    expect(onCanvas(camera, front)[1]).toBeCloseTo(588, 6);
    // After the first play, the stage grows back to the default view in about 0.4 s.
    camera.frameTo({ right: 0, lift: 0 }, null, 1016);
    expect(camera.frame.scale).toBeLessThan(0.95);
    camera.frameTo({ right: 0, lift: 0 }, null, 1416);
    expect(camera.frame.scale).toBeGreaterThan(0.99);
    camera.frameTo({ right: 0, lift: 0 }, null, 2500);
    expect(camera.frame.scale).toBe(1);
    // A ring at the right of the stage, as on a short and wide screen: the stage ends 12 px left
    // of it.
    const side = { left: 1300, top: 400, right: 1384, bottom: 484 };
    camera.frameTo({ right: 0, lift: 0 }, side, 3000);
    camera.frameTo({ right: 0, lift: 0 }, side, 9000);
    const corners = [-0.4, 2.5].map((y) => onCanvas(camera, [SIDE / 2, y, SIDE / 2])[0] ?? 0);
    expect(Math.max(...corners)).toBeCloseTo(1288, 6);
  });
});
