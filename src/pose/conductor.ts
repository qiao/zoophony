import { MathUtils, Quaternion, Vector3 } from 'three';

import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import { placePoint } from '../models/instruments/hold.ts';
import { toVec3 } from '../models/tuples.ts';
import type { Vec3 } from '../models/tuples.ts';
import { mixRotation } from './blend.ts';
import type { TorsoFrames } from './bowed.ts';
import type { BatonState } from './conductor-notes.ts';
import { createFrame, setFromBasis } from './frames.ts';
import {
  armRig,
  handToward,
  hangingWrist,
  limitReach,
  poseShoulder,
  writeArm,
  writeCurl,
} from './ik.ts';
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
const BATON_BIND = setFromBasis(new Quaternion(), new Vector3(0, 0, -1), new Vector3(0, 1, 0));

/** The inverse of {@link BATON_BIND}. */
const BATON_INVERSE = BATON_BIND.clone().invert();

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
  const fromShoulder = (v: Vec3): Vec3 =>
    toVec3(new Vector3(...v).multiplyScalar(h).add(new Vector3(...right.bind.shoulder)));
  return {
    chestBind: model.skeleton.positions[boneIndex('chest')] ?? [0, 0, 0],
    left: armRig(model, 'L'),
    right,
    tip: placePoint(model.pieces, { bone: tip.bone, at: tip.from }),
    beatPoint: fromShoulder(CONDUCTOR_HOLD.beatPoint),
    pivot: fromShoulder(CONDUCTOR_HOLD.batonPivot),
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

/** The rotation that changes nothing. Nothing writes it. */
const NO_TURN = new Quaternion();

const right = createFrame();
const left = createFrame();
const tip = new Vector3();
const along = new Vector3();
const top = new Vector3();
const offset = new Vector3();
const wristBind = new Vector3();
const wrist = new Vector3();
const hand = new Quaternion();
const hanging = new Vector3();
const direction = new Vector3();

/**
 * Writes the wrist and the world rotation of the right hand with the tip of the baton at a point.
 * The baton points from the pivot to the tip, with its top up. The function writes the module
 * vectors `wrist` and `hand`.
 *
 * @param rig The points of the conductor.
 * @param point The point of the tip.
 */
function batonHand(rig: ConductorRig, point: Vector3): void {
  along.copy(point).sub(offset.fromArray(rig.pivot)).normalize();
  top.set(0, 1, 0).addScaledVector(along, -along.y);
  if (top.length() > 1e-6) {
    top.normalize();
  } else {
    top.set(0, 0, 1);
  }
  setFromBasis(hand, along, top).multiply(BATON_INVERSE);
  offset.fromArray(rig.tip).sub(wristBind.fromArray(rig.right.bind.wrist)).applyQuaternion(hand);
  wrist.copy(point).sub(offset);
}

/**
 * Writes the direction of the left hand of a cue: to the section, at most 20° to the right of the
 * front, and 30° up.
 *
 * @param shoulder The posed left shoulder joint.
 * @param target The point of the cued section.
 * @param out The vector to write.
 * @returns `out`, with the unit direction.
 */
function cueDirection(shoulder: Vector3, target: Vec3, out: Vector3): Vector3 {
  const hold = CONDUCTOR_HOLD;
  const yaw = Math.min(Math.atan2(target[0] - shoulder.x, shoulder.z - target[2]), hold.cueRight);
  const level = Math.cos(hold.cueLift);
  return out.set(Math.sin(yaw) * level, Math.sin(hold.cueLift), -Math.cos(yaw) * level);
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

  poseShoulder(rig.right, chest, rig.chestBind, NO_TURN, right);
  batonHand(rig, tip.fromArray(rig.beatPoint).add(offset.set(state.baton.x, state.baton.y, 0)));
  hangingWrist(rig.right, right, hanging);
  limitReach(rig.right, right.position, wrist);
  writeArm(
    {
      arm: rig.right,
      shoulder: right,
      wrist: wrist.lerpVectors(hanging, wrist, weight),
      hand: mixRotation(right.rotation, hand, weight, hand),
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
  poseShoulder(rig.left, chest, rig.chestBind, NO_TURN, left);
  cueDirection(left.position, state.cue, direction);
  wrist.copy(left.position).addScaledVector(direction, hold.cueReach * rig.left.reach);
  handToward(left, tip.copy(wrist).add(direction), hand);
  hangingWrist(rig.left, left, hanging);
  writeArm(
    {
      arm: rig.left,
      shoulder: left,
      wrist: wrist.lerpVectors(hanging, wrist, cue),
      hand: mixRotation(left.rotation, hand, cue, hand),
      pole: hold.poleL,
    },
    chest.rotation,
    rotations,
  );
  writeCurl(rig.left, hold.cueCurl * cue, rotations);
}
