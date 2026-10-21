// node scratch/trace.ts <role> <demo> <lift|lower> <at> <side> [from] [to]
import { Matrix4, Quaternion, Vector3 } from 'three';
import { FOLD_ROLES, roleBodies } from '../../../tools/fold-probe.ts';
import { probeDemos } from '../../../tools/probe-demos.ts';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
import { createStudioPose, poseStudioBones, studioOffsets, twistAngle } from '../../../src/models/studio-rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { PLAYING, allAudible, sceneOf } from '../../../src/pose/test-scene.ts';
import type { Transport } from '../../../src/pose/types.ts';
const [role = '', file = '', kind = 'lift', atText = '0', side = 'L', fromT = '0', toT = '2.2'] = process.argv.slice(2);
const atRaw = Number(atText);
const DEG = 180 / Math.PI;
const demo = (await probeDemos()).find((d) => d.file === file)!;
const scene = sceneOf(demo.bytes);
const [body] = roleBodies(FOLD_ROLES.get(role)!, scene);
const rig = body!.model.studio!;
const audible = allAudible(scene.score);
const buffer = createScenePose(scene.plan);
const at = atText === 'end' ? scene.score.durationSec : atRaw;
const count = countInAt(scene.plan.beats, at);
const t: Transport = kind === 'lift'
  ? { ...PLAYING, changedAtWall: 10, startSec: at, leadSec: count.lengthSec }
  : { ...PLAYING, playing: false, changedAtWall: 10, before: { ...PLAYING, changedAtWall: 0 }, holdSec: 3 };
const idx = (n: string) => STUDIO_BONES.indexOf(n as never);
const b = { chest: idx('chest'), upper: idx(`upper_arm_${side}`), fore: idx(`forearm_${side}`), twist: idx(`forearm_twist_${side}`), hand: idx(`hand_${side}`) };
const h = rig.body.heads as Record<string, [number, number, number]>;
const axis = new Vector3(...h[`hand_${side}`]!).sub(new Vector3(...h[`forearm_${side}`]!)).normalize();
const turn = (m: Float32Array, k: number) => new Quaternion().setFromRotationMatrix(new Matrix4().fromArray(m, k * 16));
const ang = (a: Quaternion, c: Quaternion) => 2 * Math.acos(Math.min(1, Math.abs(a.dot(c)))) * DEG;
const studio = createStudioPose();
let prev: Quaternion[] | null = null;
console.log('wall | paw | bone | swing | rate upper fore twist hand world-hand | elbow');
for (let w = Number(fromT); w <= Number(toT) + 1e-9; w += 0.01) {
  const wall = kind === 'lift' ? 10 + w : 13 + w;
  const song = kind === 'lift' ? Math.min(at, at - count.lengthSec + w) : at;
  const frame = poseAt(scene.plan, song, wall, t, audible, buffer);
  const pose = body!.index === null ? frame.conductor : frame.players[body!.index];
  poseStudioBones(rig, body!.model.skeleton, pose!.rotations, studioOffsets(pose!), 1, studio);
  const m = studio.matrices;
  const q = [turn(m, b.chest), turn(m, b.upper), turn(m, b.fore), turn(m, b.twist), turn(m, b.hand)];
  const loc = [q[0]!.clone().invert().multiply(q[1]!), q[1]!.clone().invert().multiply(q[2]!), q[2]!.clone().invert().multiply(q[3]!), q[3]!.clone().invert().multiply(q[4]!), q[4]!];
  const paw = q[2]!.clone().invert().multiply(q[4]!);
  const pt = twistAngle(paw, axis);
  const sw = paw.clone().multiply(new Quaternion().setFromAxisAngle(axis, -pt));
  const bone = twistAngle(q[2]!.clone().invert().multiply(q[3]!), axis) * DEG;
  const rates = prev ? loc.map((l, k) => Math.round(ang(prev![k]!, l) / 0.01)) : [0, 0, 0, 0, 0];
  const elbow = new Vector3(...h[`forearm_${side}`]!).applyMatrix4(new Matrix4().fromArray(m, b.fore * 16));
  console.log(`${w.toFixed(2)} | ${Math.round(pt * DEG)} | ${Math.round(bone)} | ${Math.round(2 * Math.acos(Math.min(1, Math.abs(sw.w))) * DEG)} | ${rates.join(' ')} | ${elbow.toArray().map((x) => x.toFixed(3)).join(',')}`);
  prev = loc;
}
