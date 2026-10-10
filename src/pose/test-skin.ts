import { Vector3 } from 'three';

import { toVec3 } from '../models/tuples.ts';
import type { Vec3 } from '../models/tuples.ts';
import { posePoint } from './frames.ts';
import type { PosedSkeleton } from './test-kinematics.ts';

/** The place of a corner on its main bone. Each call writes it before it reads it. */
const onMain = new Vector3();

/** The place of a corner on its second bone. Each call writes it before it reads it. */
const onBlend = new Vector3();

/**
 * Moves a corner of the mesh of a posed player to its posed place with its two bones, as the
 * GPU skin does (design 4.4, 4.7): `(1 - w) × M(bone) p + w × M(blendBone) p`. The frames hold no
 * scale, so the helper ignores the blink of the eyes. Only tests use this function, so it does
 * not enter the first download.
 *
 * @param posed The posed skeleton. Its model gives the mesh.
 * @param corner The index of the corner in the mesh data.
 * @returns The posed corner, in the model axes.
 * @throws Error if a bone of the corner has no frame.
 */
export function posedCorner(posed: PosedSkeleton, corner: number): Vec3 {
  const { mesh, skeleton } = posed.model;
  const point: Vec3 = [
    mesh.positions[corner * 3] ?? 0,
    mesh.positions[corner * 3 + 1] ?? 0,
    mesh.positions[corner * 3 + 2] ?? 0,
  ];
  const bone = mesh.bones[corner] ?? 0;
  const blendBone = mesh.blendBones[corner] ?? bone;
  const weight = mesh.blendWeights[corner] ?? 0;
  const frame = posed.frames[bone];
  const blendFrame = posed.frames[blendBone];
  if (!frame || !blendFrame) {
    throw new Error(`The corner ${corner} follows a bone with no frame.`);
  }

  posePoint(frame, skeleton.positions[bone] ?? [0, 0, 0], point, onMain);
  posePoint(blendFrame, skeleton.positions[blendBone] ?? [0, 0, 0], point, onBlend);
  return toVec3(onMain.multiplyScalar(1 - weight).addScaledVector(onBlend, weight));
}
