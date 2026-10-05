import {
  add,
  invert,
  length,
  multiply,
  normalize,
  reject,
  rotate,
  rotationBetween,
  scale,
  sub,
} from '../models/math.ts';
import type { Quat, Vec3 } from '../models/math.ts';
import { setBoneRotation } from './frames.ts';

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

/** The bind positions of the three joints of an arm, in the model axes. */
export interface ArmBind {
  /** The `upperArm` bone. */
  readonly shoulder: Vec3;
  /** The `forearm` bone. */
  readonly elbow: Vec3;
  /** The `hand` bone. */
  readonly wrist: Vec3;
}

/** The world rotations of the two bones of an arm, and the joints that they reach. */
export interface ArmPose extends ArmJoints {
  /** The world rotation of the upper arm, from its bind direction. */
  readonly upper: Quat;
  /** The world rotation of the forearm, from its bind direction. */
  readonly lower: Quat;
}

/**
 * Solves an arm with {@link solveTwoBone} and gives the world rotations of its two bones. Each
 * bone turns by the smallest rotation from its direction under the parent rotation, so the twist
 * of the arm follows the chest.
 *
 * @param bind The bind positions of the joints.
 * @param shoulder The posed position of the shoulder joint.
 * @param parent The world rotation of the parent of the upper arm: the `shoulder` bone.
 * @param target The position that the wrist must reach.
 * @param pole The direction to which the elbow points, in the model axes.
 * @returns The world rotations and the posed joints.
 */
export function solveArm(
  bind: ArmBind,
  shoulder: Vec3,
  parent: Quat,
  target: Vec3,
  pole: Vec3,
): ArmPose {
  const upperBind = sub(bind.elbow, bind.shoulder);
  const lowerBind = sub(bind.wrist, bind.elbow);
  const joints = solveTwoBone(shoulder, target, length(upperBind), length(lowerBind), pole);
  const upper = multiply(
    rotationBetween(rotate(parent, upperBind), sub(joints.elbow, shoulder)),
    parent,
  );
  const lower = multiply(
    rotationBetween(rotate(upper, lowerBind), sub(joints.wrist, joints.elbow)),
    upper,
  );
  return { ...joints, upper, lower };
}

/** One arm to solve: the bind joints, the posed shoulder joint, and the targets of the hand. */
export interface ArmTask {
  readonly bind: ArmBind;
  readonly joint: Vec3;
  /** The world rotation of the parent of the upper arm. */
  readonly parent: Quat;
  readonly wrist: Vec3;
  readonly hand: Quat;
  readonly pole: Vec3;
  readonly bones: readonly [upper: number, lower: number, hand: number];
}

/**
 * Solves one arm and writes the local rotations of its three bones.
 *
 * @param task The arm.
 * @param chest The world rotation of the chest, which turns the pole.
 * @param rotations The rotations of the pose to write.
 */
export function writeArm(task: ArmTask, chest: Quat, rotations: Float32Array): void {
  const arm = solveArm(task.bind, task.joint, task.parent, task.wrist, rotate(chest, task.pole));
  const [upper, lower, hand] = task.bones;
  setBoneRotation(rotations, upper, multiply(invert(task.parent), arm.upper));
  setBoneRotation(rotations, lower, multiply(invert(arm.upper), arm.lower));
  setBoneRotation(rotations, hand, multiply(invert(arm.lower), task.hand));
}
