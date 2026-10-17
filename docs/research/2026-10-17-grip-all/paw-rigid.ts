/**
 * Checks whether the closed right paw of a species moves as one rigid piece with the studio bone
 * hand_R: the middle of the paw in the bind axes of hand_R, with the correctives of the pose and
 * with no correctives, and the corrective weights.
 *
 * Usage: node docs/research/2026-10-17-grip-all/paw-rigid.ts <species> [--grip ...]
 */
import { Matrix4, Triangle, Vector3 } from 'three';
import { boneIndex } from '../../../src/models/rig.ts';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
import {
  createStudioPose,
  poseStudioBones,
  skinStudioMesh,
  studioOffsets,
} from '../../../src/models/studio-rig.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { SWEEP_ROLES, soloistScene } from '../../../src/pose/test-sweep-roles.ts';
import type { SpeciesId } from '../../../src/models/species.ts';
import { patchedDemo } from '../../../tools/patch-demos.ts';
import { closeSurface, openLoops } from '../../../src/pose/test-clearance.ts';
import { volumeMiddle } from '../../../tools/bow-grip.ts';
import { applyGrips } from './grip-set.ts';

const args = process.argv.slice(2);
console.log('grips', applyGrips(args).join(' ') || 'tree');
const species = args[0] as SpeciesId;
const scenes = [
  { id: 'solo', scene: soloistScene('violinist', species) },
  { id: 'boulanger', scene: sceneOf((await patchedDemo('boulanger-matin.mid')).bytes) },
];
const handR = STUDIO_BONES.indexOf('hand_R');
for (const { id, scene } of scenes) {
  for (const player of SWEEP_ROLES.violinist.players(scene)) {
    const index = Number(/(\d+)/.exec(player.name)?.[1] ?? -1);
    if (scene.layout.players[index]?.cast.species !== species) {
      continue;
    }
    const rig = player.model.studio!;
    const mesh = player.model.mesh;
    const wanted = new Set([boneIndex('handR'), boneIndex('fingersR')]);
    const firsts: number[] = [];
    for (let v = 0; v < rig.mesh.corners.length; v += 3) {
      if (wanted.has(mesh.bones[v] ?? 0)) {
        firsts.push(v);
      }
    }
    for (const set of SWEEP_ROLES.violinist.sampleSets(scene)) {
      let k = 0;
      for (const sample of set.samples) {
        if (k++ % (set.name === 'play' ? 40 : 8) !== 0) {
          continue;
        }
        const pp = player.poseAt(sample);
        const posed = poseSkeleton(player.model, pp);
        const pose = poseStudioBones(
          rig,
          player.model.skeleton,
          pp.rotations,
          studioOffsets(pp),
          1,
          createStudioPose(),
        );
        const inv = new Matrix4().fromArray(pose.matrices, handR * 16).invert();
        const out: string[] = [];
        for (const zero of [false, true]) {
          if (zero) {
            pose.correctives.fill(0);
          }
          const verts = skinStudioMesh(rig.mesh, pose);
          const tri = firsts.map((v) => {
            const [a, b, c] = [0, 1, 2].map((q) => {
              const i = rig.mesh.corners[v + q] ?? 0;
              return new Vector3(verts[i * 3], verts[i * 3 + 1], verts[i * 3 + 2]);
            });
            return new Triangle(a, b, c);
          });
          const mid = volumeMiddle(closeSurface(tri, openLoops(tri))).applyMatrix4(inv);
          out.push(mid.toArray().map((x) => (x * 100).toFixed(1)).join(','));
        }
        const c = pose.correctives;
        void posed;
        console.log(
          `${id} ${set.name} k=${k - 1} bindMid cm [${out[0]}] noCorr [${out[1]}]`,
        );
      }
    }
  }
}
