import { MathUtils } from 'three';
import {
  add,
  basisRotation,
  invert,
  length,
  multiply,
  normalize,
  reject,
  rotate,
  scale,
  sub,
} from '../models/math.ts';
import { IDENTITY } from '../models/tuples.ts';
import type { Quat, Vec3 } from '../models/tuples.ts';
import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import { placePoint } from '../models/instruments/hold.ts';
import { mix, mixRotation } from './blend.ts';
import type { TorsoFrames } from './bowed.ts';
import type { BatonState } from './conductor-notes.ts';
import { armRig, handToward, limitReach, poseShoulder, writeArm, writeCurl } from './ik.ts';
import type { ArmRig } from './ik.ts';

/**
 * The hold of the baton and the cues of the conductor (design 5.4). The places are in head
 * heights `H`, in the model axes of the bind pose: the bear faces -z, and its left is -x.
 */
export const CONDUCTOR_HOLD = {
  /**
   * The point of beat 1 of each pattern, from the right shoulder joint. The beats are above the
   * desk of the conductor stand, as the hands of the bear in the reference image.
   */
  beatPoint: [-0.1, 0.9, -1.2],
  /** The baton points from this place to its tip, from the right shoulder joint. */
  batonPivot: [0.1, 0.6, -0.2],
  /** The elbows point out to the sides, so that the arms stay clear of the desk. */
  poleL: [-1, -0.3, 0],
  poleR: [1, -0.3, 0],
  /** The curl of the fingers around the baton. */
  batonCurl: 60 * MathUtils.DEG2RAD,
  /** The left hand reaches this part of the reach of the arm for a cue. */
  cueReach: 0.85,
  /** The left hand points this far up to the cued section. */
  cueLift: 30 * MathUtils.DEG2RAD,
  /** The left hand points at most this far to the right of the front, so that it does not cross. */
  cueRight: 20 * MathUtils.DEG2RAD,
  /** The curl of the fingers of the open left hand of a cue. */
  cueCurl: 10 * MathUtils.DEG2RAD,
} as const;

/** The rotation of the baton in the bind pose: its tip to the front, +y up (design 4.6). */
const BATON_BIND = basisRotation([0, 0, -1], [0, 1, 0]);

/** The points of the conductor in the bind pose that the pose needs. */
export interface ConductorRig {
  readonly chestBind: Vec3;
  readonly left: ArmRig;
  readonly right: ArmRig;
  /** The tip of the baton in the bind pose. */
  readonly tip: Vec3;
  /** The point of beat 1 of a pattern, and the pivot of the baton, in the model axes. */
  readonly beatPoint: Vec3;
  readonly pivot: Vec3;
}

/**
 * Finds the points of the conductor that the pose needs.
 *
 * @param model The bear with the baton.
 * @returns The rig.
 * @throws Error if the baton has no tip.
 */
export function conductorRig(model: PlayerModel): ConductorRig {
  const tip = model.instrument.targets.find((t) => t.kind === 'tip');
  if (!tip) {
    throw new Error('The baton has no tip.');
  }
  const right = armRig(model, 'R');
  const h = model.body.headHeight;
  return {
    chestBind: model.skeleton.positions[boneIndex('chest')] ?? [0, 0, 0],
    left: armRig(model, 'L'),
    right,
    tip: placePoint(model.pieces, { bone: tip.bone, at: tip.from }),
    beatPoint: add(right.bind.shoulder, scale(CONDUCTOR_HOLD.beatPoint, h)),
    pivot: add(right.bind.shoulder, scale(CONDUCTOR_HOLD.batonPivot, h)),
  };
}

/** The motion of the conductor at one time. */
export interface ConductorState {
  /** The point of the tip of the baton in the beat plane. */
  readonly baton: BatonState;
  /** The point of the cued section, in the model axes, or `null` with no cue. */
  cue: Vec3 | null;
  /** The weight of the cue, from 0 to 1. */
  cueWeight: number;
}

/**
 * Gives the wrist and the world rotation of the right hand with the tip of the baton at a point.
 * The baton points from the pivot to the tip, with its top up.
 *
 * @param rig The points of the conductor.
 * @param tip The point of the tip.
 * @returns The wrist and the world rotation of the hand.
 */
function batonHand(rig: ConductorRig, tip: Vec3): readonly [wrist: Vec3, hand: Quat] {
  const along = normalize(sub(tip, rig.pivot));
  const up = reject([0, 1, 0], along);
  const top: Vec3 = length(up) > 1e-6 ? normalize(up) : [0, 0, 1];
  const hand = multiply(basisRotation(along, top), invert(BATON_BIND));
  return [sub(tip, rotate(hand, sub(rig.tip, rig.right.bind.wrist))), hand];
}

/**
 * Gives the direction of the left hand of a cue: to the section, at most 20° to the right of the
 * front, and 30° up.
 *
 * @param shoulder The posed left shoulder joint.
 * @param target The point of the cued section.
 * @returns The unit direction.
 */
function cueDirection(shoulder: Vec3, target: Vec3): Vec3 {
  const hold = CONDUCTOR_HOLD;
  const yaw = Math.min(Math.atan2(target[0] - shoulder[0], shoulder[2] - target[2]), hold.cueRight);
  const level = Math.cos(hold.cueLift);
  return [Math.sin(yaw) * level, Math.sin(hold.cueLift), -Math.cos(yaw) * level];
}

/**
 * Writes the arms and the fingers of the conductor (design 5.4, 4.7). The right hand moves the tip
 * of the baton to its point in the beat plane, and the two-bone IK places the arm. The left hand
 * points to a cued section. In the rest pose, the arms hang.
 *
 * @param rig The points of the conductor.
 * @param frames The posed frames of the root and of the chest.
 * @param state The motion at the song time.
 * @param weight The eased weight of the playing pose: 0 is the rest pose (5.2).
 * @param rotations The rotations of the pose to write.
 */
export function poseConductor(
  rig: ConductorRig,
  frames: TorsoFrames,
  state: ConductorState,
  weight: number,
  rotations: Float32Array,
): void {
  const hold = CONDUCTOR_HOLD;
  const chest = frames.chest;
  const hanging = (arm: ArmRig, shoulder: { position: Vec3; rotation: Quat }): Vec3 =>
    add(shoulder.position, rotate(shoulder.rotation, sub(arm.bind.wrist, arm.bind.shoulder)));

  const right = poseShoulder(rig.right, chest, rig.chestBind, IDENTITY);
  const tip = add(rig.beatPoint, [state.baton.x, state.baton.y, 0]);
  const [wrist, hand] = batonHand(rig, tip);
  writeArm(
    {
      arm: rig.right,
      shoulder: right,
      wrist: mix(hanging(rig.right, right), limitReach(rig.right, right.position, wrist), weight),
      hand: mixRotation(right.rotation, hand, weight),
      pole: hold.poleR,
    },
    chest.rotation,
    rotations,
  );
  writeCurl(rig.right, hold.batonCurl * weight, rotations);

  const cue = state.cue ? state.cueWeight * weight : 0;
  if (!state.cue || cue === 0) {
    return;
  }
  const left = poseShoulder(rig.left, chest, rig.chestBind, IDENTITY);
  const direction = cueDirection(left.position, state.cue);
  const reach = add(left.position, scale(direction, hold.cueReach * rig.left.reach));
  writeArm(
    {
      arm: rig.left,
      shoulder: left,
      wrist: mix(hanging(rig.left, left), reach, cue),
      hand: mixRotation(left.rotation, handToward(left, add(reach, direction)), cue),
      pole: hold.poleL,
    },
    chest.rotation,
    rotations,
  );
  writeCurl(rig.left, hold.cueCurl * cue, rotations);
}
