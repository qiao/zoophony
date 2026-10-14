/**
 * Checks that the app gives back the long-armed source mesh of the rabbit from its rig: the
 * standing body of `studioRig(body, true)` of `src/models/studio-rig.ts`, with each arm turned to
 * the arm of the clip `reference` (the arm of the sheet) and both arm corrective shapes at the
 * weight 1. It prints the largest distance of a posed vertex from the nearest vertex of the
 * long-armed source, and the other way, in millimeters at the scale of the app. The vertices of
 * the eye shells are new, so they do not count.
 *
 *     pnpm rig-mesh rabbit --preview <dir>
 *     node docs/research/2026-10-13-rabbit-mesh/standing-probe.ts <dir>/source-long-arms.obj
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Matrix4, Quaternion, Vector3 } from 'three';

import { STUDIO_BONES, STUDIO_PARENTS } from '../../../src/models/studio-format.ts';
import type { StudioBone } from '../../../src/models/studio-format.ts';
import { createStudioPose, skinStudioMesh, studioRig } from '../../../src/models/studio-rig.ts';
import {
  ANIMALS,
  firstKeys,
  readGlb,
  readSkeleton,
  studioBody,
  worldMatrices,
} from '../../../tools/studio-body.ts';

const root = join(import.meta.dirname, '..', '..', '..');
const source = 'assets/models/rabbit/rabbit-4.rig.glb';
const bytes = readFileSync(join(root, source));
const settings = ANIMALS.get('rabbit');
if (!settings) {
  throw new Error('ANIMALS has no rabbit.');
}
const { body } = studioBody(bytes, source, { ...settings, glb: source });
const rig = studioRig(body, true);

// The world turn of each arm bone from the bind pose to the clip reference, in the model axes.
const glb = readGlb(bytes);
const skeleton = readSkeleton(glb);
const posed = worldMatrices(glb.json, firstKeys(glb, 'reference').nodes);
const turnOf = (bone: string): Quaternion => {
  const world = posed[skeleton.nodes.get(bone) ?? -1] ?? new Matrix4();
  const bind = skeleton.binds.get(bone) ?? new Matrix4();
  const q = new Quaternion()
    .setFromRotationMatrix(world)
    .multiply(new Quaternion().setFromRotationMatrix(bind).invert());
  return new Quaternion(-q.x, q.y, -q.z, q.w);
};
const arm = (bone: string): boolean =>
  /^(clavicle|upper_arm|forearm|forearm_twist|hand|fingers)_/.test(bone);

// Each arm bone turns around its head, and its children follow it from the chest out.
const pose = createStudioPose();
const heads = new Map<StudioBone, Vector3>();
const turns = new Map<StudioBone, Quaternion>();
for (const [index, bone] of STUDIO_BONES.entries()) {
  const from = new Vector3(...rig.body.heads[bone]);
  const parent = STUDIO_PARENTS[bone];
  const parentTurn = parent ? turns.get(parent) : undefined;
  const parentHead = parent ? heads.get(parent) : undefined;
  const to =
    parent && parentTurn && parentHead
      ? from
          .clone()
          .sub(new Vector3(...rig.body.heads[parent]))
          .applyQuaternion(parentTurn)
          .add(parentHead)
      : from.clone();
  const turn = arm(bone) ? turnOf(bone) : new Quaternion();
  heads.set(bone, to);
  turns.set(bone, turn);
  const matrix = new Matrix4().makeRotationFromQuaternion(turn);
  const offset = from.clone().applyQuaternion(turn);
  matrix.setPosition(to.x - offset.x, to.y - offset.y, to.z - offset.z);
  matrix.toArray(pose.matrices, index * 16);
}

// The weight that poseStudioBones() gives each arm shape: the place of the upper arm between its
// bind direction and its direction in the sheet, in the axes of the chest (the chest does not turn).
for (const [k, side] of (['L', 'R'] as const).entries()) {
  const bind = new Vector3(...rig.body.heads[`forearm_${side}`])
    .sub(new Vector3(...rig.body.heads[`upper_arm_${side}`]))
    .normalize();
  const now = (heads.get(`forearm_${side}`) ?? new Vector3())
    .clone()
    .sub(heads.get(`upper_arm_${side}`) ?? new Vector3())
    .normalize();
  const span = new Vector3(...rig.body.sheetArms[side]).sub(bind);
  const weight = now.sub(bind).dot(span) / span.lengthSq();
  console.log(`arm ${side}: corrective weight of the retarget ${weight.toFixed(4)}`);
  pose.correctives[k] = 1;
}
const positions = skinStudioMesh(rig.mesh, pose);

// The long-armed source of `pnpm rig-mesh --preview`, in meters in the model axes.
const obj = readFileSync(process.argv[2] ?? '', 'utf8');
const target: Vector3[] = [];
for (const line of obj.split('\n')) {
  const [kind, x, y, z] = line.split(' ');
  if (kind === 'v') {
    target.push(new Vector3(-Number(x), Number(y), -Number(z)).multiplyScalar(body.scale));
  }
}

// The vertices of the eye shells follow the eye bones.
const eyes = new Set([STUDIO_BONES.indexOf('eye_L'), STUDIO_BONES.indexOf('eye_R')]);
const count = positions.length / 3;
const mine: Vector3[] = [];
let shells = 0;
for (let v = 0; v < count; v++) {
  if (eyes.has(rig.mesh.joints[v * 4] ?? -1) && (rig.mesh.weights[v * 4] ?? 0) > 0.5) {
    shells++;
    continue;
  }
  mine.push(new Vector3().fromArray(positions, v * 3));
}
const nearest = (p: Vector3, set: readonly Vector3[]): number =>
  Math.min(...set.map((q) => p.distanceTo(q)));
let worst = 0;
let worstAt = -1;
for (const [v, p] of mine.entries()) {
  const d = nearest(p, target);
  if (d > worst) {
    worst = d;
    worstAt = v;
  }
}
const back = Math.max(...target.map((q) => nearest(q, mine)));
console.log(
  `posed vertices ${mine.length} (eye shells ${shells} left out), source vertices ${target.length}`,
);
console.log(
  `largest distance of a posed vertex from the source: ${(worst * 1000).toFixed(3)} mm (vertex ${worstAt})`,
);
console.log(
  `largest distance of a source vertex from the posed mesh: ${(back * 1000).toFixed(3)} mm`,
);
