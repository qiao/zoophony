import { MathUtils, Quaternion, Vector3 } from 'three';

import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import type { SpeciesId } from '../models/species.ts';
import { placePoint } from '../models/instruments/hold.ts';
import type { PlayTarget, PlayTargetKind } from '../models/instruments/types.ts';
import { IDENTITY, toQuat, toVec3 } from '../models/tuples.ts';
import type { Quat, Vec3 } from '../models/tuples.ts';
import {
  BOWED_HANDS,
  HAIR_END,
  bowAt,
  createBowPlaces,
  gripHand,
  instrumentAt,
  rollToward,
  shoulderTurn,
  stopHandAt,
  stringsAt,
} from './bowed.ts';
import { hangingArm } from './hang.ts';
import type { InstrumentOf } from './family.ts';
import { setFromBasis } from './frames.ts';
import type { TorsoFrames } from './frames.ts';
import { armRig, poseShoulder, solveArm } from './ik.ts';
import { lapPoint } from './lap.ts';
import type { LapPlace } from './lap.ts';
import type { ArmRig } from './ik.ts';
import type { BowRange } from './strokes.ts';

/** The bowed strings of design 4.6. */
export type BowedInstrument = InstrumentOf<'bowed'>;

/**
 * The values of the hold of each bowed string (design 4.6, 4.7). The directions are in the model
 * axes of the bind pose: the player faces -z, and its left is -x.
 */
export interface BowedHold {
  /** The bow tip points to this side of the strings, across them. */
  readonly tip: Vec3;
  /** The left fingers tilt over the neck to this side of the strings. */
  readonly fingers: Vec3;
  /** The direction to which the left elbow points while the player plays. */
  readonly poleL: Vec3;
  /** The direction to which the right elbow points while the bow plays at the frog. */
  readonly poleR: Vec3;
  /**
   * The direction to which the right elbow points while the bow plays at the tip. The direction
   * turns from {@link BowedHold.poleR} with the place of the contact point on the bow range.
   */
  readonly poleTipR: Vec3;
  /** The direction to which the right elbow points in pizzicato. */
  readonly polePizzicato: Vec3;
  /**
   * The share of the turn of the right elbow to the back of the hand in the middle of a change
   * between the bow and pizzicato. The share is 0 at the start and at the end of the change.
   */
  readonly followChange: number;
  /**
   * The move of the instrument while the player plays, in head heights, in the axes of the parent
   * of the `instrument` bone. It makes room for the arms between the instrument and the body.
   */
  readonly playShift: Vec3;
  /**
   * The turn of the instrument around its bone while the player plays, in the axes of the parent
   * of the `instrument` bone. The holds of the stage keep the turn of the bind pose. The views
   * page turns the violin to the shoulder of its model sheets (design 7.1).
   */
  readonly playTurn: Quat;

  /** The direction to which the right elbow points in the rest pose, in the axes of the root. */
  readonly restPoleR: Vec3;
  /** The direction to which the left elbow points in the rest pose, in the axes of the chest. */
  readonly restPoleL: Vec3;
  /** The bow tip points to this side in pizzicato, as the plucking hand holds it. */
  readonly pizzicatoTip: Vec3;
  /**
   * The turn of the bow around the strings from one string to the next. A positive turn moves
   * the bow to the low strings on the bass side: `top × axis`, the left of the strings for a
   * viewer at the bridge who looks to the scroll with the top plate up.
   */
  readonly stringTurn: number;
  /**
   * The turn of the bow in the plane of the strings, from square across them. The frog comes
   * nearer to the right shoulder, so that the short arms of the animals reach the strings.
   */
  readonly slant: number;
  /** The forward turn of the right shoulder bone around y, so that the arm reaches further. */
  readonly reach: number;
  /** The forward lean of the spine. It brings the shoulders nearer to a floor instrument. */
  readonly lean: number;
  /**
   * The place of the left fingers on the target `fingerboard` in the rest pose: 0 at the nut, 1
   * at the end of the fingerboard.
   */
  readonly restPlace: number;
  /**
   * The place of the pluck: 0 at the end of the fingerboard, 1 at the bow contact point. The
   * right palm is above it.
   */
  readonly pluckPlace: number;
  /**
   * The rest pose of the instrument: its axis, the side of its top plate, and the place of its
   * bone (the tail end) on the left thigh. `null` keeps the instrument in its playing place, as
   * the cello and the contrabass stand on the floor.
   */
  readonly rest: {
    /** The direction from the tail end to the scroll. */
    readonly axis: Vec3;
    /** The side of the top plate. */
    readonly top: Vec3;
    /** The place of the tail end on the left thigh. */
    readonly lap: LapPlace;
  } | null;
  /** The bow in the rest pose. */
  readonly restBow: {
    /** The place of the grip on the right thigh. */
    readonly lap: LapPlace;
    /** The direction from the frog to the tip. */
    readonly tip: Vec3;
    /** The side of the hair, from the stick. */
    readonly hair: Vec3;
  };
}

/**
 * The violin and the viola share their hold under the chin. While the player plays, the right
 * elbow points out, forward, and down at the frog, and out and up at the tip. The left elbow
 * points down and forward, under the instrument and near the chest, as in the reference images.
 * Out and down, it stood 45° out from the side. Straight down, the folded arm dropped the elbow
 * into the haunch. The instrument
 * moves 0.15 H forward and 0.05 H down, so that the frog of the bow on the lowest string keeps
 * the hand off the chin and the long muzzle of the fox, and the right shoulder turns 30°, so that
 * the bow arm still reaches the tip. With the elbows of 2026-10-06, the bow arm went up to 0.48 H
 * into the torso while the players played (2026-10-07). With a move of 0.08 H to the left and the
 * elbow forward and down at the frog, the bow arm went 0.065 H into the chest at the frog on the
 * highest string.
 *
 * In the rest pose, the instrument stands at 0.85 of the way to the knee, and the bow grip is
 * 0.18 H out from the knee and 0.08 H above it. The left elbow points down and a little back, so
 * that the upper arm hangs at the side. The right elbow points out and a little forward, so that
 * the forearm passes over the front of the thigh: nearer to the side, the arm went into the
 * haunch and the thigh. The bow tip points 0.3 to the front, away from the scroll.
 */
const CHIN_HOLD = {
  tip: [0, 1, 0],
  fingers: [0, 1, 0],
  poleL: [-0.5, -1, -1],
  poleR: [1, -1, -1],
  poleTipR: [0.5, 1, -1],
  polePizzicato: [1, -0.5, -1],
  followChange: 0,
  playShift: [0, -0.05, -0.15],
  playTurn: IDENTITY,
  restPoleR: [1, -0.9, -0.5],
  restPoleL: [0, -1, 0.5],
  pizzicatoTip: [0.3, 1, 0.4],
  stringTurn: 9 * MathUtils.DEG2RAD,
  slant: -20 * MathUtils.DEG2RAD,
  reach: 30 * MathUtils.DEG2RAD,
  lean: 0,
  restPlace: 0.4,
  pluckPlace: 0.9,
  rest: {
    axis: [-0.17, 0.95, -0.26],
    top: [0, 0, -1],
    lap: { along: 0.85, offset: [0, 0.06, 0] },
  },
  restBow: {
    lap: { along: 1, offset: [0.18, 0.08, 0] },
    tip: [-1, 0, -0.3],
    hair: [0, -1, 0.2],
  },
} as const satisfies BowedHold;

/**
 * The cello and the contrabass share their hold on the floor. While the player plays, the right
 * elbow points out and up, the bow tip points up and to the left in pizzicato, and the elbow turns
 * 0.3 of the way to the back of the hand in the middle of a change. The left elbow points down,
 * so that the arm hugs the instrument. Level and out, the left upper arm of the dog stood 70° out
 * from the side. In the rest pose, the left elbow points down and a little in. The instrument moves a little
 * forward and to the right, so that the bow hand at the tip of a down-bow on the lowest string
 * stays off the right thigh. With the elbow back, (0.5, 0, 1), and the bow tip up and to the
 * right in pizzicato, the bow arm went up to 0.44 H into the torso (2026-10-07).
 */
const FLOOR_HOLD = {
  tip: [-1, 0, 0],
  fingers: [1, 0, 0],
  poleL: [-0.6, -1, -0.2],
  poleR: [1, 1.4, -0.3],
  poleTipR: [1, 1.4, -0.3],
  polePizzicato: [1, 0, 0],
  followChange: 0.3,
  playShift: [0, 0, -0.05],
  playTurn: IDENTITY,
  restPoleR: [1, -0.6, -0.5],
  restPoleL: [0.3, -1, 0],
  pizzicatoTip: [-1, 1, 0],
  stringTurn: 9 * MathUtils.DEG2RAD,
  slant: -20 * MathUtils.DEG2RAD,
  reach: 30 * MathUtils.DEG2RAD,
  lean: 10 * MathUtils.DEG2RAD,
  restPlace: 0.4,
  pluckPlace: 0.3,
  rest: null,
  restBow: {
    lap: { along: 1, offset: [0.2, 0.08, 0] },
    tip: [-0.1, -0.1, -1],
    hair: [0, -1, 0.3],
  },
} as const satisfies BowedHold;

/**
 * Makes the play turn of a violin on the shoulder: first a turn around the vertical axis, then a
 * tilt of the scroll. The violin of the chin hold points 70° to the left of the front.
 *
 * @param yawDeg The turn around the vertical axis, in degrees. A negative turn moves the scroll
 *   from the left toward the front.
 * @param tiltDeg The tilt of the scroll up, in degrees, after the turn. A negative tilt lowers it.
 * @returns The turn, in the axes of the chest.
 */
export function violinTurn(yawDeg: number, tiltDeg: number): Quat {
  const yaw = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yawDeg * MathUtils.DEG2RAD);
  // The axis of the violin after the turn, and the level axis across it.
  const axis = new Vector3(-1, 0, 0)
    .applyAxisAngle(new Vector3(0, 1, 0), (yawDeg - 20) * MathUtils.DEG2RAD)
    .normalize();
  const across = new Vector3().crossVectors(axis, new Vector3(0, 1, 0)).normalize();
  const tilt = new Quaternion().setFromAxisAngle(across, tiltDeg * MathUtils.DEG2RAD);
  return toQuat(tilt.multiply(yaw));
}

/**
 * The hold of the violin on the left shoulder of `rabbit-views.png`: the chin hold, with the
 * violin 0.25 H to the left and 0.1 H up, turned 25° from the left toward the front, and the
 * scroll 8° down. The right elbow keeps the direction of the frog, forward and down, so that it
 * hangs at the side. The spine leans 10° forward over the violin, as the rabbit of the sheet. The
 * bow lies nearly square across the strings (5° of slant): the longer arms of the rabbit reach
 * them, and with the slant of the chin hold the bow went 0.13 m into the right paw near the end of
 * a long stroke. The bow rests across the lap, with its tip to the left: with the tip of the chin
 * hold, the bow paw snapped 17° in 1 ms in the lift of the default demo. The grip rests a little
 * behind the knee, because the long thighs of the rabbit put the knee out of easy reach: with the
 * grip on the knee, the forearm turned 1,787° a second in the lift.
 */
const SHOULDER_HOLD = {
  ...CHIN_HOLD,
  playShift: [-0.25, 0.1, 0],
  playTurn: violinTurn(-25, -8),
  poleTipR: CHIN_HOLD.poleR,
  lean: 10 * MathUtils.DEG2RAD,
  slant: -5 * MathUtils.DEG2RAD,
  restBow: { ...CHIN_HOLD.restBow, lap: { along: 0.85, offset: [0.18, 0.08, 0] }, tip: [-1, 0, 0] },
} as const satisfies BowedHold;

/** The holds of the bowed strings. */
export const BOWED_HOLDS = {
  violin: CHIN_HOLD,
  // The left arm reaches the nut of the viola only with a smaller forward move.
  viola: { ...CHIN_HOLD, reach: 30 * MathUtils.DEG2RAD, playShift: [0, -0.05, -0.04] },
  cello: { ...FLOOR_HOLD, reach: 40 * MathUtils.DEG2RAD },
  // The contrabass keeps its place: a move forward put the nut out of reach of the left hand of
  // the hippo, and a move to the right put the neck 0.028 m from its head.
  contrabass: {
    ...FLOOR_HOLD,
    stringTurn: 7 * MathUtils.DEG2RAD,
    lean: 5 * MathUtils.DEG2RAD,
    poleR: [0.5, 1, 0.5],
    poleTipR: [0.5, 1, 0.5],
    playShift: [0, 0, 0],
  },
} as const satisfies Readonly<Record<BowedInstrument, BowedHold>>;

/**
 * The holds of the species that hold a bowed string in their own way, in place of
 * {@link BOWED_HOLDS}: the rabbits hold the violin on the left shoulder, as in `rabbit-views.png`.
 */
const SPECIES_HOLDS: Partial<Record<SpeciesId, Partial<Record<BowedInstrument, BowedHold>>>> = {
  rabbit: { violin: SHOULDER_HOLD },
};

/**
 * Gives the hold of a bowed string for a species: its own hold, or the hold of
 * {@link BOWED_HOLDS}.
 *
 * @param species The species of the player.
 * @param instrument The instrument.
 * @returns The hold.
 */
export function holdOf(species: SpeciesId, instrument: BowedInstrument): BowedHold {
  return SPECIES_HOLDS[species]?.[instrument] ?? BOWED_HOLDS[instrument];
}

/**
 * The rest pose of the violin and the viola of a soloist who stands (design 5.2): the instrument
 * hangs from the left hand at the left side, with the scroll up and the top plate out. The bow
 * hangs from the right hand.
 */
const STANDING_REST = { axis: [0, 1, -0.15], top: [-1, 0, 0] } as const satisfies {
  readonly axis: Vec3;
  readonly top: Vec3;
};

/** The step of the search for the reached part of the bow hair, in meters. */
const BOW_STEP = 0.005;

const BONES = {
  spine: boneIndex('spine'),
  chest: boneIndex('chest'),
  instrument: boneIndex('instrument'),
  handL: boneIndex('handL'),
  fingersL: boneIndex('fingersL'),
  handR: boneIndex('handR'),
  bow: boneIndex('bow'),
} as const;

/**
 * The points of a bowed string player in the bind pose, in the model axes, that the pose needs
 * at each frame.
 */
export interface BowedRig {
  readonly hold: BowedHold;
  /** The bind position of the `instrument` bone, and the index and bind position of its parent. */
  readonly pivot: Vec3;
  readonly parent: number;
  readonly parentBind: Vec3;
  /** The bind positions of the `spine` and the `chest` bones. */
  readonly spineBind: Vec3;
  readonly chestBind: Vec3;
  /** The point on the strings where the bow plays. */
  readonly contact: Vec3;
  /** The unit direction from the tail end to the scroll. */
  readonly axis: Vec3;
  /** The unit normal of the top plate, to the strings. */
  readonly top: Vec3;
  /** The unit direction across the strings to the side of the bow tip. */
  readonly across: Vec3;
  /** The unit direction across the strings to which the left fingers tilt. */
  readonly fingers: Vec3;
  /** The start of the target `fingerboard`: the nut, on the strings. */
  readonly nut: Vec3;
  /** The vector of the target `fingerboard`, from the nut to the end of the fingerboard. */
  readonly neck: Vec3;
  /** The `fingersL` bone, from the `handL` bone. */
  readonly knuckles: Vec3;
  /** The middle of the left finger block, from the `fingersL` bone. */
  readonly fingerBlock: Vec3;
  /** The point on the strings above which the right hand plucks. */
  readonly pluck: Vec3;
  /** The start of the bow hair at the frog, from the `bow` bone at the grip. */
  readonly hairStart: Vec3;
  /** The `bow` bone at the grip, from the `handR` bone. */
  readonly grip: Vec3;
  /** The unit direction of the stick from the frog to the tip, in the bind pose. */
  readonly stick: Vec3;
  /** The length of the right forearm, from the elbow to the wrist. */
  readonly forearm: number;
  readonly hairLength: number;
  /** The rotation that turns the bow axes (along the hair, to the strings) to the bind pose. */
  readonly bowAlign: Quat;
  readonly armL: ArmRig;
  readonly armR: ArmRig;
  /** The rotation of the `instrument` bone in the rest pose, relative to its parent. */
  readonly restRotation: Quat;
  /** The move of the instrument while the player plays, in meters (`BowedHold.playShift`). */
  readonly playShift: Vec3;
  /** The place of the `instrument` bone in the rest pose, in the model axes. */
  readonly restPivot: Vec3;
  /** The direction to which the right elbow points in the rest pose, in the axes of the root. */
  readonly restPoleR: Vec3;
  /** The direction to which the left elbow points in the rest pose, in the axes of the chest. */
  readonly restPoleL: Vec3;
  /** The bow in the rest pose: the place of the `bow` bone and its rotation, in the model axes. */
  readonly restBow: {
    /** The place of the `bow` bone: the grip on the stick. */
    readonly grip: Vec3;
    /** The rotation of the `bow` bone from the bind pose. */
    readonly rotation: Quat;
  };
  /** The part of the bow hair that the bow arm reaches on all strings (design 5.3). */
  readonly bowRange: BowRange;
  /**
   * The part of the target `fingerboard` that the left arm reaches, from 0 at the nut to 1 at the
   * end (design 5.3). The places of the notes map into it.
   */
  readonly stopRange: readonly [low: number, high: number];
}

/** The points of a rig before its ranges. */
export type RigPoints = Omit<BowedRig, 'bowRange' | 'stopRange'>;

/**
 * Finds a target of an instrument.
 *
 * @param model The player model.
 * @param kind The kind of the target.
 * @returns The target.
 * @throws Error if the instrument has no target of the kind.
 */
function targetOf(model: PlayerModel, kind: PlayTargetKind): PlayTarget {
  const target = model.instrument.targets.find((t) => t.kind === kind);
  if (!target) {
    throw new Error(`The ${model.instrument.id} has no target "${kind}".`);
  }
  return target;
}

/**
 * Gives a unit vector normal to an axis, on the side of a preferred direction.
 *
 * @param v A vector normal to the axis.
 * @param prefer The preferred side.
 * @returns `v` or `-v`, as a unit vector.
 */
function toSide(v: Vector3, prefer: Vec3): Vec3 {
  const unit = v.clone().normalize();
  return toVec3(unit.dot(new Vector3(...prefer)) < 0 ? unit.negate() : unit);
}

/**
 * Makes the frames of the torso in the playing pose with no idle motion: the bind pose with the
 * lean of the hold.
 *
 * @param rig The points of the player.
 * @returns The frames.
 */
function playingFrames(rig: RigPoints): TorsoFrames {
  const lean = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -rig.hold.lean);
  const spine = new Vector3(...rig.spineBind);
  return {
    root: { rotation: new Quaternion(), position: new Vector3() },
    chest: {
      rotation: lean,
      position: new Vector3(...rig.chestBind).sub(spine).applyQuaternion(lean).add(spine),
    },
  };
}

/**
 * Finds the part of the bow hair that the bow arm reaches on all strings in the playing pose. A
 * small player cannot reach the tip of a long bow.
 *
 * @param rig The points of the player.
 * @returns The longest reached part of the hair, in meters from the frog end. If the arm reaches
 *   no part, the 0.04 m around the nearest place.
 */
function bowRangeOf(rig: RigPoints): BowRange {
  const frames = playingFrames(rig);
  const { place, strings, bow: placed, hand } = createBowPlaces();
  stringsAt(rig, instrumentAt(rig, frames, 1, place), strings);
  const pole = new Vector3(...rig.hold.poleR).applyQuaternion(frames.chest.rotation);
  const shoulder = poseShoulder(
    rig.armR,
    frames.chest,
    rig.chestBind,
    shoulderTurn(rig, 1, new Quaternion()),
  );
  // The hand rolls so that its back points to the elbow of the hold, as in the pose.
  const wristAt = (string: number, at: number): Vector3 => {
    bowAt(rig, strings, string, at, 0, placed);
    const wrist = gripHand(rig, placed, 0, hand).wrist;
    const { elbow } = solveArm(rig.armR.bind, shoulder.position, shoulder.rotation, wrist, pole);
    return gripHand(rig, placed, rollToward(rig, placed, elbow), hand).wrist;
  };
  const reach = rig.armR.reach;
  const end = rig.hairLength - HAIR_END + 1e-9;
  let best: [number, number] | null = null;
  let start = -1;
  let nearest = HAIR_END;
  let nearestDistance = Infinity;
  for (let bow = HAIR_END; bow <= end; bow += BOW_STEP) {
    const distance = Math.max(
      wristAt(0, bow).distanceTo(shoulder.position),
      wristAt(3, bow).distanceTo(shoulder.position),
    );
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = bow;
    }
    const reached = distance <= reach;
    if (reached && start < 0) {
      start = bow;
    }
    if (start >= 0 && (!reached || bow + BOW_STEP > end)) {
      const stop = reached ? bow : bow - BOW_STEP;
      if (!best || stop - start > best[1] - best[0]) {
        best = [start, stop];
      }
      start = -1;
    }
  }
  return best ?? [Math.max(0, nearest - 0.02), nearest + 0.02];
}

/** The step of the search for the reached part of the fingerboard. */
const STOP_STEP = 0.01;

/**
 * Finds the part of the fingerboard that the left arm reaches in the playing pose. The neck of a
 * contrabass goes high above the shoulder, so a small player cannot reach the nut.
 *
 * @param rig The points of the player.
 * @returns The longest reached part, from 0 at the nut to 1 at the end. If the arm reaches no
 *   place, the place nearest to the shoulder.
 */
function stopRangeOf(rig: RigPoints): readonly [low: number, high: number] {
  const frames = playingFrames(rig);
  const { place, strings } = createBowPlaces();
  instrumentAt(rig, frames, 1, place);
  stringsAt(rig, place, strings);
  const shoulder = poseShoulder(rig.armL, frames.chest, rig.chestBind, new Quaternion()).position;
  const hand = { wrist: new Vector3(), rotation: new Quaternion() };
  let best: [number, number] | null = null;
  let start = -1;
  let nearest = 0;
  let nearestDistance = Infinity;
  const steps = Math.round(1 / STOP_STEP);
  for (let k = 0; k <= steps; k++) {
    const stop = k * STOP_STEP;
    const distance = stopHandAt(
      rig,
      place,
      strings,
      stop,
      BOWED_HANDS.curlL,
      hand,
    ).wrist.distanceTo(shoulder);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = stop;
    }
    const reached = distance <= rig.armL.reach;
    if (reached && start < 0) {
      start = stop;
    }
    if (start >= 0 && (!reached || k === steps)) {
      const end = reached ? stop : stop - STOP_STEP;
      if (!best || end - start > best[1] - best[0]) {
        best = [start, end];
      }
      start = -1;
    }
  }
  return best ?? [nearest, nearest];
}

/**
 * Finds the points of a bowed string player that the pose needs.
 *
 * @param model A player with a violin, a viola, a cello, or a contrabass.
 * @param instrument The instrument of the model.
 * @param hold The hold of the instrument. The stage uses the hold of {@link BOWED_HOLDS}.
 * @returns The rig.
 * @throws Error if the instrument has no bow or no target of a bowed string.
 */
export function bowedRig(
  model: PlayerModel,
  instrument: BowedInstrument,
  hold: BowedHold = BOWED_HOLDS[instrument],
): BowedRig {
  const { positions, parents } = model.skeleton;
  const at = (bone: number): Vec3 => positions[bone] ?? [0, 0, 0];
  const pieceRotation = (bone: 'instrument' | 'bow'): Quaternion => {
    const placed = model.pieces.find((p) => p.piece.bone === bone);
    if (!placed) {
      throw new Error(`The ${instrument} has no piece on the bone "${bone}".`);
    }
    return new Quaternion(...placed.at.rotation);
  };
  const placed = (bone: 'instrument' | 'bow', point: Vec3): Vector3 =>
    new Vector3(...placePoint(model.pieces, { bone, at: point }));
  const contactTarget = targetOf(model, 'bow-contact');
  const board = targetOf(model, 'fingerboard');
  const hair = targetOf(model, 'bow-hair');

  const contact = placed('instrument', contactTarget.from);
  const top = new Vector3(...contactTarget.normal)
    .applyQuaternion(pieceRotation('instrument'))
    .normalize();
  const nut = placed('instrument', board.from);
  const neckEnd = placed('instrument', board.to);
  const neck = neckEnd.clone().sub(nut);
  const axis = neck.clone().negate().normalize();
  const hairFrom = placed('bow', hair.from);
  const hairTo = placed('bow', hair.to);
  const hairAxis = hairTo.clone().sub(hairFrom).normalize();
  const hairNormal = new Vector3(...hair.normal).applyQuaternion(pieceRotation('bow')).normalize();

  const parent = parents[BONES.instrument] ?? 0;
  const standing = model.support === 'stand' && hold.rest !== null;
  const lapRest = standing ? STANDING_REST : hold.rest;
  const restRotation = new Quaternion();
  if (lapRest) {
    const restAxis = new Vector3(...lapRest.axis).normalize();
    const restTop = new Vector3(...lapRest.top);
    restTop.addScaledVector(restAxis, -restTop.dot(restAxis)).normalize();
    setFromBasis(restRotation, restAxis, restTop).multiply(
      setFromBasis(new Quaternion(), axis, top).invert(),
    );
  }
  const restBow = hold.restBow;
  const bowTip = new Vector3(...restBow.tip).normalize();
  const bowHair = new Vector3(...restBow.hair);
  bowHair.addScaledVector(bowTip, -bowHair.dot(bowTip)).normalize();
  const strings = new Vector3().crossVectors(top, axis);
  const rig: RigPoints = {
    hold,
    pivot: at(BONES.instrument),
    parent,
    parentBind: at(parent),
    spineBind: at(BONES.spine),
    chestBind: at(BONES.chest),
    contact: toVec3(contact),
    axis: toVec3(axis),
    top: toVec3(top),
    across: toSide(strings, hold.tip),
    fingers: toSide(strings, hold.fingers),
    nut: toVec3(nut),
    neck: toVec3(neck),
    knuckles: toVec3(new Vector3(...at(BONES.fingersL)).sub(new Vector3(...at(BONES.handL)))),
    fingerBlock: toVec3(
      new Vector3(...model.body.fingerBlockL).sub(new Vector3(...at(BONES.fingersL))),
    ),
    pluck: toVec3(contact.clone().sub(neckEnd).multiplyScalar(hold.pluckPlace).add(neckEnd)),
    hairStart: toVec3(hairFrom.clone().sub(new Vector3(...at(BONES.bow)))),
    grip: toVec3(new Vector3(...at(BONES.bow)).sub(new Vector3(...at(BONES.handR)))),
    stick: toVec3(hairAxis),
    forearm: new Vector3(...at(BONES.handR)).distanceTo(new Vector3(...at(boneIndex('forearmR')))),
    hairLength: hairTo.distanceTo(hairFrom),
    bowAlign: toQuat(setFromBasis(new Quaternion(), hairAxis, hairNormal).invert()),
    armL: armRig(model, 'L'),
    armR: armRig(model, 'R'),
    restRotation: toQuat(restRotation),
    playShift: toVec3(new Vector3(...hold.playShift).multiplyScalar(model.body.headHeight)),
    restPivot: hold.rest && !standing ? lapPoint(model, 'L', hold.rest.lap) : at(BONES.instrument),
    restPoleR: hold.restPoleR,
    restPoleL: hold.restPoleL,
    restBow: {
      grip: lapPoint(model, 'R', restBow.lap),
      rotation: toQuat(
        setFromBasis(new Quaternion(), bowTip, bowHair).multiply(
          setFromBasis(new Quaternion(), hairAxis, hairNormal).invert(),
        ),
      ),
    },
  };
  const rest = standing ? standingRest(model, rig) : rig;
  return { ...rest, bowRange: bowRangeOf(rest), stopRange: stopRangeOf(rest) };
}

/**
 * Gives the frames of the torso in the bind pose.
 *
 * @param rig The points of the player.
 * @returns The frames of the root and of the chest, with no turn.
 */
function bindFrames(rig: RigPoints): TorsoFrames {
  return {
    root: { rotation: new Quaternion(), position: new Vector3() },
    chest: { rotation: new Quaternion(), position: new Vector3(...rig.chestBind) },
  };
}

/**
 * Gives the rest pose of a soloist who stands (design 5.2): the arms hang a little out to the
 * sides, the left hand holds the instrument at the rest place of the fingers, and the right hand
 * holds the bow as in the bind pose.
 *
 * @param model The player model.
 * @param rig The points of the player, with the instrument turned for the rest pose.
 * @returns The points, with the rest place of the instrument and the bow.
 */
function standingRest(model: PlayerModel, rig: RigPoints): RigPoints {
  const hangL = hangingArm(model, rig.armL);
  const hangR = hangingArm(model, rig.armR);

  // The left hand holds the instrument at the hanging wrist.
  const frames = bindFrames(rig);
  const { place, strings } = createBowPlaces();
  instrumentAt(rig, frames, 0, place);
  stringsAt(rig, place, strings);
  const hand = stopHandAt(rig, place, strings, rig.hold.restPlace, 0, {
    wrist: new Vector3(),
    rotation: new Quaternion(),
  });
  const wristL = new Vector3(...rig.armL.bind.shoulder).add(new Vector3(...hangL.wrist));

  // The right hand holds the bow as in the bind pose.
  const bowHand = new Quaternion(...hangR.hand);
  const wristR = new Vector3(...rig.armR.bind.shoulder).add(new Vector3(...hangR.wrist));

  return {
    ...rig,
    restPivot: toVec3(new Vector3(...rig.restPivot).add(wristL.sub(hand.wrist))),
    restPoleR: hangR.pole,
    restPoleL: hangL.pole,
    restBow: {
      grip: toVec3(new Vector3(...rig.grip).applyQuaternion(bowHand).add(wristR)),
      rotation: toQuat(bowHand),
    },
  };
}
