// The arms of the string roles at rest: the visible wrist bend (swing of the studio paw on the
// studio forearm) and twist, the elbow angle, the upper arm from the vertical, and the place of
// the right palm from the right hip joint (up, forward, out), in H and cm.
// Usage: node scratch/rest-probe.ts [--set <changes>] [--demo <id>] [--wall <s>]
import { Matrix4, Quaternion, Vector3 } from 'three';

import { FOLD_ROLES, roleBodies } from '../../../tools/fold-probe.ts';
import { probeDemos } from '../../../tools/probe-demos.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
import { createStudioPose, poseStudioBones, studioOffsets, twistAngle } from '../../../src/models/studio-rig.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { PLAYING, allAudible, sceneOf } from '../../../src/pose/test-scene.ts';

const opt = (name: string): string | null => {
  const at = process.argv.indexOf(name);
  return at >= 0 ? (process.argv[at + 1] ?? null) : null;
};
const setText = opt('--set');
if (setText) {
  setHolds(setText);
}
const demoName = `${opt('--demo') ?? 'mozart-k525'}.mid`;
const wallArg = opt('--wall');
const demos = await probeDemos();
const demo = demos.find((d) => d.file === demoName);
if (!demo) {
  throw new Error('no demo');
}
const scene = sceneOf(demo.bytes);
const audible = allAudible(scene.score);
const buffer = createScenePose(scene.plan);
const studioCount = STUDIO_BONES.length;
const mat = (m: ArrayLike<number>, bone: number): Matrix4 =>
  new Matrix4().fromArray(Array.from({ length: 16 }, (_, k) => m[bone * 16 + k] ?? 0));
const turnOf = (m: ArrayLike<number>, bone: number): Quaternion => new Quaternion().setFromRotationMatrix(mat(m, bone));
const posOf = (m: ArrayLike<number>, bone: number, bind: readonly number[]): Vector3 =>
  new Vector3(...bind).applyMatrix4(mat(m, bone));
const deg = (r: number): string => ((r * 180) / Math.PI).toFixed(0);

for (const role of ['violinist', 'fox-violinist', 'violist']) {
  const source = FOLD_ROLES.get(role);
  const [body] = source ? roleBodies(source, scene) : [];
  if (!body || body.index === null || !body.model.studio) {
    continue;
  }
  const rig = body.model.studio;
  const H = body.model.body.headHeight;
  const transport = wallArg
    ? { ...PLAYING, playing: false, changedAtWall: 10, before: PLAYING }
    : { ...PLAYING, playing: false, changedAtWall: 1e6 };
  const frame = poseAt(scene.plan, 0, wallArg ? 10 + Number(wallArg) : 0, transport, audible, buffer);
  const pose = frame.players[body.index];
  if (!pose) {
    continue;
  }
  const sp = poseStudioBones(rig, body.model.skeleton, pose.rotations, studioOffsets(pose), 1, createStudioPose());
  const m = sp.matrices;
  const pos = (name: string): Vector3 => {
    const i = boneIndex(name as Parameters<typeof boneIndex>[0]);
    return posOf(m, studioCount + i, body.model.skeleton.positions[i] ?? [0, 0, 0]);
  };
  const cells: string[] = [];
  for (const side of ['L', 'R'] as const) {
    const fore = turnOf(m, STUDIO_BONES.indexOf(`forearm_${side}`));
    const paw = turnOf(m, STUDIO_BONES.indexOf(`hand_${side}`));
    const foreBind = new Vector3(...rig.arms[side].fore).normalize();
    const rel = fore.clone().invert().multiply(paw);
    const twist = twistAngle(rel, foreBind);
    const swing = rel.clone().multiply(new Quaternion().setFromAxisAngle(foreBind, -twist));
    const swingAngle = 2 * Math.acos(Math.min(1, Math.abs(swing.w)));
    const s = pos(`upperArm${side}`);
    const e = pos(`forearm${side}`);
    const w = pos(`hand${side}`);
    const u = e.clone().sub(s);
    const f = w.clone().sub(e);
    const elbowAngle = Math.PI - u.angleTo(f);
    const fromVertical = u.angleTo(new Vector3(0, -1, 0));
    const heads = rig.body.heads;
    const sHead = (bone: string): Vector3 => {
      const at = STUDIO_BONES.indexOf(bone as (typeof STUDIO_BONES)[number]);
      return posOf(m, at, heads[bone as keyof typeof heads] ?? [0, 0, 0]);
    };
    const sElbow = sHead(`forearm_${side}`);
    const sWrist = sHead(`hand_${side}`);
    const sKnuckle = sHead(`fingers_${side}`);
    const bend = sKnuckle.clone().sub(sWrist).angleTo(sWrist.clone().sub(sElbow));
    cells.push(`${side}: bend ${deg(bend)}° swing ${deg(swingAngle)}° twist ${deg(twist)}° elbow ${deg(elbowAngle)}° upper from vertical ${deg(fromVertical)}°`);
  }
  const hip = pos('thighR');
  const knee = pos('shinR');
  const palm = pos('handR').lerp(pos('fingersR'), 0.5);
  const d = palm.clone().sub(hip);
  const thigh = knee.clone().sub(hip);
  const along = d.dot(thigh) / thigh.lengthSq();
  const elbowR = pos('forearmR');
  const shoulderR = pos('upperArmR');
  console.log(
    `${role}: ${cells.join(' | ')} | R palm from the hip: up ${(d.y / H).toFixed(2)} H (${(d.y * 100).toFixed(1)} cm), forward ${(-d.z / H).toFixed(2)} H, out ${(d.x / H).toFixed(2)} H, along the thigh ${along.toFixed(2)} | R elbow below the shoulder ${((shoulderR.y - elbowR.y) * 100).toFixed(1)} cm, out ${((elbowR.x - shoulderR.x) * 100).toFixed(1)} cm, back ${((elbowR.z - shoulderR.z) * 100).toFixed(1)} cm`,
  );
}
