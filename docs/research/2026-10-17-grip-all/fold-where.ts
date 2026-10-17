/**
 * Lists the play samples in which given faces of the rabbit or the red fox fold, with the song
 * time and the direction of the right upper arm and forearm in the axes of the chest.
 *
 * Usage: node docs/research/2026-10-17-grip-all/fold-where.ts <role> <species> <faces,...> [--grip ...] [--set ...] [--demo <id>]...
 */
import { Quaternion, Vector3 } from 'three';
import { boneIndex } from '../../../src/models/rig.ts';
import { createStudioPose, poseStudioBones, skinStudioMesh, studioOffsets } from '../../../src/models/studio-rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { PLAYING, allAudible, sceneOf } from '../../../src/pose/test-scene.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { FOLD_ROLES, foldedFaces, roleBodies } from '../../../tools/fold-probe.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { patchedDemo, patchedDemos } from '../../../tools/patch-demos.ts';
import { applyGrips } from './grip-set.ts';

const args = process.argv.slice(2);
console.log('grips', applyGrips(args).join(' ') || 'tree');
const pick = (flag: string): string[] =>
  args.flatMap((arg, i) => (args[i - 1] === flag ? [arg] : []));
const sets = pick('--set');
if (sets.length > 0) {
  setHolds(sets.join(';'));
}
const [roleName, , faceList] = args as [string, string, string];
const handTxt = (sk: ReturnType<typeof poseSkeleton>): string => sk.frames[boneIndex("handR")]!.position.toArray().map((v) => (v * 100).toFixed(1)).join(",");
const faces = new Set(faceList.split(',').map(Number));
const role = FOLD_ROLES.get(roleName)!;
const asked = pick('--demo');
const demos =
  asked.length > 0
    ? await Promise.all(asked.map((d) => patchedDemo(`${d}.mid`)))
    : await patchedDemos();
for (const demo of demos) {
  const scene = sceneOf(demo.bytes);
  const bodies = roleBodies(role, scene);
  if (bodies.length === 0) {
    continue;
  }
  const audible = allAudible(scene.score);
  const buffer = createScenePose(scene.plan);
  const start = -countInAt(scene.plan.beats, 0).lengthSec;
  for (let song = start; song <= scene.score.durationSec; song += 0.25) {
    const frame = poseAt(scene.plan, song, 10 + song - start, PLAYING, audible, buffer);
    for (const { index, model } of bodies) {
      const pose = index === null ? null : frame.players[index];
      if (!pose || !model.studio) {
        continue;
      }
      const studio = poseStudioBones(model.studio, model.skeleton, pose.rotations, studioOffsets(pose), 1, createStudioPose());
      const posed = skinStudioMesh(model.studio.mesh, studio);
      const folded = foldedFaces(model.studio.mesh, studio.matrices, posed).filter((f) => faces.has(f));
      const win = pick("--from").length > 0 && song >= Number(pick("--from")[0]) && song <= Number(pick("--to")[0]);
      if (folded.length === 0 && !win) {
        continue;
      }
      if (pick("--from").length > 0 && !win) {
        continue;
      }
      const sk = poseSkeleton(model, pose);
      const chest = sk.frames[boneIndex('chest')]!;
      const inv = new Quaternion().copy(chest.rotation).invert();
      const p = (b: string): Vector3 => sk.frames[boneIndex(b as never)]!.position.clone();
      const up = p('forearmR').sub(p('upperArmR')).normalize().applyQuaternion(inv);
      const fo = p('handR').sub(p('forearmR')).normalize().applyQuaternion(inv);
      console.log(
        `${demo.file} ${song.toFixed(2)} faces ${folded.join(',')} upper ${up.toArray().map((v) => v.toFixed(2)).join(',')} fore ${fo.toArray().map((v) => v.toFixed(2)).join(',')}`,
      );
    }
  }
}
