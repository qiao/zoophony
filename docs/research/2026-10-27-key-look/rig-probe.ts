// Prints the camera and the lamps of the close shot of each subject (the frame of
// `close-views play --shot`): the azimuth of the camera around its target, and the gap of each
// lamp and of the camera to the key light of the stage (KEY_PLACE.azimuth).
// Usage: node scratch/rig-probe.ts <demo> <subject>...
import { KEY_PLACE } from '../src/models/beam.ts';
import { cameraAt } from '../src/shots/camera-at.ts';
import { SHOT_SEED, prepareShots } from '../src/shots/prepare.ts';
import { shotRig } from '../src/shots/shot-light.ts';
import { buildScore } from '../src/score/score.ts';
import { layoutScene } from '../src/models/layout-scene.ts';
import { ModelCache } from '../src/models/model-cache.ts';
import { chooseShot, shotSubject } from '../tools/close-views.ts';
import { patchedDemo } from '../tools/patch-demos.ts';

const [demo = 'boulanger-matin', ...subjects] = process.argv.slice(2);
const deg = (r: number): number => Math.round((r * 180) / Math.PI);
const gap = (a: number, b: number): number => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const az = (p: readonly number[], t: readonly number[]): number =>
  Math.atan2((p[0] ?? 0) - (t[0] ?? 0), (p[2] ?? 0) - (t[2] ?? 0));
const el = (p: readonly number[], t: readonly number[]): number => {
  const dx = (p[0] ?? 0) - (t[0] ?? 0);
  const dy = (p[1] ?? 0) - (t[1] ?? 0);
  const dz = (p[2] ?? 0) - (t[2] ?? 0);
  return Math.atan2(dy, Math.hypot(dx, dz));
};

const result = buildScore((await patchedDemo(`${demo}.mid`)).bytes, 'auto');
if (!result.ok) {
  throw new Error(result.error);
}
const models = new ModelCache();
const layout = layoutScene(result.score, models);
const plan = prepareShots(result.score, layout, SHOT_SEED, models);
for (const s of subjects) {
  const chosen = await chooseShot(demo as never, shotSubject(s));
  const transport = {
    playing: true,
    changedAtWall: 0,
    before: null,
    startSec: 0,
    holdSec: 3,
    leadSec: Infinity,
  };
  const pose = cameraAt(plan, chosen.frameSec, transport, { aspect: 1440 / 900, still: false });
  const rig = shotRig(pose.position, pose.target, pose.fov, pose.spot);
  const cam = az(pose.position, pose.target);
  const key = az(rig.key.position, rig.key.target);
  const kick = az(rig.kicker.position, rig.kicker.target);
  console.log(
    `${s}: ${chosen.shot.kind} at ${chosen.frameSec} s, light ${pose.light}, camera az ${deg(cam)} el ${deg(el(pose.position, pose.target))}, gap to stage key ${deg(gap(cam, KEY_PLACE.azimuth))}; soft key az ${deg(key)} (gap ${deg(gap(key, KEY_PLACE.azimuth))}); kicker az ${deg(kick)}; shade ${rig.shade.toFixed(3)}; target ${pose.target.map((v) => v.toFixed(1)).join(',')}`,
  );
}
