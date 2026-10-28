// Prints the gap of the camera of each close shot (light > 0) of a demo to the stage key light,
// in degrees, as a histogram of 30° bins.
// Usage: node scratch/gap-probe.ts <demo>...
import { KEY_PLACE } from '../src/models/beam.ts';
import { cameraAt } from '../src/shots/camera-at.ts';
import { SHOT_SEED, prepareShots } from '../src/shots/prepare.ts';
import { buildScore } from '../src/score/score.ts';
import { layoutScene } from '../src/models/layout-scene.ts';
import { ModelCache } from '../src/models/model-cache.ts';
import { patchedDemo } from '../tools/patch-demos.ts';

for (const demo of process.argv.slice(2)) {
  const result = buildScore((await patchedDemo(`${demo}.mid`)).bytes, 'auto');
  if (!result.ok) {
    throw new Error(result.error);
  }
  const models = new ModelCache();
  const layout = layoutScene(result.score, models);
  const plan = prepareShots(result.score, layout, SHOT_SEED, models);
  const bins = new Array(7).fill(0);
  const transport = { playing: true, changedAtWall: 0, before: null, startSec: 0, holdSec: 3, leadSec: Infinity };
  for (const shot of plan.shots) {
    const t = Math.max(0, (Math.max(0, shot.startSec) + Math.min(shot.endSec, shot.startSec + 20)) / 2);
    const pose = cameraAt(plan, t, transport, { aspect: 1.6, still: false });
    if (pose.light <= 0) {
      continue;
    }
    const az = Math.atan2(pose.position[0] - pose.target[0], pose.position[2] - pose.target[2]);
    const d = Math.abs(Math.atan2(Math.sin(az - KEY_PLACE.azimuth), Math.cos(az - KEY_PLACE.azimuth)));
    bins[Math.min(6, Math.floor((d * 180) / Math.PI / 30))] += 1;
  }
  console.log(`${demo}: close shots by gap to the key (0-30, 30-60, ..., 150-180): ${bins.join(' ')}`);
}
