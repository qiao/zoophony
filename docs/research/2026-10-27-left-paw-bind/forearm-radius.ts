// Measures the thickness of the left forearm skin of a role: the mean and the 5th percentile of
// the distance of the vertices whose largest weight is on a left forearm segment from the line of
// the posed elbow and wrist, in cm, in the bind, at rest, and over the play at a step of 2 s, in
// the first six demos of the gate.
// Usage: node docs/research/2026-10-27-left-paw-bind/forearm-radius.ts [roles]
import { Matrix4, Vector3 } from 'three';

import { FOLD_ROLES, roleBodies } from '../../../tools/fold-probe.ts';
import { probeDemos } from '../../../tools/probe-demos.ts';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
import { createStudioPose, poseStudioBones, skinStudioMesh, studioOffsets } from '../../../src/models/studio-rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { NOT_STARTED, PLAYING, allAudible, sceneOf } from '../../../src/pose/test-scene.ts';

const roles = (process.argv[2] ?? 'violinist,fox-violinist,violist,flutist').split(',');
const demos = await probeDemos();
const segs = [0, 1, 2, 3].map((k) => STUDIO_BONES.indexOf(`forearm_seg${k}_L`));
for (const role of roles) {
  const source = FOLD_ROLES.get(role);
  if (!source) continue;
  const rest: number[] = [];
  const play: number[] = [];
  const bind: number[] = [];
  const studio = createStudioPose();
  for (const demo of demos.slice(0, 6)) {
    const scene = sceneOf(demo.bytes);
    const [body] = roleBodies(source, scene);
    if (!body || !body.model.studio) continue;
    const rig = body.model.studio;
    const mesh = rig.mesh;
    const count = mesh.positions.length / 3;
    const ids: number[] = [];
    for (let v = 0; v < count; v++) {
      let best = -1;
      let w = 0;
      for (let k = 0; k < 4; k++) {
        if ((mesh.weights[v * 4 + k] ?? 0) > w) {
          w = mesh.weights[v * 4 + k] ?? 0;
          best = mesh.joints[v * 4 + k] ?? -1;
        }
      }
      if (segs.includes(best)) ids.push(v);
    }
    const h = rig.body.heads;
    const radius = (pos: ArrayLike<number>, e: Vector3, wr: Vector3, out: number[]): void => {
      const axis = wr.clone().sub(e).normalize();
      const p = new Vector3();
      for (const v of ids) {
        p.set(pos[v * 3] ?? 0, pos[v * 3 + 1] ?? 0, pos[v * 3 + 2] ?? 0).sub(e);
        out.push(p.addScaledVector(axis, -p.dot(axis)).length() * 100);
      }
    };
    if (bind.length === 0) {
      radius(mesh.positions, new Vector3(...h.forearm_L), new Vector3(...h.hand_L), bind);
    }
    const audible = allAudible(scene.score);
    const buffer = createScenePose(scene.plan);
    const start = -countInAt(scene.plan.beats, 0).lengthSec;
    const sample = (song: number, wall: number, transport: typeof PLAYING, out: number[]): void => {
      const frame = poseAt(scene.plan, song, wall, transport, audible, buffer);
      const pose = body.index === null ? frame.conductor : frame.players[body.index];
      if (!pose) return;
      poseStudioBones(rig, body.model.skeleton, pose.rotations, studioOffsets(pose), 1, studio);
      const posed = skinStudioMesh(mesh, studio);
      const at = (name: string): Vector3 =>
        new Vector3(...h[name as keyof typeof h]).applyMatrix4(
          new Matrix4().fromArray(studio.matrices, STUDIO_BONES.indexOf(name as never) * 16),
        );
      radius(posed, at('forearm_L'), at('hand_L'), out);
    };
    sample(start, 10, NOT_STARTED, rest);
    for (let song = start; song <= scene.score.durationSec; song += 2) {
      sample(song, 10 + song - start, PLAYING, play);
    }
  }
  const stat = (xs: number[]): string => {
    const s = xs.toSorted((a, b) => a - b);
    const mean = s.reduce((a, b) => a + b, 0) / s.length;
    return `mean ${mean.toFixed(3)} p5 ${(s[Math.floor(0.05 * s.length)] ?? NaN).toFixed(3)}`;
  };
  console.log(`${role}: bind ${stat(bind)} | rest ${stat(rest)} | play ${stat(play)} cm`);
}
