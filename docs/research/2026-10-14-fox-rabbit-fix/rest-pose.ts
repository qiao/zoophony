// Poses the rest of a role body and prints the corrective weights and the folds with forced weights.
// node docs/research/2026-10-14-fox-rabbit-fix/rest-pose.ts <fold role> <demo> [wall]
import { FOLD_ROLES, roleBodies, foldedFaces } from '../../../tools/fold-probe.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { createStudioPose, poseStudioBones, skinStudioMesh, studioOffsets } from '../../../src/models/studio-rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { NOT_STARTED, PLAYING, allAudible, sceneOf } from '../../../src/pose/test-scene.ts';

const [roleName = 'violinist', demoName = 'bach-bwv1047', wallText] = process.argv.slice(2);
const role = FOLD_ROLES.get(roleName)!;
const demo = (await patchedDemos()).find((d) => d.file.startsWith(demoName))!;
const scene = sceneOf(demo.bytes);
const bodies = roleBodies(role, scene);
const audible = allAudible(scene.score);
const buffer = createScenePose(scene.plan);
const start = -countInAt(scene.plan.beats, 0).lengthSec;
const samples: [string, number, number, typeof PLAYING][] = [['rest', start, 10, NOT_STARTED]];
for (let wall = 10; wall < 13; wall += 0.5) {
  samples.push([`lift ${(wall - 10).toFixed(1)}`, Math.min(0, start + wall - 10), wall, { ...PLAYING, changedAtWall: 10 }]);
}
for (const [label, song, wall, transport] of samples) {
  const frame = poseAt(scene.plan, song, wall, transport, audible, buffer);
  for (const { index, model } of bodies) {
    const pose = index === null ? frame.conductor : frame.players[index];
    const rig = model.studio!;
    const studio = poseStudioBones(rig, model.skeleton, pose!.rotations, studioOffsets(pose!), 1, createStudioPose());
    const c = [...studio.correctives].map((x) => x.toFixed(2)).join(',');
    const count = (w: [number, number]) => {
      const s = { matrices: studio.matrices, correctives: new Float32Array(w) };
      return foldedFaces(rig.mesh, s.matrices, skinStudioMesh(rig.mesh, s)).length;
    };
    console.log(`${label}: correctives ${c}, folds ${foldedFaces(rig.mesh, studio.matrices, skinStudioMesh(rig.mesh, studio)).length}, with R=0 ${count([studio.correctives[0]!, 0])}, R=1 ${count([studio.correctives[0]!, 1])}`);
  }
}
