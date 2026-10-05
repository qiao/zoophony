import { add, length, normalize, reject, scale, sub } from '../models/math.ts';
import type { Vec3 } from '../models/math.ts';

/** The elbow and the wrist of an arm after the two-bone solution. */
export interface ArmJoints {
  readonly elbow: Vec3;
  readonly wrist: Vec3;
}

/**
 * Places the elbow of an arm so that the wrist reaches a target: the analytic two-bone IK of
 * design 4.7. The elbow lies in the plane of the shoulder, the target, and the pole direction. If
 * the target is out of reach, the arm points straight to it. If the target is too near, the
 * wrist stops at the nearest distance that the two bones can reach.
 *
 * @param shoulder The position of the shoulder joint: the `upperArm` bone.
 * @param target The position that the wrist must reach: the `hand` bone.
 * @param upperLength The length of the upper arm, from the shoulder to the elbow.
 * @param lowerLength The length of the forearm, from the elbow to the wrist.
 * @param pole The direction to which the elbow points. It must not be parallel to the direction
 *   from the shoulder to the target.
 * @returns The elbow and the wrist.
 */
export function solveTwoBone(
  shoulder: Vec3,
  target: Vec3,
  upperLength: number,
  lowerLength: number,
  pole: Vec3,
): ArmJoints {
  const toTarget = sub(target, shoulder);
  const direction = normalize(toTarget);
  const reach = Math.min(
    Math.max(length(toTarget), Math.abs(upperLength - lowerLength) + 1e-6),
    upperLength + lowerLength - 1e-6,
  );
  const along = (upperLength ** 2 - lowerLength ** 2 + reach ** 2) / (2 * reach);
  const side = Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2));
  const bend = normalize(reject(pole, direction));
  const elbow = add(shoulder, add(scale(direction, along), scale(bend, side)));
  return { elbow, wrist: add(shoulder, scale(direction, reach)) };
}
