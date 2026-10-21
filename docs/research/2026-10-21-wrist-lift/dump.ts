// node scratch/dump.ts <role> <demo> <lift|lower> <at> <out.json> <t1,t2,...>
import { writeFileSync } from 'node:fs';
import { Matrix4, Vector3 } from 'three';
import { FOLD_ROLES, roleBodies } from '../../../tools/fold-probe.ts';
import { probeDemos } from '../../../tools/probe-demos.ts';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
import { createStudioPose, poseStudioBones, skinStudioMesh, studioOffsets } from '../../../src/models/studio-rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { PLAYING, allAudible, sceneOf } from '../../../src/pose/test-scene.ts';
import type { Transport } from '../../../src/pose/types.ts';
const [role = '', file = '', kind = 'lift', atText = '0', out = '', times = ''] = process.argv.slice(2);
const atRaw = Number(atText);
const demo = (await probeDemos()).find((d) => d.file === file)!;
const scene = sceneOf(demo.bytes);
const [body] = roleBodies(FOLD_ROLES.get(role)!, scene);
const rig = body!.model.studio!;
const audible = allAudible(scene.score);
const buffer = createScenePose(scene.plan);
const at = atText === 'end' ? scene.score.durationSec : atRaw;
const count = countInAt(scene.plan.beats, at);
const t: Transport = kind === 'lift'
  ? { ...PLAYING, changedAtWall: 10, startSec: at }
  : { ...PLAYING, playing: false, changedAtWall: 10, before: PLAYING, holdSec: 3 };
const studio = createStudioPose();
const frames = times.split(',').map(Number).map((w) => {
  const wall = kind === 'lift' ? 10 + w : 13 + w;
  const song = kind === 'lift' ? Math.min(at, at - count.lengthSec + w) : at;
  const frame = poseAt(scene.plan, song, wall, t, audible, buffer);
  const pose = body!.index === null ? frame.conductor : frame.players[body!.index];
  poseStudioBones(rig, body!.model.skeleton, pose!.rotations, studioOffsets(pose!), 1, studio);
  const posed = skinStudioMesh(rig.mesh, studio);
  const wrists = (['L', 'R'] as const).map((s) => new Vector3(...rig.body.heads[`hand_${s}`]).applyMatrix4(new Matrix4().fromArray(studio.matrices, STUDIO_BONES.indexOf(`hand_${s}`) * 16)).toArray());
  const mesh = body!.model.mesh;
  const n = STUDIO_BONES.length;
  const extra: number[] = [];
  const m = new Matrix4();
  const v = new Vector3();
  for (let k = 0; k < mesh.positions.length / 3; k++) {
    m.fromArray(studio.matrices, (n + (mesh.bones[k] ?? 0)) * 16);
    v.fromArray(mesh.positions, k * 3).applyMatrix4(m);
    extra.push(Math.round(v.x * 1e5) / 1e5, Math.round(v.y * 1e5) / 1e5, Math.round(v.z * 1e5) / 1e5);
  }
  return { w, positions: Array.from(posed, (x) => Math.round(x * 1e5) / 1e5), wrists, extra };
});
const mesh0 = body!.model.mesh;
writeFileSync(out, JSON.stringify({ extraColors: Array.from({ length: mesh0.positions.length / 9 }, (_, i) => [mesh0.colors[i * 9] ?? 0, mesh0.colors[i * 9 + 1] ?? 0, mesh0.colors[i * 9 + 2] ?? 0].map((x) => Math.round(x * 1e3) / 1e3)).flat(), corners: Array.from(rig.mesh.corners), colors: Array.from(rig.mesh.colors, (x) => Math.round(x * 1e3) / 1e3), frames }));
console.log('wrote', out, frames.length);
