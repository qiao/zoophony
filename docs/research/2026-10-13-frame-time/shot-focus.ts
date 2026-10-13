/**
 * Prints the shots of the plan of `perf-60.mid` with the part of each shot in which the depth of
 * field is on (the report `2026-10-13-frame-retro.md`). Run from the repository root:
 * `node docs/research/2026-10-13-frame-time/shot-focus.ts`.
 *
 * The probe builds the plan as the app does, and takes the camera of `cameraAt()` every 0.1 s.
 * The focus of `focusOf()` is on when a point at the far plane gets a blur disc above the sharp
 * limit, as in a frame of the stage.
 */
import { layoutScene } from '../../../src/models/layout-scene.ts';
import { ModelCache } from '../../../src/models/model-cache.ts';
import type { Transport } from '../../../src/pose/types.ts';
import { focusOf } from '../../../src/scene/focus.ts';
import { buildScore } from '../../../src/score/score.ts';
import { cameraAt } from '../../../src/shots/camera-at.ts';
import { SHOT_SEED, prepareShots } from '../../../src/shots/prepare.ts';
import { farPlane } from '../../../src/shots/view.ts';
import { perf60Bytes } from '../../../tools/write-perf-60.ts';

const result = buildScore(perf60Bytes(), 'auto');
if (!result.ok) {
  throw new Error(result.error);
}
const models = new ModelCache();
const plan = prepareShots(result.score, layoutScene(result.score, models), SHOT_SEED, models);
const transport: Transport = {
  playing: true,
  changedAtWall: 0,
  before: null,
  startSec: 0,
  holdSec: 3,
  leadSec: Infinity,
};
for (const shot of plan.shots) {
  let on = 0;
  let samples = 0;
  for (let time = Math.max(0, shot.startSec); time < Math.min(shot.endSec, 70); time += 0.1) {
    const camera = cameraAt(plan, time, transport, { aspect: 1.6, still: false });
    const distance = Math.hypot(
      ...camera.target.map((value, i) => value - (camera.position[i] ?? 0)),
    );
    const far = farPlane(distance, plan.stageSide);
    samples += 1;
    if (focusOf(camera.position, camera.target, camera.fov, far, plan.stageSide).active) {
      on += 1;
    }
  }
  const share = samples > 0 ? `${((on / samples) * 100).toFixed(0)}%` : 'no sample';
  console.log(`${shot.kind} ${shot.startSec} to ${shot.endSec} s: depth of field ${share}`);
}
