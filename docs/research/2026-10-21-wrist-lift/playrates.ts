import { Matrix4, Quaternion, Vector3 } from 'three';
import { FOLD_ROLES, roleBodies } from '../../../tools/fold-probe.ts';
import { probeDemos } from '../../../tools/probe-demos.ts';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
import { createStudioPose, poseStudioBones, studioOffsets, twistAngle } from '../../../src/models/studio-rig.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { PLAYING, allAudible, sceneOf } from '../../../src/pose/test-scene.ts';
const DEG = 180 / Math.PI;
const turn = (m: Float32Array, k: number) => new Quaternion().setFromRotationMatrix(new Matrix4().fromArray(m, k * 16));
const ang = (a: Quaternion, c: Quaternion) => 2 * Math.acos(Math.min(1, Math.abs(a.dot(c)))) * DEG;
const demos = await probeDemos();
const roles = process.argv.slice(2).length ? process.argv.slice(2) : [...FOLD_ROLES.keys()];
for (const role of roles) {
  const all: number[][] = [[], []];
  let twistMax = [0, 0];
  for (const demo of demos) {
    const scene = sceneOf(demo.bytes);
    const [body] = roleBodies(FOLD_ROLES.get(role)!, scene);
    if (!body) continue;
    const rig = body.model.studio!;
    const audible = allAudible(scene.score);
    const buffer = createScenePose(scene.plan);
    const studio = createStudioPose();
    const idx = (n: string) => STUDIO_BONES.indexOf(n as never);
    for (const [si, side] of (['L', 'R'] as const).entries()) {
      const b = [idx(`forearm_${side}`), idx(`forearm_twist_${side}`), idx(`hand_${side}`)];
      const h = rig.body.heads as Record<string, [number, number, number]>;
      const axis = new Vector3(...h[`hand_${side}`]!).sub(new Vector3(...h[`forearm_${side}`]!)).normalize();
      for (let k = 0; k < 6; k++) {
        const t0 = ((k + 0.5) * scene.score.durationSec) / 6;
        let prev: Quaternion[] | null = null;
        for (let s = t0; s < t0 + 3; s += 0.01) {
          const frame = poseAt(scene.plan, s, 10 + s, PLAYING, audible, buffer);
          const pose = body.index === null ? frame.conductor : frame.players[body.index];
          poseStudioBones(rig, body.model.skeleton, pose!.rotations, studioOffsets(pose!), 1, studio);
          const q = b.map((i) => turn(studio.matrices, i));
          const loc = [q[0]!.clone().invert().multiply(q[1]!), q[1]!.clone().invert().multiply(q[2]!)];
          twistMax[si] = Math.max(twistMax[si]!, Math.abs(twistAngle(q[0]!.clone().invert().multiply(q[2]!), axis) * DEG));
          if (prev) all[si]!.push(Math.max(ang(prev[0]!, loc[0]!), ang(prev[1]!, loc[1]!)) / 0.01);
          prev = loc;
        }
      }
    }
  }
  const pct = (a: number[], p: number) => { const s = a.toSorted((x, y) => x - y); return Math.round(s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 0); };
  console.log(role, ['L', 'R'].map((s, i) => `${s}: p99 ${pct(all[i]!, 0.99)} p999 ${pct(all[i]!, 0.999)} max ${pct(all[i]!, 1)} |paw| ${Math.round(twistMax[i]!)}`).join('  '));
}
