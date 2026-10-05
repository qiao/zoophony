import {
  add,
  axisAngle,
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
import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import { posePoint, setBoneRotation } from './frames.ts';
import type { Frame } from './frames.ts';

/** The share of the arm length that a hand may reach, so that the elbow keeps a bend. */
export const ARM_REACH = 0.97;

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

/** The bone indices of one side of the body, from the shoulder to the fingers. */
export interface ArmBones {
  readonly shoulder: number;
  readonly upperArm: number;
  readonly forearm: number;
  readonly hand: number;
  readonly fingers: number;
}

/** One side of the body in the bind pose, in the model axes. */
export interface ArmRig {
  readonly side: 'L' | 'R';
  /** The bind position of the `shoulder` bone. */
  readonly clavicle: Vec3;
  readonly bind: ArmBind;
  /** The palm, from its hand bone. */
  readonly palm: Vec3;
  /** The longest distance from the shoulder joint to the wrist: {@link ARM_REACH} of the arm. */
  readonly reach: number;
  readonly bones: ArmBones;
}

/**
 * Reads the arm of one side from a player model.
 *
 * @param model The player model.
 * @param side The side of the body.
 * @returns The arm.
 */
export function armRig(model: PlayerModel, side: 'L' | 'R'): ArmRig {
  const bones: ArmBones = {
    shoulder: boneIndex(`shoulder${side}`),
    upperArm: boneIndex(`upperArm${side}`),
    forearm: boneIndex(`forearm${side}`),
    hand: boneIndex(`hand${side}`),
    fingers: boneIndex(`fingers${side}`),
  };
  const at = (bone: number): Vec3 => model.skeleton.positions[bone] ?? [0, 0, 0];
  const bind: ArmBind = {
    shoulder: at(bones.upperArm),
    elbow: at(bones.forearm),
    wrist: at(bones.hand),
  };
  return {
    side,
    clavicle: at(bones.shoulder),
    bind,
    palm: sub(side === 'L' ? model.body.palmL : model.body.palmR, bind.wrist),
    reach:
      ARM_REACH * (length(sub(bind.elbow, bind.shoulder)) + length(sub(bind.wrist, bind.elbow))),
    bones,
  };
}

/**
 * Turns the `shoulder` bone of an arm and gives its posed frame. The position of the frame is
 * the posed shoulder joint: the `upperArm` bone.
 *
 * @param arm The arm.
 * @param chest The posed frame of the chest.
 * @param chestBind The bind position of the chest.
 * @param turn The local rotation of the `shoulder` bone.
 * @returns The world rotation of the `shoulder` bone and the posed shoulder joint.
 */
export function poseShoulder(arm: ArmRig, chest: Frame, chestBind: Vec3, turn: Quat): Frame {
  const rotation = multiply(chest.rotation, turn);
  const clavicle = posePoint(chest, chestBind, arm.clavicle);
  return {
    rotation,
    position: add(clavicle, rotate(rotation, sub(arm.bind.shoulder, arm.clavicle))),
  };
}

/** One arm to solve: the arm, its posed shoulder, and the targets of the hand. */
export interface ArmTask {
  readonly arm: ArmRig;
  /** The posed `shoulder` bone, from {@link poseShoulder}. */
  readonly shoulder: Frame;
  readonly wrist: Vec3;
  readonly hand: Quat;
  readonly pole: Vec3;
}

/**
 * Solves one arm and writes the local rotations of its upper arm, its forearm, and its hand.
 *
 * @param task The arm.
 * @param chest The world rotation of the chest, which turns the pole.
 * @param rotations The rotations of the pose to write.
 */
export function writeArm(task: ArmTask, chest: Quat, rotations: Float32Array): void {
  const { arm, shoulder } = task;
  const parent = shoulder.rotation;
  const solved = solveArm(
    arm.bind,
    shoulder.position,
    parent,
    task.wrist,
    rotate(chest, task.pole),
  );
  setBoneRotation(rotations, arm.bones.upperArm, multiply(invert(parent), solved.upper));
  setBoneRotation(rotations, arm.bones.forearm, multiply(invert(solved.upper), solved.lower));
  setBoneRotation(rotations, arm.bones.hand, multiply(invert(solved.lower), task.hand));
}

/**
 * Writes the curl of the fingers of one hand. A positive curl closes the fingers of each side.
 *
 * @param arm The arm.
 * @param curl The curl angle, in radians.
 * @param rotations The rotations of the pose to write.
 */
export function writeCurl(arm: ArmRig, curl: number, rotations: Float32Array): void {
  setBoneRotation(
    rotations,
    arm.bones.fingers,
    axisAngle([0, 0, 1], arm.side === 'L' ? curl : -curl),
  );
}
