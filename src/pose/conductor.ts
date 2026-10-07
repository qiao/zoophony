import { MathUtils, Quaternion, Vector3 } from 'three';

import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import { placePoint } from '../models/instruments/hold.ts';
import { toVec3 } from '../models/tuples.ts';
import type { Vec3 } from '../models/tuples.ts';
import { mixRotation } from './blend.ts';
import type { BatonState } from './conductor-notes.ts';
import { CUE_MOTION } from './cues.ts';
import type { CueState } from './cues.ts';
import { createFrame, setFromBasis } from './frames.ts';
import type { TorsoFrames } from './frames.ts';
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
 * The hold of the baton and of the left hand of the conductor (design 5.4). The places are in
 * head heights `H`, in the model axes of the bind pose: the bear faces -z, and its left is -x.
 * `CUE_MOTION` of `cues.ts` gives the directions of a cue.
 */
export const CONDUCTOR_HOLD = {
  /**
   * The point of beat 1 of each pattern, from the right shoulder joint: in front of the chest,
   * just above the desk of the conductor stand, as the hands of the bear in `animals.webp`. With
   * the first point, 0.9 H up and 1.2 H forward, the hand stayed next to the head (UX audit
   * 2026-10-05, AM1).
   */
  beatPoint: [-0.1, 0.45, -1.3],
  /**
   * The baton points from this place to its tip, from the right shoulder joint, so that it
   * points forward out of the hand.
   */
  batonPivot: [0.1, 0.1, -0.3],
  /** The elbows point out to the sides, so that the arms stay clear of the desk. */
  poleL: [-1, -0.3, 0],
  poleR: [1, -0.3, 0],
  /** The curl of the fingers around the baton. */
  batonCurl: 60 * MathUtils.DEG2RAD,
  /**
   * In the lift and in the lowering of the arms (5.2), the baton turns toward this direction: out
   * to the right side and down, as a loose wrist lets it fall. Thus its tip leaves the desk of the
   * conductor stand at the side before it comes down. With a straight lowering, the tip came
   * 0.006 m near the desk when the arms came down after the song end.
   */
  liftBaton: [0.8, -0.6, 0],
  /** The curl of the fingers of the open left hand of a cue. */
  cueCurl: 10 * MathUtils.DEG2RAD,
  /**
   * In the ready gesture of a count-in, the left hand points this far up, with the reach of a
   * cue, so that both hands are up (design 5.4).
   */
  readyLift: 40 * MathUtils.DEG2RAD,
  /** In the ready gesture, the left hand points this far inward, to the right of the front. */
  readyIn: 10 * MathUtils.DEG2RAD,
} as const;

/** The rotation of the baton in the bind pose: its tip to the front, +y up (design 4.6). */
const BATON_BIND = setFromBasis(new Quaternion(), new Vector3(0, 0, -1), new Vector3(0, 1, 0));

/** The inverse of {@link BATON_BIND}. */
const BATON_INVERSE = BATON_BIND.clone().invert();

/** The points of the conductor in the bind pose that the pose needs. */
export interface ConductorRig {
  readonly chestBind: Vec3;
  /** The bind position of the `spine` bone: the upper body turns around the vertical through it. */
  readonly spineBind: Vec3;
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
    spineBind: model.skeleton.positions[boneIndex('spine')] ?? [0, 0, 0],
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
  /**
   * The cue motion, with the turns already scaled by the weight of the playing pose. The beat
   * plane turns with the upper body.
   */
  readonly cue: CueState;
  /** The weight of the ready gesture of the left hand in a count-in, from 0 to 1. */
  ready: number;
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
const liftTurn = new Quaternion();
const hanging = new Vector3();
const direction = new Vector3();
const toCue = new Vector3();
const pivot = new Vector3();
const Y_AXIS = new Vector3(0, 1, 0);

/** The direction of the baton in the middle of a lift or a lowering of the arms. */
const LIFT_BATON = new Vector3(...CONDUCTOR_HOLD.liftBaton).normalize();

/** The direction of the left hand in the ready gesture: up and a little inward. */
const READY_DIRECTION = new Vector3(
  Math.sin(CONDUCTOR_HOLD.readyIn) * Math.cos(CONDUCTOR_HOLD.readyLift),
  Math.sin(CONDUCTOR_HOLD.readyLift),
  -Math.cos(CONDUCTOR_HOLD.readyIn) * Math.cos(CONDUCTOR_HOLD.readyLift),
);

/**
 * Turns a point of the model axes around the vertical through the `spine` bone.
 *
 * @param rig The points of the conductor.
 * @param point The point to turn in place.
 * @param yaw The turn around +y, positive to the left.
 * @returns `point`.
 */
function turnWithTorso(rig: ConductorRig, point: Vector3, yaw: number): Vector3 {
  const [x, , z] = rig.spineBind;
  point.x -= x;
  point.z -= z;
  point.applyAxisAngle(Y_AXIS, yaw);
  point.x += x;
  point.z += z;
  return point;
}

/**
 * Writes the point of the tip of the baton in the model axes (design 5.4): the point of beat 1
 * plus the point in the beat plane. The beat plane turns with the upper body toward a cued
 * section.
 *
 * @param rig The points of the conductor.
 * @param baton The point in the beat plane.
 * @param torsoYaw The turn of the upper body around +y, positive to the left.
 * @param out The vector to write.
 * @returns `out`.
 */
export function batonPoint(
  rig: ConductorRig,
  baton: BatonState,
  torsoYaw: number,
  out: Vector3,
): Vector3 {
  out.fromArray(rig.beatPoint).add(offset.set(baton.x, baton.y, 0));
  return turnWithTorso(rig, out, torsoYaw);
}

/**
 * Writes the wrist and the world rotation of the right hand with the tip of the baton at a point.
 * The baton points from the pivot to the tip, with its top up. The function writes the module
 * vectors `wrist` and `hand`.
 *
 * @param rig The points of the conductor.
 * @param point The point of the tip.
 * @param from The pivot of the baton.
 */
function batonHand(rig: ConductorRig, point: Vector3, from: Vector3): void {
  along.copy(point).sub(from).normalize();
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
 * Writes a direction from a turn around +y and an angle up.
 *
 * @param yaw The turn, positive to the left.
 * @param lift The angle up.
 * @param out The vector to write.
 * @returns `out`, with the unit direction.
 */
function directionOf(yaw: number, lift: number, out: Vector3): Vector3 {
  const level = Math.cos(lift);
  return out.set(-Math.sin(yaw) * level, Math.sin(lift), -Math.cos(yaw) * level);
}

/**
 * Writes the arms and the fingers of the conductor (design 5.4, 4.7). The right hand moves the tip
 * of the baton to its point in the beat plane, and the two-bone IK places the arm. The beat plane
 * turns with the upper body. The left hand points to a cued section, and up in the ready gesture
 * of a count-in. When both show, the cue wins by its weight. In the rest pose, the arms hang.
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
  const { cue } = state;

  poseShoulder(rig.right, chest, rig.chestBind, NO_TURN, right);
  batonPoint(rig, state.baton, cue.torsoYaw, tip);
  tip.y += cue.batonLift;
  batonHand(rig, tip, turnWithTorso(rig, pivot.fromArray(rig.pivot), cue.torsoYaw));
  hangingWrist(rig.right, right, hanging);
  limitReach(rig.right, right.position, wrist);
  mixRotation(right.rotation, hand, weight, hand);
  if (weight > 0 && weight < 1) {
    // The turn is at its full size in the middle of the motion. The tip leaves the width of the
    // desk early, while the hand is still high.
    along.set(0, 0, -1).applyQuaternion(hand);
    liftTurn.setFromUnitVectors(along, LIFT_BATON);
    hand.premultiply(mixRotation(NO_TURN, liftTurn, Math.sin(Math.PI * weight), liftTurn));
  }
  writeArm(
    {
      arm: rig.right,
      shoulder: right,
      wrist: wrist.lerpVectors(hanging, wrist, weight),
      hand,
      pole: hold.poleR,
    },
    chest.rotation,
    rotations,
  );
  writeCurl(rig.right, hold.batonCurl * weight, rotations);

  const ready = state.ready * (1 - cue.hand);
  const lift = Math.max(cue.hand, state.ready) * weight;
  if (lift === 0) {
    return;
  }
  poseShoulder(rig.left, chest, rig.chestBind, NO_TURN, left);
  direction.copy(READY_DIRECTION).multiplyScalar(ready);
  if (cue.hand > 0) {
    direction.addScaledVector(directionOf(cue.handYaw, cue.handLift, toCue), cue.hand);
  }
  direction.normalize();
  const reach = (ready * CUE_MOTION.cueReach + cue.hand * cue.handReach) / (ready + cue.hand);
  wrist.copy(left.position).addScaledVector(direction, reach * rig.left.reach);
  handToward(left, tip.copy(wrist).add(direction), hand);
  hangingWrist(rig.left, left, hanging);
  writeArm(
    {
      arm: rig.left,
      shoulder: left,
      wrist: wrist.lerpVectors(hanging, wrist, lift),
      hand: mixRotation(left.rotation, hand, lift, hand),
      pole: hold.poleL,
    },
    chest.rotation,
    rotations,
  );
  writeCurl(rig.left, hold.cueCurl * lift, rotations);
}
