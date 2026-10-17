/**
 * Probes the standing error of a rig with a reclined trunk at one vertex: the standing body of
 * the app in two stages (`standingBody()`, then the arm turns of the clip with the arm shapes, as
 * `standingError()` of `tools/rig-mesh-check.ts` does), against one skin of the seated bind with
 * the world turns of the clip of each bone and all corrective shapes at the weight 1.
 *
 *     node docs/research/2026-10-16-hip-open/standing-probe.ts <rig.glb> <source.obj> <animal> [<vertex>]
 */
import { readFileSync } from 'node:fs';

import { Matrix4, Quaternion, Vector3 } from 'three';

import {
  STUDIO_BONES,
  STUDIO_PARENTS,
  unpackStudioMesh,
} from '../../../src/models/studio-format.ts';
import type { StudioBone } from '../../../src/models/studio-format.ts';
import { createStudioPose, skinStudioMesh, studioRig } from '../../../src/models/studio-rig.ts';
import { objVertices, standingError } from '../../../tools/rig-mesh-check.ts';
import {
  ANIMALS,
  firstKeys,
  readGlb,
  readSkeleton,
  studioBody,
  worldMatrices,
} from '../../../tools/studio-body.ts';

const [glbPath, objPath, animal, vertexText] = process.argv.slice(2);
if (!glbPath || !objPath || !animal) {
  throw new Error('Usage: node docs/research/2026-10-16-hip-open/standing-probe.ts <rig.glb> <source.obj> <animal> [<v>]');
}
const settings = ANIMALS.get(animal);
if (!settings) {
  throw new Error(`No animal ${animal}`);
}
const bytes = new Uint8Array(readFileSync(glbPath));
const obj = readFileSync(objPath, 'utf8');
const { body } = studioBody(bytes, glbPath, { ...settings, seated: true, soloist: true });
const standing = body.standing;
if (!standing) {
  throw new Error('no standing pose');
}

// The world turn of each bone from the seated bind to the clip reference, in the model axes.
const glb = readGlb(bytes);
const skeleton = readSkeleton(glb);
const posed = worldMatrices(glb.json, firstKeys(glb, 'reference').nodes);
const clipTurn = (bone: string): Quaternion => {
  const world = posed[skeleton.nodes.get(bone) ?? -1] ?? new Matrix4();
  const bind = skeleton.binds.get(bone) ?? new Matrix4();
  const q = new Quaternion()
    .setFromRotationMatrix(world)
    .multiply(new Quaternion().setFromRotationMatrix(bind).invert());
  return new Quaternion(-q.x, q.y, -q.z, q.w);
};

// One stage: each bone turns by its clip turn around its head, the heads follow the parents.
const mesh = unpackStudioMesh(body.mesh);
const pose = createStudioPose();
const heads = new Map<StudioBone, Vector3>();
const turns = new Map<StudioBone, Quaternion>();
for (const [index, bone] of STUDIO_BONES.entries()) {
  const place = body.heads[bone];
  if (!place) {
    continue;
  }
  const from = new Vector3(...place);
  const parent = STUDIO_PARENTS[bone];
  const parentTurn = parent ? turns.get(parent) : undefined;
  const parentHead = parent ? heads.get(parent) : undefined;
  const to =
    parent && parentTurn && parentHead
      ? from
          .clone()
          .sub(new Vector3(...body.heads[parent]))
          .applyQuaternion(parentTurn)
          .add(parentHead)
      : from.clone();
  const turn = bone.startsWith('eye_') ? (parentTurn ?? new Quaternion()) : clipTurn(bone);
  heads.set(bone, to);
  turns.set(bone, turn);
  const matrix = new Matrix4().makeRotationFromQuaternion(turn);
  const offset = from.clone().applyQuaternion(turn);
  matrix.setPosition(to.x - offset.x, to.y - offset.y, to.z - offset.z);
  matrix.toArray(pose.matrices, index * 16);
}
// All shapes except the raised arm at the weight 1.
const shapes = mesh.correctives.length;
const raised = body.raise ? 1 : 0;
const weights = new Float32Array(shapes).fill(1);
if (raised) {
  weights[2] = 0;
}
const one = skinStudioMesh(mesh, { matrices: pose.matrices, correctives: weights });
let low = Infinity;
for (let v = 1; v < one.length; v += 3) {
  low = Math.min(low, one[v] ?? 0);
}
const lift = new Vector3(...standing.lift);
lift.y = -low;
const target = objVertices(obj, body.scale);
const nearest = (p: Vector3): number =>
  Math.sqrt(target.reduce((best, q) => Math.min(best, p.distanceToSquared(q)), Infinity));
let worst = 0;
let worstAt = -1;
const errors: number[] = [];
for (let v = 0; v < one.length / 3; v++) {
  const p = new Vector3().fromArray(one, v * 3).add(lift);
  const e = nearest(p);
  errors.push(e);
  if (e > worst) {
    worst = e;
    worstAt = v;
  }
}
const two = standingError(bytes, body, obj);
console.log(`two stages (standingError): ${(two.worst * 1000).toFixed(3)} mm at vertex ${two.worstVertex?.index}`);
console.log(`one stage (clip turns on the seated bind, all shapes): ${(worst * 1000).toFixed(3)} mm at vertex ${worstAt}`);
const v = vertexText === undefined ? (two.worstVertex?.index ?? 0) : Number(vertexText);
console.log(`vertex ${v}: one stage ${((errors[v] ?? 0) * 1000).toFixed(3)} mm`);
const bones: string[] = [];
for (let k = 0; k < 4; k++) {
  const w = mesh.weights[v * 4 + k] ?? 0;
  if (w > 0) {
    const b = STUDIO_BONES[mesh.joints[v * 4 + k] ?? 0] ?? '?';
    const t = turns.get(b as StudioBone) ?? new Quaternion();
    const angle = (2 * Math.acos(Math.min(1, Math.abs(t.w))) * 180) / Math.PI;
    bones.push(`${b} ${w.toFixed(3)} (clip turn ${angle.toFixed(1)}°)`);
  }
}
console.log(`  bones: ${bones.join(', ')}`);
// The turns of the standing pose of the export against the clip turns, for each turned bone.
const own = { ...standing.turns, ...(standing.tailTurns ?? {}), ...(standing.trunkTurns ?? {}) };
for (const [bone, q] of Object.entries(own)) {
  if (!q) {
    continue;
  }
  const a = new Quaternion(...q);
  const b = turns.get(bone as StudioBone) ?? new Quaternion();
  console.log(`  standing turn ${bone}: ${((a.angleTo(b) * 180) / Math.PI).toFixed(4)}° from the clip turn`);
}
void studioRig;
