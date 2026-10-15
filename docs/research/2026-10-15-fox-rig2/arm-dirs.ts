// Probe: the direction of the right upper arm in the axes of the chest at each sample of a role,
// with the folded faces. Usage: node docs/research/2026-10-15-fox-rig2/arm-dirs.ts <role> <out.jsonl> [step]
import { writeFileSync } from 'node:fs';
import { Quaternion, Vector3, Matrix4 } from 'three';

import { FOLD_ROLES, foldedFaces, roleBodies } from '../../../tools/fold-probe.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
import {
  createStudioPose,
  poseStudioBones,
  skinStudioMesh,
  studioOffsets,
} from '../../../src/models/studio-rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { NOT_STARTED, PLAYING, allAudible, sceneOf } from '../../../src/pose/test-scene.ts';
import type { Transport } from '../../../src/pose/types.ts';

const [roleName = 'fox-violinist', out = 'scratch/logs/dirs.jsonl', stepText = '0.25'] =
  process.argv.slice(2);
const role = FOLD_ROLES.get(roleName);
if (!role) {
  throw new Error('no role');
}
const step = Number(stepText);
const lines: string[] = [];
const rot = (m: Float32Array, b: number): Quaternion =>
  new Quaternion().setFromRotationMatrix(new Matrix4().fromArray(m, b * 16));
const bones = ['chest', 'clavicle_R', 'upper_arm_R', 'forearm_R', 'forearm_twist_R', 'hand_R'];
for (const demo of await patchedDemos()) {
  const scene = sceneOf(demo.bytes);
  const bodies = roleBodies(role, scene);
  if (bodies.length === 0) {
    continue;
  }
  const audible = allAudible(scene.score);
  const buffer = createScenePose(scene.plan);
  const start = -countInAt(scene.plan.beats, 0).lengthSec;
  const samples: [string, number, number, Transport][] = [['rest', start, 10, NOT_STARTED]];
  for (let song = start; song <= scene.score.durationSec; song += step) {
    samples.push(['play', song, 10 + song - start, PLAYING]);
  }
  const lift: Transport = { ...PLAYING, changedAtWall: 10 };
  for (let wall = 10; wall < 13; wall += 0.1) {
    samples.push(['lift', Math.min(0, start + wall - 10), wall, lift]);
  }
  for (const [set, song, wall, transport] of samples) {
    const frame = poseAt(scene.plan, song, wall, transport, audible, buffer);
    for (const { index, model } of bodies) {
      const rig = model.studio;
      const pose = index === null ? frame.conductor : frame.players[index];
      if (!rig || !pose) {
        continue;
      }
      const studio = poseStudioBones(
        rig,
        model.skeleton,
        pose.rotations,
        studioOffsets(pose),
        1,
        createStudioPose(),
      );
      const posed = skinStudioMesh(rig.mesh, studio);
      const folded = foldedFaces(rig.mesh, studio.matrices, posed);
      const chest = rot(studio.matrices, STUDIO_BONES.indexOf('chest'));
      const chestInv = chest.clone().invert();
      const up = rot(studio.matrices, STUDIO_BONES.indexOf('upper_arm_R'));
      const dir = new Vector3(...rig.arms.R.upper).applyQuaternion(up).applyQuaternion(chestInv);
      const dirL = new Vector3(...rig.arms.L.upper)
        .applyQuaternion(rot(studio.matrices, STUDIO_BONES.indexOf('upper_arm_L')))
        .applyQuaternion(chestInv);
      // The turns of the right arm bones in the axes of the chest: chest⁻¹ R.
      const turns = Object.fromEntries(
        bones.map((b) => {
          const q = chestInv.clone().multiply(rot(studio.matrices, STUDIO_BONES.indexOf(b)));
          return [b, [q.x, q.y, q.z, q.w].map((v) => Math.round(v * 1e5) / 1e5)];
        }),
      );
      lines.push(
        JSON.stringify({
          demo: demo.file,
          index,
          set,
          song: Math.round(song * 100) / 100,
          wall: Math.round(wall * 100) / 100,
          dir: dir.toArray().map((v) => Math.round(v * 1e4) / 1e4),
          dirL: dirL.toArray().map((v) => Math.round(v * 1e4) / 1e4),
          w: Array.from(studio.correctives).map((v) => Math.round(v * 1e3) / 1e3),
          folded,
          turns,
        }),
      );
    }
  }
}
writeFileSync(out, lines.join('\n') + '\n');
console.log(`wrote ${lines.length} samples to ${out}`);
