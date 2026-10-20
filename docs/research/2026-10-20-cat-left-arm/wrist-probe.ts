/**
 * Measures the bend of the left wrist of the studio body of the cat violist (research of
 * 2026-10-20, round `cat-arm`): the angle from the axis of the studio forearm (elbow to wrist) to
 * the axis of the studio paw (wrist to knuckle), in the pose and in the bind. A straight wrist,
 * as a real violist keeps it, gives 0°. It samples the play of each demo with the violist at a
 * step of 1 s and prints the p5, p50, and p95.
 *
 * Usage, from the root of the tree:
 *
 *     node docs/research/2026-10-20-cat-left-arm/wrist-probe.ts [--set <changes>]...
 */
import { Matrix4, Vector3 } from 'three';

import { FOLD_ROLES, roleBodies } from '../../../tools/fold-probe.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { probeDemos } from '../../../tools/probe-demos.ts';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
import { createStudioPose, poseStudioBones, studioOffsets } from '../../../src/models/studio-rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { PLAYING, allAudible, sceneOf } from '../../../src/pose/test-scene.ts';

const args = process.argv.slice(2);
const sets: string[] = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--set') {
    sets.push(args[++i] ?? '');
  }
}
if (sets.length > 0) {
  setHolds(sets.join(';'));
}
const source = FOLD_ROLES.get('violist');
if (!source) {
  throw new Error('no role');
}
const DEG = 180 / Math.PI;
const index = (name: string): number => STUDIO_BONES.indexOf(name as (typeof STUDIO_BONES)[number]);
const bends: number[] = [];
let bindBend = 0;
for (const demo of await probeDemos()) {
  const scene = sceneOf(demo.bytes);
  const [body] = roleBodies(source, scene);
  const rig = body?.model.studio;
  if (!body || !rig || body.index === null) {
    continue;
  }
  const h = rig.body.heads;
  const elbow = new Vector3(...h.forearm_L);
  const wrist = new Vector3(...h.hand_L);
  const knuckle = new Vector3(...h.fingers_L);
  const foreBind = wrist.clone().sub(elbow);
  const pawBind = knuckle.clone().sub(wrist);
  bindBend = foreBind.angleTo(pawBind) * DEG;
  const start = -countInAt(scene.plan.beats, 0).lengthSec;
  const audible = allAudible(scene.score);
  const buffer = createScenePose(scene.plan);
  const m = new Matrix4();
  for (let song = 0; song < scene.score.durationSec; song += 1) {
    const frame = poseAt(scene.plan, song, 10 + song - start, PLAYING, audible, buffer);
    const pose = frame.players[body.index];
    if (!pose) {
      continue;
    }
    const studio = poseStudioBones(
      rig,
      body.model.skeleton,
      pose.rotations,
      studioOffsets(pose),
      1,
      createStudioPose(),
    );
    const fore = foreBind
      .clone()
      .transformDirection(m.fromArray(studio.matrices, index('forearm_L') * 16));
    const paw = pawBind.clone().transformDirection(m.fromArray(studio.matrices, index('hand_L') * 16));
    bends.push(fore.angleTo(paw) * DEG);
  }
}
bends.sort((a, b) => a - b);
const at = (q: number): string => (bends[Math.floor(q * (bends.length - 1))] ?? 0).toFixed(1);
console.log(
  `left wrist bend of the studio cat, ${bends.length} play samples: p5 ${at(0.05)}°, p50 ${at(0.5)}°, p95 ${at(0.95)}° (bind ${bindBend.toFixed(1)}°) ${sets.join(';') || 'tree'}`,
);
