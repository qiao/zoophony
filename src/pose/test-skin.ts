import { Quaternion, Vector3 } from 'three';

import { toVec3 } from '../models/tuples.ts';
import type { Vec3 } from '../models/tuples.ts';
import type { Skeleton } from '../models/rig.ts';
import type { Frame } from './frames.ts';
import type { PosedSkeleton } from './test-kinematics.ts';

/** The place of a corner on one of its bones. Each call writes it before it reads it. */
const onBone = new Vector3();

/** The sum of the weighted places of a corner. Each call writes it before it reads it. */
const sum = new Vector3();

/** The inverse rotation of a bind frame. Each call writes it before it reads it. */
const unturn = new Quaternion();

/**
 * Moves a bind point of the mesh with one posed bone, as the GPU skin does: the bone frame of
 * the pose times the inverse of its bind frame (design 4.7).
 *
 * @param skeleton The skeleton of the model.
 * @param bone The index of the bone.
 * @param frame The posed frame of the bone.
 * @param point The bind point of the mesh.
 * @param out The vector to write.
 * @returns `out`, with the posed point.
 */
function skinPoint(
  skeleton: Skeleton,
  bone: number,
  frame: Frame,
  point: Vec3,
  out: Vector3,
): Vector3 {
  const bind = skeleton.meshBind?.[bone];
  const at = bind?.position ?? skeleton.positions[bone] ?? [0, 0, 0];
  out.fromArray(point).sub(onBone.fromArray(at));
  if (bind) {
    out.applyQuaternion(unturn.fromArray(bind.rotation).invert());
  }
  return out.applyQuaternion(frame.rotation).add(frame.position);
}

/** The place of a corner on its current bone. Each call writes it before it reads it. */
const posedOnBone = new Vector3();

/**
 * Moves a corner of the mesh of a posed player to its posed place with its bones, as the GPU
 * skin does (design 4.4, 4.7): the sum of `w × M(bone) B(bone)⁻¹ p` over the bones of the
 * corner, where `B` is the bind frame of the bone. A corner of a rigged body has up to four
 * bones, and another corner its main bone and its second bone. The frames hold no scale, so the
 * helper ignores the blink of the eyes. Only tests use this function, so it does not enter the
 * first download.
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

  sum.set(0, 0, 0);
  const add = (bone: number, weight: number): void => {
    if (weight === 0) {
      return;
    }

    const frame = posed.frames[bone];
    if (!frame) {
      throw new Error(`The corner ${corner} follows a bone with no frame.`);
    }
    sum.addScaledVector(skinPoint(skeleton, bone, frame, point, posedOnBone), weight);
  };

  if (mesh.skin) {
    const { indices, weights } = mesh.skin;
    for (let k = corner * 4; k < corner * 4 + 4; k++) {
      add(indices[k] ?? 0, weights[k] ?? 0);
    }
  } else {
    const bone = mesh.bones[corner] ?? 0;
    const weight = mesh.blendWeights[corner] ?? 0;
    add(bone, 1 - weight);
    add(mesh.blendBones[corner] ?? bone, weight);
  }
  return toVec3(sum);
}
