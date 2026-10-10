import { MathUtils, Quaternion, Vector3 } from 'three';

import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import { placePoint } from '../models/instruments/hold.ts';
import type { PiecePoint } from '../models/instruments/types.ts';
import { IDENTITY, toQuat, toVec3 } from '../models/tuples.ts';
import type { Quat, Vec3 } from '../models/tuples.ts';
import { mixDirection, mixRotation } from './blend.ts';
import type { InstrumentOf } from './family.ts';
import { createFrame, posePoint, setBoneRotation } from './frames.ts';
import type { Frame, TorsoFrames } from './frames.ts';
import { armRig, handToward, poseShoulder, writeArm, writeCurl } from './ik.ts';
import type { ArmRig } from './ik.ts';
import { BRASS_FUNDAMENTALS } from './wind-notes.ts';
import type { Fingering, WindState } from './wind-notes.ts';

/** The woodwinds and the brass of design 4.6. */
export type WindInstrument = InstrumentOf<'woodwind' | 'brass'>;

/**
 * The values of the hold of each wind instrument (design 5.3). The directions are in the model
 * axes of the bind pose: the player faces -z, and its left is -x.
 */
export interface WindHold {
  /**
   * The forward turn of the right shoulder bone around y, so that the right arm reaches a far
   * grip: the low hands of the oboe and the clarinet, and the trombone slide.
   */
  readonly reach: number;
  /** The directions to which the elbows point. */
  readonly poleL: Vec3;
  readonly poleR: Vec3;
  /** The direction to which the left elbow points in the rest pose: out to the side. */
  readonly restPoleL: Vec3;
  /** The direction to which the right elbow points in the rest pose. */
  readonly restPoleR: Vec3;
  /**
   * The rotation of the `instrument` bone while the player plays, relative to the chest. The
   * instrument turns around the mouthpiece, so that the mouthpiece stays at the mouth.
   */
  readonly play: Quat;
  /**
   * The rotation of the `instrument` bone in the rest pose, relative to the chest. The
   * instrument turns down around the mouthpiece. A pose has no move of the instrument bone, so
   * the mouthpiece stays under the mouth, and the head lifts off it.
   */
  readonly rest: Quat;
  /**
   * The move of the `instrument` bone in the rest pose, in head heights, in the axes of the chest.
   * The instrument comes down from the mouth to the lap.
   */
  readonly restShift: Vec3;
  readonly fingering: Fingering;
  /** The fundamental of a brass tube, as a MIDI key. 0 for a woodwind. */
  readonly fundamental: number;
}

/**
 * The elbows of a wind player point out and forward, level with the line of the arm, unless a
 * hold turns them down. The elbows down and out, (0.6, -1, 0.2), put the arms of the woodwinds and
 * the horn up to 0.3 H into the thighs and 0.2 H into the belly while they played (2026-10-07).
 */
const POLE_L: Vec3 = [-1, 0, -1];
const POLE_R: Vec3 = [1, 0, -1];

/** A woodwind hold with no shoulder turn and no turn in the rest pose. */
const WOODWIND = {
  reach: 0,
  poleL: POLE_L,
  poleR: POLE_R,
  restPoleL: POLE_L,
  restPoleR: POLE_R,
  play: IDENTITY,
  rest: IDENTITY,
  restShift: [0, 0, 0],
  fingering: 'holes',
  fundamental: 0,
} as const satisfies WindHold;

/** The rotation that changes nothing. Nothing writes it. */
const NO_TURN = new Quaternion();

const X_AXIS = new Vector3(1, 0, 0);
const Y_AXIS = new Vector3(0, 1, 0);
const Z_AXIS = new Vector3(0, 0, 1);

/**
 * Gives a rotation of the `instrument` bone in the rest pose or the playing pose: a turn around x,
 * then around z, after a first turn.
 *
 * @param x The turn around x, in degrees. A positive turn moves the lower end forward.
 * @param z The turn around z, in degrees. A positive turn moves the lower end to the right.
 * @param first The first turn. None by default.
 * @returns The rotation.
 */
function holdTurn(x: number, z: number, first: Quat = IDENTITY): Quat {
  return toQuat(
    new Quaternion()
      .setFromAxisAngle(X_AXIS, x * MathUtils.DEG2RAD)
      .multiply(new Quaternion().setFromAxisAngle(Z_AXIS, z * MathUtils.DEG2RAD))
      .multiply(new Quaternion(...first)),
  );
}

/**
 * The holds of the winds. In the rest pose, each instrument moves off the mouth, to the side and
 * a little forward, and tilts, so that the arms that hold it stay out of the body (design 5.3).
 */
export const WIND_HOLDS = {
  // While it plays, the flute turns its right end 30° back and 15° down, nearer to level, the left
  // elbow points out, forward, and a little up, and the right elbow points down. The left hand
  // holds the flute in front of the face, to the right of the middle, so the left arm crosses the
  // chest: at 10° down, the left upper arm went 0.03 H into the chest of the tan fox, and level and
  // square to the front 0.067 H. The flute turns its right end down in the rest pose.
  flute: {
    ...WOODWIND,
    play: holdTurn(
      0,
      -15,
      toQuat(new Quaternion().setFromAxisAngle(Y_AXIS, -30 * MathUtils.DEG2RAD)),
    ),
    poleL: [-1, 0.5, -1],
    poleR: [1, -1, -0.5],
    restPoleL: [-1, 0, -0.3],
    restPoleR: [1, -1, -1],
    rest: holdTurn(0, -45),
    restShift: [-0.15, 0, -0.1],
  },
  // The right palm of the oboe was 1.04 of 97% of the reach (review of step 4). The left elbow
  // points down.
  oboe: {
    ...WOODWIND,
    reach: 20 * MathUtils.DEG2RAD,
    poleL: [-1, -1, -1],
    restPoleL: [-1, -1, -1],
    restPoleR: [0.5, -1, -0.5],
    rest: holdTurn(9, 27),
    restShift: [-0.13, 0, -0.02],
  },
  // The long snout of the wolf puts the clarinet far forward, so the right arm needs the turn
  // of the oboe. The left elbow points down, as in animals.webp.
  clarinet: {
    ...WOODWIND,
    reach: 20 * MathUtils.DEG2RAD,
    poleL: [-1, -1, -1],
    restPoleL: [-1, -1, -1],
    restPoleR: [1, -1, -1],
    rest: holdTurn(-10, 30),
    restShift: [-0.17, 0.05, -0.02],
  },
  // While it plays, the bassoon turns its lower end 20° forward and 20° to the right, and the
  // right elbow points down. With no turn, the right forearm went 0.21 H into the right thigh.
  bassoon: {
    ...WOODWIND,
    play: holdTurn(20, 20),
    poleR: [0.5, -1, -0.5],
    restPoleL: [-1, 0, 0],
    restPoleR: [0.5, -1, -0.5],
    rest: holdTurn(-16, -1, holdTurn(30, 26)),
    restShift: [-0.17, -0.04, -0.02],
  },
  // In the rest pose, the horn comes up out of the right thigh, so that the bell sits on it. The
  // right elbow points down, also while the horn plays.
  horn: {
    ...WOODWIND,
    poleR: [0.5, -1, -0.5],
    restPoleL: [-0.5, -1, -0.5],
    restPoleR: [0.5, -1, 0],
    rest: holdTurn(23, -7),
    restShift: [-0.16, 0.29, -0.1],
    fingering: 'valves-left',
    fundamental: BRASS_FUNDAMENTALS.horn,
  },
  trumpet: {
    ...WOODWIND,
    poleL: [-0.5, -1, -1],
    poleR: [1, -1, -1],
    restPoleL: [-1, -1, -1],
    restPoleR: [1, -1, -1],
    rest: holdTurn(-3, -20, holdTurn(-50, 0)),
    restShift: [0.19, 0.03, -0.03],
    fingering: 'valves-right',
    fundamental: BRASS_FUNDAMENTALS.trumpet,
  },
  // The slide needs the right arm far forward. Even so, the arm reaches only the first part of
  // the slide travel (design 5.3). The elbows point down, near the torso.
  trombone: {
    ...WOODWIND,
    reach: 45 * MathUtils.DEG2RAD,
    poleL: [-0.5, -1, -1],
    poleR: [0.5, -1, -0.5],
    restPoleL: [-0.5, -1, 0],
    restPoleR: [1, -1, -1],
    rest: holdTurn(-14, -2, holdTurn(-45, 0)),
    restShift: [-0.14, 0.05, -0.28],
    fingering: 'slide',
    fundamental: BRASS_FUNDAMENTALS.trombone,
  },
  tuba: {
    ...WOODWIND,
    poleL: [-1, -1, -1],
    poleR: [1, -1, -1],
    restPoleL: [-1, 0, -0.3],
    restPoleR: [1, -1, -1],
    rest: holdTurn(1, -13, holdTurn(-10, 30)),
    restShift: [-0.01, 0.02, -0.03],
    fingering: 'valves-right',
    fundamental: BRASS_FUNDAMENTALS.tuba,
  },
} as const satisfies Readonly<Record<WindInstrument, WindHold>>;

/** The sizes of the body and the hand motion of the winds, in radians (design 5.3). */
export const WIND_BODY = {
  /** The spine leans back by this angle at the top of a breath in, at an amplitude of 1. */
  breath: 3 * MathUtils.DEG2RAD,
  /** The head lifts by this angle off the mouthpiece in the rest pose. */
  headLift: 12 * MathUtils.DEG2RAD,
  /** The curl of open fingers, and the extra curl of closed fingers. */
  curlOpen: 15 * MathUtils.DEG2RAD,
  curlClosed: 50 * MathUtils.DEG2RAD,
  /** The curl of a hand that only holds the instrument. */
  curlHold: 35 * MathUtils.DEG2RAD,
} as const;

const BONES = {
  chest: boneIndex('chest'),
  instrument: boneIndex('instrument'),
} as const;

/** One side of the body of a wind player in the bind pose. */
interface WindSide {
  readonly arm: ArmRig;
  /** The grip of the palm on the instrument, in the bind pose. */
  readonly grip: Vec3;
  /** Whether the grip is on the trombone slide. */
  readonly onSlide: boolean;
}

/**
 * The points of a wind player in the bind pose, in the model axes, that the pose needs at each
 * frame.
 */
export interface WindRig {
  readonly hold: WindHold;
  /** The bind position of the `instrument` bone: the mouthpiece at the mouth. */
  readonly pivot: Vec3;
  /** The move of the `instrument` bone in the rest pose, in meters, in the axes of the chest. */
  readonly restOffset: Vec3;
  readonly chestBind: Vec3;
  readonly left: WindSide;
  readonly right: WindSide;
  /** The unit direction of the trombone slide from the first position, or (0, 0, 0). */
  readonly slideAxis: Vec3;
  /**
   * The part of the slide travel that the right arm reaches, in meters. The seventh position is
   * out of reach of any probable arm, so the slide positions map into this travel (design 5.3).
   */
  readonly slideReach: number;
}

/**
 * Finds the bind point of a grip of a palm.
 *
 * @param model The player model.
 * @param grip The grip.
 * @returns The point.
 * @throws Error if the instrument has no grip of the palm.
 */
function gripPoint(model: PlayerModel, grip: PiecePoint | null): Vec3 {
  if (!grip) {
    throw new Error(`The ${model.instrument.id} has no grip of a palm.`);
  }
  return placePoint(model.pieces, grip);
}

/**
 * Gives the forward turn of the right shoulder bone of a hold. The left shoulder does not turn.
 *
 * @param hold The hold.
 * @param out The quaternion to write.
 * @returns `out`, with the local rotation of `shoulderR`.
 */
function rightShoulderTurn(hold: WindHold, out: Quaternion): Quaternion {
  // A positive turn around y moves the right shoulder forward.
  return out.setFromAxisAngle(Y_AXIS, hold.reach);
}

/**
 * Finds the length of the slide travel that the right arm reaches in the playing pose, in steps
 * of 5 mm.
 *
 * @param rig The points of the player.
 * @param travel The full travel of the slide, in meters.
 * @returns The reached travel, in meters.
 */
function slideReachOf(rig: Omit<WindRig, 'slideReach'>, travel: number): number {
  if (!rig.right.onSlide || travel <= 0) {
    return 0;
  }
  const chest = { rotation: new Quaternion(), position: new Vector3(...rig.chestBind) };
  const arm = rig.right.arm;
  const turn = rightShoulderTurn(rig.hold, new Quaternion());
  const joint = poseShoulder(arm, chest, rig.chestBind, turn).position;
  const reach = arm.reach + new Vector3(...arm.palm).length();
  const grip = new Vector3();
  const axis = new Vector3(...rig.slideAxis);
  let reached = 0;
  for (let s = 0; s <= travel + 1e-9; s += 0.005) {
    if (grip.fromArray(rig.right.grip).addScaledVector(axis, s).distanceTo(joint) > reach) {
      break;
    }
    reached = s;
  }
  return reached;
}

/**
 * Finds the points of a wind player that the pose needs.
 *
 * @param model A player with a woodwind or a brass instrument.
 * @param instrument The instrument of the model.
 * @returns The rig.
 * @throws Error if the instrument has no grip of a palm, or if it does not hang on the chest.
 */
export function windRig(model: PlayerModel, instrument: WindInstrument): WindRig {
  const { positions, parents } = model.skeleton;
  if (parents[BONES.instrument] !== BONES.chest) {
    throw new Error(`The ${instrument} does not hang on the chest.`);
  }
  const at = (bone: number): Vec3 => positions[bone] ?? [0, 0, 0];
  const side = (s: 'L' | 'R'): WindSide => {
    const grip = s === 'L' ? model.instrument.grips.palmL : model.instrument.grips.palmR;
    return {
      arm: armRig(model, s),
      grip: gripPoint(model, grip),
      onSlide: grip?.bone === 'slide',
    };
  };
  const slide = model.instrument.targets.find((t) => t.kind === 'slide');
  const slideAt = (point: Vec3): Vector3 =>
    new Vector3(...placePoint(model.pieces, { bone: 'slide', at: point }));
  const travelVector = slide ? slideAt(slide.to).sub(slideAt(slide.from)) : new Vector3();
  const hold = WIND_HOLDS[instrument];
  const rig = {
    hold,
    pivot: at(BONES.instrument),
    restOffset: toVec3(new Vector3(...hold.restShift).multiplyScalar(model.body.headHeight)),
    chestBind: at(BONES.chest),
    left: side('L'),
    right: side('R'),
    slideAxis: toVec3(travelVector.clone().normalize()),
  };
  return { ...rig, slideReach: slideReachOf(rig, travelVector.length()) };
}

/** The pose of a wind player that is not in the rotations of its bones. */
export interface WindPoseOut {
  /** The rotations of the pose to write. */
  readonly rotations: Float32Array;
  /** The move of the `slide` bone, in the axes of the `instrument` bone. */
  slideOffset: [number, number, number];
  /** The move of the `instrument` bone, in the axes of the chest. */
  instrumentOffset: [number, number, number];
}

/**
 * Gives the curl of the fingers of one hand.
 *
 * @param closed The close of the fingers, from 0 to 1, or -1 for a hand that only holds.
 * @param weight The weight of the playing pose.
 * @returns The curl angle.
 */
function curlOf(closed: number, weight: number): number {
  const b = WIND_BODY;
  const playing = closed < 0 ? b.curlHold : b.curlOpen + (b.curlClosed - b.curlOpen) * closed;
  return b.curlHold + (playing - b.curlHold) * weight;
}

const local = new Quaternion();
const playTurn = new Quaternion();
const rotation = new Quaternion();
const pivot = new Vector3();
const shift = new Vector3();
const turned = new Vector3();
const pivotBind = new Vector3();
const slide = new Vector3();
const rightTurn = new Quaternion();
const shoulder = createFrame();
const grip = new Vector3();
const hand = new Quaternion();
const palm = new Vector3();

/**
 * Writes one arm and its fingers on the grip of the instrument.
 *
 * @param rig The points of the player.
 * @param side The side of the body.
 * @param chest The posed frame of the chest.
 * @param turn The local rotation of the `shoulder` bone.
 * @param pole The direction to which the elbow points.
 * @param curl The curl of the fingers.
 * @param rotations The rotations of the pose to write.
 */
function poseSide(
  rig: WindRig,
  side: WindSide,
  chest: Frame,
  turn: Quaternion,
  pole: Vec3,
  curl: number,
  rotations: Float32Array,
): void {
  grip.fromArray(side.grip);
  if (side.onSlide) {
    grip.add(slide);
  }
  grip.sub(pivotBind.fromArray(rig.pivot)).applyQuaternion(rotation).add(pivot);
  poseShoulder(side.arm, chest, rig.chestBind, turn, shoulder);
  handToward(shoulder, grip, hand);
  writeArm(
    {
      arm: side.arm,
      shoulder,
      wrist: grip.sub(palm.fromArray(side.arm.palm).applyQuaternion(hand)),
      hand,
      pole,
    },
    chest.rotation,
    rotations,
  );
  setBoneRotation(rotations, side.arm.bones.shoulder, turn);
  writeCurl(side.arm, curl, rotations);
}

const poleMix = new Vector3();
const polePlay = new Vector3();
const poleTuple: [number, number, number] = [0, 0, 0];

/**
 * Mixes the direction of an elbow in the rest pose with its direction while the player plays.
 *
 * @param rest The direction in the rest pose.
 * @param play The direction while the player plays.
 * @param weight The weight of the playing pose.
 * @returns The mixed unit direction, in a module tuple that the next call writes again.
 */
function mixPole(rest: Vec3, play: Vec3, weight: number): Vec3 {
  mixDirection(poleMix.fromArray(rest), polePlay.fromArray(play), weight, poleMix);
  return poleMix.toArray(poleTuple);
}

/**
 * Writes the arms, the fingers, the instrument, and the slide of a wind player (design 5.3,
 * 4.7). The mouthpiece stays at the mouth, because the head and the instrument both follow the
 * chest. The palms stay on their grips, also in the rest pose, and the two-bone IK places each
 * arm. The fingers close for the pitch. The trombone slide moves along its axis.
 *
 * The caller writes the breath into the spine, and the head lift of the rest pose into the neck
 * and the head, before it calculates the frames.
 *
 * @param rig The points of the player.
 * @param frames The posed frames of the root and of the chest.
 * @param state The fingers, the slide, and the breath at the song time of the note layer.
 * @param weight The eased weight of the playing pose: 0 is the rest pose (5.2, 5.5).
 * @param out The pose to write.
 */
export function poseWind(
  rig: WindRig,
  frames: TorsoFrames,
  state: WindState,
  weight: number,
  out: WindPoseOut,
): void {
  const chest = frames.chest;
  mixRotation(local.fromArray(rig.hold.rest), playTurn.fromArray(rig.hold.play), weight, local);
  rotation.multiplyQuaternions(chest.rotation, local);
  // In the rest pose, the instrument comes down from the mouth to the lap.
  shift.fromArray(rig.restOffset).multiplyScalar(1 - weight);
  posePoint(chest, rig.chestBind, rig.pivot, pivot).add(
    turned.copy(shift).applyQuaternion(chest.rotation),
  );
  slide.fromArray(rig.slideAxis).multiplyScalar(state.slide * rig.slideReach * weight);
  const { hold } = rig;
  const left = curlOf(state.fingersL, weight);
  const poleL = mixPole(hold.restPoleL, hold.poleL, weight);
  poseSide(rig, rig.left, chest, NO_TURN, poleL, left, out.rotations);
  const right = curlOf(state.fingersR, weight);
  rightShoulderTurn(hold, rightTurn);
  const poleR = mixPole(hold.restPoleR, hold.poleR, weight);
  poseSide(rig, rig.right, chest, rightTurn, poleR, right, out.rotations);
  setBoneRotation(out.rotations, BONES.instrument, local);
  slide.toArray(out.slideOffset);
  shift.toArray(out.instrumentOffset);
}
