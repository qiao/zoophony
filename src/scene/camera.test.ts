import { describe, expect, it } from 'vitest';

import { StageCamera } from './camera.ts';
import { defaultView } from '../shots/view.ts';

/** The stage side of the Boulanger demo, in meters. */
const SIDE = 11.19;

describe('StageCamera (design 2.5, 5.6)', () => {
  it('keeps the camera of the last shot at the first update in Free mode, also at 4 m', () => {
    for (const damping of [false, true]) {
      const camera = new StageCamera(null, SIDE, !damping);
      camera.resize(1440, 900);
      // A solo shot: 4 m from a player on the left, 25° up.
      const target = [-3, 0.9, -1] as const;
      const position = [
        -3 + 4 * Math.cos(0.44) * 0.5,
        0.9 + 4 * Math.sin(0.44),
        -1 + 4 * Math.cos(0.44) * 0.866,
      ] as const;
      camera.follow({ position, target, fov: 24 });
      expect(camera.target).toEqual(target);
      camera.update();
      const p = camera.camera.position;
      expect(p.x).toBeCloseTo(position[0], 6);
      expect(p.y).toBeCloseTo(position[1], 6);
      expect(p.z).toBeCloseTo(position[2], 6);
      for (const k of [0, 1, 2]) {
        expect(camera.target[k]).toBeCloseTo(target[k] ?? 0, 9);
      }
      expect(camera.camera.fov).toBe(24);
      camera.dispose();
    }
  });

  it('gives the default view and the field of view of 4.5 on "Reset view"', () => {
    const camera = new StageCamera(null, SIDE, false);
    camera.resize(1440, 900);
    camera.follow({ position: [2, 3, 4], target: [0, 1, 0], fov: 24 });
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
    camera.follow({ position: [2, 3, 4], target: [0, 1, 0], fov: 24 });
    camera.resize(390, 844);
    expect(camera.camera.position.toArray()).toEqual([2, 3, 4]);
  });
});
