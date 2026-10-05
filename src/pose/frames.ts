import { add, multiply, rotate, sub } from '../models/math.ts';
import { IDENTITY } from '../models/tuples.ts';
import type { Quat, Vec3 } from '../models/tuples.ts';
import { BONE_NAMES } from '../models/rig.ts';
import type { Skeleton } from '../models/rig.ts';

/** The world rotation and the posed position of one bone. */
export interface Frame {
  /** The world rotation from the bind pose. */
  readonly rotation: Quat;
  /** The posed position of the bone, in the model axes. */
  readonly position: Vec3;
}

/** The rotations of the bind pose: no rotation on any bone (design 4.7). */
export const BIND_ROTATIONS: Float32Array = new Float32Array(
  BONE_NAMES.flatMap(() => [0, 0, 0, 1]),
);

/**
 * Reads the rotation of one bone from the rotations of a pose.
 *
 * @param rotations The rotations, four numbers for each bone.
 * @param bone The bone index.
 * @returns The rotation.
 */
export function boneRotation(rotations: Float32Array, bone: number): Quat {
  const i = bone * 4;
  return [rotations[i] ?? 0, rotations[i + 1] ?? 0, rotations[i + 2] ?? 0, rotations[i + 3] ?? 1];
}

/**
 * Writes the rotation of one bone into the rotations of a pose.
 *
 * @param rotations The rotations, four numbers for each bone.
 * @param bone The bone index.
 * @param q The rotation.
 */
export function setBoneRotation(rotations: Float32Array, bone: number, q: Quat): void {
  rotations.set(q, bone * 4);
}

/**
 * Calculates the frames of the first bones of a skeleton from the local rotations of a pose.
 * Each parent comes before its children in `BONE_NAMES`, so the first bones form a closed
 * chain: `root`, `hips`, `spine`, `chest` for a count of 4.
 *
 * @param skeleton The bind skeleton.
 * @param rotations The local rotations of the pose.
 * @param count The number of bones from the first.
 * @param rootOffset The offset of the root bone.
 * @returns One frame for each of the first bones.
 */
export function chainFrames(
  skeleton: Skeleton,
  rotations: Float32Array,
  count: number,
  rootOffset: Vec3 = [0, 0, 0],
): Frame[] {
  const frames: Frame[] = [];
  for (let i = 0; i < count; i++) {
    const local = boneRotation(rotations, i);
    const bind = skeleton.positions[i] ?? [0, 0, 0];
    const parentIndex = skeleton.parents[i] ?? -1;
    const parent = frames[parentIndex];
    if (!parent) {
      frames.push({ rotation: multiply(IDENTITY, local), position: add(bind, rootOffset) });
      continue;
    }
    const parentBind = skeleton.positions[parentIndex] ?? [0, 0, 0];
    frames.push({
      rotation: multiply(parent.rotation, local),
      position: add(parent.position, rotate(parent.rotation, sub(bind, parentBind))),
    });
  }
  return frames;
}

/**
 * Moves a bind point that follows a bone to its posed place.
 *
 * @param frame The frame of the bone.
 * @param bind The bind position of the bone.
 * @param point The bind point.
 * @returns The posed point.
 */
export function posePoint(frame: Frame, bind: Vec3, point: Vec3): Vec3 {
  return add(frame.position, rotate(frame.rotation, sub(point, bind)));
}
