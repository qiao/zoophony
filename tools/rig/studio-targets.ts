// Output: the bind arms of `tools/mesh-rigs/rabbit.json` and `tools/mesh-rigs/fox.json`.
/**
 * Prints the seat and the bind arms of the studio rabbit, which the rig of the mesh rabbit copies
 * (`tools/mesh-rigs/rabbit.json`): the world turn of each left leg bone from the bind pose to the
 * first key of the clip `reference`, and the unit direction of each left arm bone in the bind
 * pose, in the axes of the studio.
 *
 *     node tools/rig/studio-targets.ts
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Matrix4, Quaternion, Vector3 } from 'three';

import { firstKeys, readGlb, readSkeleton, worldMatrices } from '../studio-body.ts';

const root = join(import.meta.dirname, '..', '..');
const glb = readGlb(readFileSync(join(root, 'lowpoly-studio/animals/rabbit/out/rabbit.glb')));
const skeleton = readSkeleton(glb);
const posed = worldMatrices(glb.json, firstKeys(glb, 'reference').nodes);
const round = (values: readonly number[]): string =>
  `[${values.map((v) => Math.round(v * 1e6) / 1e6).join(', ')}]`;
for (const bone of ['thigh_L', 'shin_L', 'foot_L', 'toes_L']) {
  const bind = skeleton.binds.get(bone) ?? new Matrix4();
  const world = posed[skeleton.nodes.get(bone) ?? -1] ?? new Matrix4();
  const turn = new Quaternion()
    .setFromRotationMatrix(world)
    .multiply(new Quaternion().setFromRotationMatrix(bind).invert());
  console.log(`turn ${bone}: ${round(turn.toArray())}`);
}
const head = (bone: string): Vector3 =>
  new Vector3().setFromMatrixPosition(skeleton.binds.get(bone) ?? new Matrix4());
for (const [bone, child] of [
  ['upper_arm_L', 'forearm_L'],
  ['forearm_L', 'hand_L'],
  ['hand_L', 'fingers_L'],
] as const) {
  console.log(`bind ${bone}: ${round(head(child).sub(head(bone)).normalize().toArray())}`);
}
