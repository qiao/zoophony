import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { headOf } from '../pose/plan.ts';
import { PLAYING } from '../pose/test-scene.ts';
import { cameraAt, createCameraPose } from './camera-at.ts';
import { shotDemos, shotSceneOf } from './test-shots.ts';
import { VIEW_OFFSET_Y } from './view.ts';

const SCENES = (await shotDemos()).map((demo) => shotSceneOf(demo.file, demo.bytes));

describe('the opening of each demo beside the open drawer (design 5.6)', () => {
  it.each(SCENES)(
    'keeps each player of the opening of $file left of the open drawer at 1440 × 900',
    (scene) => {
      // The drawer is open on a desktop, and the frame moves 176 px to the left (design 2.8).
      // The free area is 1088 px wide, between the title (60 px) and the bar (68 px).
      const [width, height] = [1440, 900];
      const free = {
        x: (width / 2 - 176) / (width / 2),
        top: 1 - 120 / 900,
        bottom: -1 + 136 / 900,
      };
      const { layout, models, plan } = scene;
      const first = plan.shots[1]?.startSec ?? 0;
      const camera = new PerspectiveCamera();
      const out = createCameraPose();
      let checked = 0;
      for (const time of [-1, 0, first / 2, first - 1e-3]) {
        const pose = cameraAt(plan, time, PLAYING, { aspect: width / height, still: false }, out);
        camera.fov = pose.fov;
        camera.aspect = width / height;
        camera.setViewOffset(width, height, 0, VIEW_OFFSET_Y, width, height);
        camera.position.set(...pose.position);
        camera.lookAt(new Vector3(...pose.target));
        camera.updateMatrixWorld();
        camera.updateProjectionMatrix();
        for (const p of layout.players) {
          const model = models.get(
            p.cast.species,
            p.cast.instrument,
            p.cast.kettles,
            p.cast.support,
          );
          for (const point of [p.position, headOf(model, p)]) {
            const q = new Vector3(...point).project(camera);
            const where = `${scene.file} at ${time.toFixed(2)} s, seat ${p.cast.seatIndex}`;
            expect(Math.abs(q.x), where).toBeLessThanOrEqual(free.x);
            expect(q.y, where).toBeLessThanOrEqual(free.top);
            expect(q.y, where).toBeGreaterThanOrEqual(free.bottom);
            checked++;
          }
        }
      }
      expect(checked).toBeGreaterThan(0);
    },
  );
});
