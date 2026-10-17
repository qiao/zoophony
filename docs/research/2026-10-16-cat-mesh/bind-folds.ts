/**
 * Counts the folded faces of the seated cat and the seated red fox with the bones of the player in
 * their bind pose (the arms straight down), and with the upper arm turned further down. Usage:
 *
 *     node docs/research/2026-10-16-cat-mesh/bind-folds.ts
 */
import { Quaternion, Vector3 } from 'three';
import { foldedFaces } from '../../../tools/fold-probe.ts';
import { buildPlayer } from '../../../src/models/player.ts';
import { BONE_NAMES, boneIndex } from '../../../src/models/rig.ts';
import { NO_OFFSETS, createStudioPose, poseStudioBones, skinStudioMesh } from '../../../src/models/studio-rig.ts';

for (const species of ['cat', 'fox-red'] as const) {
  const model = buildPlayer(species, species === 'cat' ? 'viola' : 'violin', 4, 'chair');
  const rig = model.studio!;
  const n = BONE_NAMES.length;
  const rot = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) rot[i * 4 + 3] = 1;
  const run = (label: string) => {
    const studio = poseStudioBones(rig, model.skeleton, rot, NO_OFFSETS, 1, createStudioPose());
    const posed = skinStudioMesh(rig.mesh, studio);
    const f = foldedFaces(rig.mesh, studio.matrices, posed);
    console.log(`${species} ${label}: ${f.length} folded [${f.slice(0, 12).join(' ')}] correctives ${Array.from(studio.correctives).map((x) => x.toFixed(2)).join(' ')}`);
  };
  run('bind');
  const arm = boneIndex('upperArmR');
  // Turn the right upper arm down around the forward axis of the model (the player faces -z).
  for (const deg of [10, 20, 30, 45, 60, 80]) {
    const q = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), (-deg * Math.PI) / 180);
    rot.set([q.x, q.y, q.z, q.w], arm * 4);
    run(`upperArmR down ${deg}`);
  }
  rot.set([0, 0, 0, 1], arm * 4);
  const armL = boneIndex('upperArmL');
  for (const deg of [30, 60]) {
    const q = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), (deg * Math.PI) / 180);
    rot.set([q.x, q.y, q.z, q.w], armL * 4);
    run(`upperArmL down ${deg}`);
  }
}
