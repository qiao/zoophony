import { MathUtils } from 'three';
import { add, axisAngle, length, multiply, normalize, rotate, scale, sub } from '../models/math.ts';
import { IDENTITY } from '../models/tuples.ts';
import type { Quat, Vec3 } from '../models/tuples.ts';
import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import { placePoint } from '../models/instruments/hold.ts';
import type { PiecePoint } from '../models/instruments/types.ts';
import { mixRotation } from './blend.ts';
import type { TorsoFrames } from './bowed.ts';
import type { InstrumentOf } from './family.ts';
import { posePoint, setBoneRotation } from './frames.ts';
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
  /**
   * The rotation of the `instrument` bone in the rest pose, relative to the chest. The
   * instrument turns down around the mouthpiece. A pose has no move of the instrument bone, so
   * the mouthpiece stays under the mouth, and the head lifts off it.
   */
  readonly rest: Quat;
  readonly fingering: Fingering;
  /** The fundamental of a brass tube, as a MIDI key. 0 for a woodwind. */
  readonly fundamental: number;
}

/** The elbows of a wind player point down and out. */
const POLE_L: Vec3 = [-0.6, -1, 0.2];
const POLE_R: Vec3 = [0.6, -1, 0.2];

/** A woodwind hold with no shoulder turn and no turn in the rest pose. */
const WOODWIND = {
  reach: 0,
  poleL: POLE_L,
  poleR: POLE_R,
  rest: IDENTITY,
  fingering: 'holes',
  fundamental: 0,
} as const satisfies WindHold;

/** The holds of the winds. */
export const WIND_HOLDS = {
  // The flute turns its right end down in the rest pose.
  flute: { ...WOODWIND, rest: axisAngle([0, 0, 1], -45 * MathUtils.DEG2RAD) },
  // The right palm of the oboe was 1.04 of 97% of the reach (review of step 4).
  oboe: { ...WOODWIND, reach: 20 * MathUtils.DEG2RAD },
  // The long snout of the wolf puts the clarinet far forward, so the right arm needs the turn
  // of the oboe.
  clarinet: { ...WOODWIND, reach: 20 * MathUtils.DEG2RAD },
  bassoon: WOODWIND,
  // The horn and the tuba stay in the lap in the rest pose.
  horn: {
    ...WOODWIND,
    fingering: 'valves-left',
    fundamental: BRASS_FUNDAMENTALS.horn,
  },
  trumpet: {
    ...WOODWIND,
    rest: axisAngle([1, 0, 0], -50 * MathUtils.DEG2RAD),
    fingering: 'valves-right',
    fundamental: BRASS_FUNDAMENTALS.trumpet,
  },
  // The slide needs the right arm far forward. Even so, the arm reaches only the first part of
  // the slide travel (design 5.3).
  trombone: {
    ...WOODWIND,
    reach: 45 * MathUtils.DEG2RAD,
    rest: axisAngle([1, 0, 0], -45 * MathUtils.DEG2RAD),
    fingering: 'slide',
    fundamental: BRASS_FUNDAMENTALS.trombone,
  },
  tuba: { ...WOODWIND, fingering: 'valves-right', fundamental: BRASS_FUNDAMENTALS.tuba },
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
 * Gives the forward turns of the two shoulder bones of a hold.
 *
 * @param hold The hold.
 * @returns The local rotations of `shoulderL` and `shoulderR`.
 */
function shoulderTurns(hold: WindHold): readonly [left: Quat, right: Quat] {
  // A positive turn around y moves the right shoulder forward.
  return [IDENTITY, axisAngle([0, 1, 0], hold.reach)];
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
  const chest = { rotation: IDENTITY, position: rig.chestBind };
  const arm = rig.right.arm;
  const joint = poseShoulder(arm, chest, rig.chestBind, shoulderTurns(rig.hold)[1]).position;
  const reach = arm.reach + length(arm.palm);
  let reached = 0;
  for (let s = 0; s <= travel + 1e-9; s += 0.005) {
    if (length(sub(add(rig.right.grip, scale(rig.slideAxis, s)), joint)) > reach) {
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
  const slideFrom = slide ? placePoint(model.pieces, { bone: 'slide', at: slide.from }) : null;
  const slideTo = slide ? placePoint(model.pieces, { bone: 'slide', at: slide.to }) : null;
  const travel = slideFrom && slideTo ? length(sub(slideTo, slideFrom)) : 0;
  const noSlide: Vec3 = [0, 0, 0];
  const rig = {
    hold: WIND_HOLDS[instrument],
    pivot: at(BONES.instrument),
    chestBind: at(BONES.chest),
    left: side('L'),
    right: side('R'),
    slideAxis: slideFrom && slideTo ? normalize(sub(slideTo, slideFrom)) : noSlide,
  };
  return { ...rig, slideReach: slideReachOf(rig, travel) };
}

/** The pose of a wind player that is not in the rotations of its bones. */
export interface WindPoseOut {
  /** The rotations of the pose to write. */
  readonly rotations: Float32Array;
  /** The move of the `slide` bone, in the axes of the `instrument` bone. */
  slideOffset: [number, number, number];
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
  const local = mixRotation(rig.hold.rest, IDENTITY, weight);
  const rotation = multiply(chest.rotation, local);
  const pivot = posePoint(chest, rig.chestBind, rig.pivot);
  const slide = scale(rig.slideAxis, state.slide * rig.slideReach * weight);
  const turns = shoulderTurns(rig.hold);
  const sides = [
    [rig.left, turns[0], rig.hold.poleL, state.fingersL],
    [rig.right, turns[1], rig.hold.poleR, state.fingersR],
  ] as const;
  for (const [side, turn, pole, closed] of sides) {
    const bind = side.onSlide ? add(side.grip, slide) : side.grip;
    const grip = add(pivot, rotate(rotation, sub(bind, rig.pivot)));
    const shoulder = poseShoulder(side.arm, chest, rig.chestBind, turn);
    const hand = handToward(shoulder, grip);
    writeArm(
      { arm: side.arm, shoulder, wrist: sub(grip, rotate(hand, side.arm.palm)), hand, pole },
      chest.rotation,
      out.rotations,
    );
    setBoneRotation(out.rotations, side.arm.bones.shoulder, turn);
    writeCurl(side.arm, curlOf(closed, weight), out.rotations);
  }
  setBoneRotation(out.rotations, BONES.instrument, local);
  out.slideOffset[0] = slide[0];
  out.slideOffset[1] = slide[1];
  out.slideOffset[2] = slide[2];
}
