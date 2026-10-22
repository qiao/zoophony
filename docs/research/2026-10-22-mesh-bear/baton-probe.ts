/**
 * Measures the baton hold of the conductor over the play of demos, every 0.25 s from the song
 * start to the end: the angle of the baton to the right forearm (elbow to wrist), the lift of the
 * baton above the level, the turn of the baton inward from the front, the facing of the right
 * palm (the y of its normal: -1 faces the floor), and the right wrist and elbow from the right
 * shoulder joint, in meters (x out to the right, y up, z forward). It prints the median, p5, and
 * p95 of each value. A hold change goes in with `--set <changes>` (`tools/hold-sets.ts`).
 *
 *     node docs/research/2026-10-22-mesh-bear/baton-probe.ts [--set <changes>] [<demo file>...]
 */
import { Vector3 } from 'three';

import { BATON_TIP } from '../../../src/models/instruments/baton.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { poseAt } from '../../../src/pose/pose-at.ts';
import { posedPiecePoint, poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { PLAYING, allAudible, sceneOf } from '../../../src/pose/test-scene.ts';
import { FOLD_ROLES, roleBodies } from '../../../tools/fold-probe.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { probeDemos } from '../../../tools/probe-demos.ts';

const args = process.argv.slice(2);
const at = args.indexOf('--set');
if (at >= 0) {
  setHolds(args[at + 1] ?? '');
  args.splice(at, 2);
}
const files = args.length > 0 ? args : ['boulanger-matin.mid', 'mozart-k525.mid', 'beethoven-9.mid'];
const DEG = 180 / Math.PI;
const values: Record<string, number[]> = {
  'baton to forearm deg': [],
  'baton lift deg': [],
  'baton inward deg': [],
  'palm normal y': [],
  'wrist out m': [],
  'wrist up m': [],
  'wrist forward m': [],
  'elbow up m': [],
};
const role = FOLD_ROLES.get('conductor');
if (!role) {
  throw new Error('No role conductor.');
}
for (const demo of await probeDemos()) {
  if (!files.includes(demo.file)) {
    continue;
  }
  const scene = sceneOf(demo.bytes);
  const [body] = roleBodies(role, scene);
  if (!body) {
    continue;
  }
  const audible = allAudible(scene.score);
  for (let song = 0; song < scene.score.durationSec; song += 0.25) {
    const pose = poseAt(scene.plan, song, 10 + song, PLAYING, audible).conductor;
    if (!pose) {
      continue;
    }
    const posed = poseSkeleton(body.model, pose);
    const frame = (name: Parameters<typeof boneIndex>[0]): Vector3 =>
      posed.frames[boneIndex(name)]?.position.clone() ?? new Vector3();
    const shoulder = frame('upperArmR');
    const elbow = frame('forearmR');
    const wrist = frame('handR');
    const grip = new Vector3(...posedPiecePoint(posed, { bone: 'baton', at: [0, 0, 0] }));
    const tip = new Vector3(...posedPiecePoint(posed, { bone: 'baton', at: [BATON_TIP, 0, 0] }));
    const baton = tip.clone().sub(grip).normalize();
    const forearm = wrist.clone().sub(elbow).normalize();
    const palm = new Vector3(-1, 0, 0).applyQuaternion(
      posed.frames[boneIndex('handR')]?.rotation ?? posed.frames[0]!.rotation,
    );
    values['baton to forearm deg']?.push(baton.angleTo(forearm) * DEG);
    values['baton lift deg']?.push(Math.asin(baton.y) * DEG);
    // The model faces -z, and its right is +x: inward is -x.
    values['baton inward deg']?.push(Math.atan2(-baton.x, -baton.z) * DEG);
    values['palm normal y']?.push(palm.y);
    const w = wrist.clone().sub(shoulder);
    values['wrist out m']?.push(w.x);
    values['wrist up m']?.push(w.y);
    values['wrist forward m']?.push(-w.z);
    values['elbow up m']?.push(elbow.y - shoulder.y);
  }
}
const pick = (list: number[], q: number): number => {
  const sorted = [...list].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? Number.NaN;
};
console.log(`Demos: ${files.join(', ')}. Samples: ${values['palm normal y']?.length ?? 0}.`);
console.log('| Value | p5 | median | p95 |');
console.log('|---|---|---|---|');
for (const [name, list] of Object.entries(values)) {
  const f = (v: number): string => v.toFixed(name.endsWith('deg') ? 0 : 3);
  console.log(`| ${name} | ${f(pick(list, 0.05))} | ${f(pick(list, 0.5))} | ${f(pick(list, 0.95))} |`);
}
