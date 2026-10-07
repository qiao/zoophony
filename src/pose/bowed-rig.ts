import { MathUtils, Quaternion, Vector3 } from 'three';

import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import { placePoint } from '../models/instruments/hold.ts';
import type { PlayTarget, PlayTargetKind } from '../models/instruments/types.ts';
import { toQuat, toVec3 } from '../models/tuples.ts';
import type { Quat, Vec3 } from '../models/tuples.ts';
import {
  BOWED_HANDS,
  bowHandAt,
  createBowPlaces,
  instrumentAt,
  shoulderTurn,
  stopHandAt,
  stringsAt,
} from './bowed.ts';
import type { InstrumentOf } from './family.ts';
import { setFromBasis } from './frames.ts';
import type { TorsoFrames } from './frames.ts';
import { armRig, poseShoulder } from './ik.ts';
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
  /** The directions to which the elbows point. */
  readonly poleL: Vec3;
  readonly poleR: Vec3;
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
   * The rest pose of the instrument: its axis and the side of its top plate. `null` keeps the
   * instrument in its playing place, as the cello and the contrabass stand on the floor.
   */
  readonly rest: { readonly axis: Vec3; readonly top: Vec3 } | null;
}

/** The violin and the viola share their hold under the chin. */
const CHIN_HOLD = {
  tip: [0, 1, 0],
  fingers: [0, 1, 0],
  poleL: [-0.3, -1, 0],
  poleR: [1, -1, 0.3],
  pizzicatoTip: [0.3, 1, 0.4],
  stringTurn: 9 * MathUtils.DEG2RAD,
  slant: -20 * MathUtils.DEG2RAD,
  reach: 10 * MathUtils.DEG2RAD,
  lean: 0,
  restPlace: 0.4,
  pluckPlace: 0.9,
  rest: { axis: [-0.3, -0.55, -0.78], top: [1, 0.2, 0] },
} as const satisfies BowedHold;

/** The cello and the contrabass share their hold on the floor. */
const FLOOR_HOLD = {
  tip: [-1, 0, 0],
  fingers: [1, 0, 0],
  poleL: [-1, 0, 0.3],
  poleR: [1, -0.6, 0.3],
  pizzicatoTip: [1, 0.8, 0.5],
  stringTurn: 9 * MathUtils.DEG2RAD,
  slant: -20 * MathUtils.DEG2RAD,
  reach: 30 * MathUtils.DEG2RAD,
  lean: 10 * MathUtils.DEG2RAD,
  restPlace: 0.4,
  pluckPlace: 0.3,
  rest: null,
} as const satisfies BowedHold;

/** The holds of the bowed strings. */
export const BOWED_HOLDS = {
  violin: CHIN_HOLD,
  viola: { ...CHIN_HOLD, reach: 30 * MathUtils.DEG2RAD },
  cello: { ...FLOOR_HOLD, reach: 40 * MathUtils.DEG2RAD },
  contrabass: {
    ...FLOOR_HOLD,
    stringTurn: 7 * MathUtils.DEG2RAD,
    lean: 5 * MathUtils.DEG2RAD,
  },
} as const satisfies Readonly<Record<BowedInstrument, BowedHold>>;

/** The free part of the bow hair at each end, in meters. */
const HAIR_END = 0.03;

const BONES = {
  spine: boneIndex('spine'),
  chest: boneIndex('chest'),
  instrument: boneIndex('instrument'),
  handL: boneIndex('handL'),
  fingersL: boneIndex('fingersL'),
  handR: boneIndex('handR'),
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
  /** The start of the bow hair at the frog, from the `handR` bone. */
  readonly hairStart: Vec3;
  readonly hairLength: number;
  /** The rotation that turns the bow axes (along the hair, to the strings) to the bind pose. */
  readonly bowAlign: Quat;
  readonly armL: ArmRig;
  readonly armR: ArmRig;
  /** The rotation of the `instrument` bone in the rest pose, relative to its parent. */
  readonly restRotation: Quat;
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
  const { place, strings, hand } = createBowPlaces();
  stringsAt(rig, instrumentAt(rig, frames, 1, place), strings);
  const shoulder = poseShoulder(
    rig.armR,
    frames.chest,
    rig.chestBind,
    shoulderTurn(rig, 1, new Quaternion()),
  ).position;
  const reach = rig.armR.reach;
  const step = 0.005;
  const end = rig.hairLength - HAIR_END + 1e-9;
  let best: [number, number] | null = null;
  let start = -1;
  let nearest = HAIR_END;
  let nearestDistance = Infinity;
  for (let bow = HAIR_END; bow <= end; bow += step) {
    const distance = Math.max(
      bowHandAt(rig, strings, 0, bow, 0, hand).wrist.distanceTo(shoulder),
      bowHandAt(rig, strings, 3, bow, 0, hand).wrist.distanceTo(shoulder),
    );
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = bow;
    }
    const reached = distance <= reach;
    if (reached && start < 0) {
      start = bow;
    }
    if (start >= 0 && (!reached || bow + step > end)) {
      const stop = reached ? bow : bow - step;
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
 * @returns The rig.
 * @throws Error if the instrument has no bow or no target of a bowed string.
 */
export function bowedRig(model: PlayerModel, instrument: BowedInstrument): BowedRig {
  const hold = BOWED_HOLDS[instrument];
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
  const restRotation = new Quaternion();
  if (hold.rest) {
    const restAxis = new Vector3(...hold.rest.axis).normalize();
    const restTop = new Vector3(...hold.rest.top);
    restTop.addScaledVector(restAxis, -restTop.dot(restAxis)).normalize();
    setFromBasis(restRotation, restAxis, restTop).multiply(
      setFromBasis(new Quaternion(), axis, top).invert(),
    );
  }
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
    hairStart: toVec3(hairFrom.clone().sub(new Vector3(...at(BONES.handR)))),
    hairLength: hairTo.distanceTo(hairFrom),
    bowAlign: toQuat(setFromBasis(new Quaternion(), hairAxis, hairNormal).invert()),
    armL: armRig(model, 'L'),
    armR: armRig(model, 'R'),
    restRotation: toQuat(restRotation),
  };
  return { ...rig, bowRange: bowRangeOf(rig), stopRange: stopRangeOf(rig) };
}
