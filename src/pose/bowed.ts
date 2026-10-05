import { MathUtils, Quaternion, Vector3 } from 'three';

import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import { placePoint } from '../models/instruments/hold.ts';
import type { PlayTarget, PlayTargetKind } from '../models/instruments/types.ts';
import { toQuat, toVec3 } from '../models/tuples.ts';
import type { Quat, Vec3 } from '../models/tuples.ts';
import { mixRotation } from './blend.ts';
import type { InstrumentOf } from './family.ts';
import { createFrame, posePoint, setBoneRotation, setFromBasis } from './frames.ts';
import type { TorsoFrames } from './frames.ts';
import { armRig, hangingWrist, poseShoulder, writeArm, writeCurl } from './ik.ts';
import type { ArmRig } from './ik.ts';
import { smoothstep } from './rest.ts';
import type { BowRange, BowState } from './strokes.ts';

/** The bowed strings of design 4.6. */
export type BowedInstrument = InstrumentOf<'bowed'>;

/**
 * The values of the hold of each bowed string (design 4.6, 4.7). The directions are in the model
 * axes of the bind pose: the player faces -z, and its left is -x.
 */
export interface BowedHold {
  /** The bow tip points to this side of the strings, across them. */
  readonly tip: Vec3;
  /** The left fingers point to this side of the neck. */
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
  pluckPlace: 0.3,
  rest: null,
} as const satisfies BowedHold;

/** The holds of the bowed strings. */
export const BOWED_HOLDS = {
  violin: CHIN_HOLD,
  viola: { ...CHIN_HOLD, reach: 30 * MathUtils.DEG2RAD },
  cello: FLOOR_HOLD,
  contrabass: {
    ...FLOOR_HOLD,
    stringTurn: 7 * MathUtils.DEG2RAD,
    lean: 5 * MathUtils.DEG2RAD,
  },
} as const satisfies Readonly<Record<BowedInstrument, BowedHold>>;

/** The sizes of the hand motion of the bowed strings, in meters and radians (design 5.3). */
export const BOWED_HANDS = {
  /** The right palm is this high above the strings to pluck. */
  pluckHeight: 0.035,
  /** The plucking hand moves this far to each side of the strings, at a gesture size of 1. */
  pluck: 0.012,
  /** The curl of the left fingers, and the extra curl of a press at the note start. */
  curlL: 40 * MathUtils.DEG2RAD,
  pressL: 15 * MathUtils.DEG2RAD,
  /** The curl of the right fingers around the bow. */
  curlR: 30 * MathUtils.DEG2RAD,
} as const;

/** The free part of the bow hair at each end, in meters. */
const HAIR_END = 0.03;

const BONES = {
  spine: boneIndex('spine'),
  chest: boneIndex('chest'),
  instrument: boneIndex('instrument'),
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
  /** The unit direction across the neck to which the left fingers point. */
  readonly fingers: Vec3;
  /** The left palm in its grip under the neck, and its place on the target `fingerboard`. */
  readonly grip: Vec3;
  readonly gripPlace: number;
  /** The vector of the target `fingerboard`, from the nut to the end of the fingerboard. */
  readonly neck: Vec3;
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
}

/** The points of a rig before its bow range. */
type RigPoints = Omit<BowedRig, 'bowRange'>;

/** The instrument at its posed place. */
interface InstrumentPlace {
  /** The rotation of the `instrument` bone relative to its parent. */
  readonly local: Quaternion;
  /** The world rotation of the instrument and the posed place of its bone. */
  readonly rotation: Quaternion;
  readonly pivot: Vector3;
}

/** The strings of an instrument at their posed place. */
interface StringsPlace {
  /** The point on the strings where the bow plays. */
  readonly contact: Vector3;
  readonly axis: Vector3;
  readonly top: Vector3;
  /** The direction across the strings to the side of the bow tip. */
  readonly across: Vector3;
}

/** The bow hand that puts the bow hair on the strings. */
interface BowHand {
  readonly wrist: Vector3;
  /** The world rotation of the `handR` bone. */
  readonly rotation: Quaternion;
}

/** The rotation that changes nothing. Nothing writes it. */
const NO_TURN = new Quaternion();

const Y_AXIS = new Vector3(0, 1, 0);

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

const rest = new Quaternion();

/**
 * Places the instrument: the violin and the viola go down in the rest pose.
 *
 * @param rig The points of the player.
 * @param frames The posed frames of the torso.
 * @param weight The weight of the playing pose.
 * @param out The place to write.
 * @returns `out`, with the place of the instrument.
 */
function instrumentAt(
  rig: RigPoints,
  frames: TorsoFrames,
  weight: number,
  out: InstrumentPlace,
): InstrumentPlace {
  const parent = rig.parent === BONES.chest ? frames.chest : frames.root;
  mixRotation(rest.fromArray(rig.restRotation), NO_TURN, weight, out.local);
  out.rotation.multiplyQuaternions(parent.rotation, out.local);
  posePoint(parent, rig.parentBind, rig.pivot, out.pivot);
  return out;
}

const pivotBind = new Vector3();

/**
 * Moves a bind point of the instrument to its posed place.
 *
 * @param rig The points of the player.
 * @param place The place of the instrument.
 * @param point The bind point. The function moves it in place.
 * @returns `point`, at its posed place.
 */
function onInstrument(rig: RigPoints, place: InstrumentPlace, point: Vector3): Vector3 {
  return point.sub(pivotBind.fromArray(rig.pivot)).applyQuaternion(place.rotation).add(place.pivot);
}

/**
 * Gives the strings at the place of the instrument.
 *
 * @param rig The points of the player.
 * @param place The place of the instrument.
 * @param out The strings to write.
 * @returns `out`, with the strings.
 */
function stringsAt(rig: RigPoints, place: InstrumentPlace, out: StringsPlace): StringsPlace {
  onInstrument(rig, place, out.contact.fromArray(rig.contact));
  out.axis.fromArray(rig.axis).applyQuaternion(place.rotation);
  out.top.fromArray(rig.top).applyQuaternion(place.rotation);
  out.across.fromArray(rig.across).applyQuaternion(place.rotation);
  return out;
}

/**
 * Gives the forward turn of the right shoulder bone, so that the bow arm reaches the strings.
 *
 * @param rig The points of the player.
 * @param weight The weight of the playing pose.
 * @param out The quaternion to write.
 * @returns `out`, with the local rotation of the `shoulderR` bone.
 */
function shoulderTurn(rig: RigPoints, weight: number, out: Quaternion): Quaternion {
  return out.setFromAxisAngle(Y_AXIS, rig.hold.reach * weight);
}

const stringTurn = new Quaternion();
const slantTurn = new Quaternion();
const turnedAxis = new Vector3();
const slantAxis = new Vector3();
const turnedTop = new Vector3();
const down = new Vector3();
const along = new Vector3();
const bowAlign = new Quaternion();
const hairStart = new Vector3();

/**
 * Places the bow hand so that the bow hair lies on a string, with a place of the hair on the
 * contact point. The string turns the bow around the strings, and the slant turns it in the
 * plane of the strings.
 *
 * @param rig The points of the player.
 * @param strings The strings at their posed place.
 * @param string The string, from 0 (the lowest) to 3.
 * @param bow The place of the contact point on the hair, in meters from the frog end.
 * @param lift The distance of the hair above the strings.
 * @param out The hand to write.
 * @returns `out`, with the wrist and the rotation of the hand.
 */
function bowHandAt(
  rig: RigPoints,
  strings: StringsPlace,
  string: number,
  bow: number,
  lift: number,
  out: BowHand,
): BowHand {
  turnedAxis.copy(strings.axis).normalize();
  stringTurn.setFromAxisAngle(turnedAxis, (string - 1.5) * rig.hold.stringTurn);
  turnedTop.copy(strings.top).applyQuaternion(stringTurn);
  slantTurn.setFromAxisAngle(slantAxis.copy(turnedTop).normalize(), rig.hold.slant);
  along.copy(strings.across).applyQuaternion(stringTurn).applyQuaternion(slantTurn);
  setFromBasis(out.rotation, along, down.copy(turnedTop).negate()).multiply(
    bowAlign.fromArray(rig.bowAlign),
  );
  out.wrist
    .copy(strings.contact)
    .addScaledVector(turnedTop, lift)
    .sub(hairStart.fromArray(rig.hairStart).applyQuaternion(out.rotation))
    .addScaledVector(along, -bow);
  return out;
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

/** The places that the bow pose writes. */
interface BowPlaces {
  readonly place: InstrumentPlace;
  readonly strings: StringsPlace;
  readonly hand: BowHand;
}

/**
 * Makes the places that the bow pose writes.
 *
 * @returns The place of the instrument, the strings, and the bow hand.
 */
function createBowPlaces(): BowPlaces {
  return {
    place: { local: new Quaternion(), rotation: new Quaternion(), pivot: new Vector3() },
    strings: {
      contact: new Vector3(),
      axis: new Vector3(),
      top: new Vector3(),
      across: new Vector3(),
    },
    hand: { wrist: new Vector3(), rotation: new Quaternion() },
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

/**
 * Finds the points of a bowed string player that the pose needs.
 *
 * @param model A player with a violin, a viola, a cello, or a contrabass.
 * @param instrument The instrument of the model.
 * @returns The rig.
 * @throws Error if the instrument has no bow, no target of a bowed string, or no left palm grip.
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
  const palm = model.instrument.grips.palmL;
  if (!palm) {
    throw new Error(`The ${instrument} has no grip of the left palm.`);
  }

  const contact = placed('instrument', contactTarget.from);
  const top = new Vector3(...contactTarget.normal)
    .applyQuaternion(pieceRotation('instrument'))
    .normalize();
  const nut = placed('instrument', board.from);
  const neckEnd = placed('instrument', board.to);
  const neck = neckEnd.clone().sub(nut);
  const axis = neck.clone().negate().normalize();
  const grip = new Vector3(...placePoint(model.pieces, palm));
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
    grip: toVec3(grip),
    gripPlace: grip.clone().sub(nut).dot(neck) / neck.dot(neck),
    neck: toVec3(neck),
    pluck: toVec3(contact.clone().sub(neckEnd).multiplyScalar(hold.pluckPlace).add(neckEnd)),
    hairStart: toVec3(hairFrom.clone().sub(new Vector3(...at(BONES.handR)))),
    hairLength: hairTo.distanceTo(hairFrom),
    bowAlign: toQuat(setFromBasis(new Quaternion(), hairAxis, hairNormal).invert()),
    armL: armRig(model, 'L'),
    armR: armRig(model, 'R'),
    restRotation: toQuat(restRotation),
  };
  return { ...rig, bowRange: bowRangeOf(rig) };
}

const places = createBowPlaces();
const shoulderR = createFrame();
const shoulderL = createFrame();
const turn = new Quaternion();
const tip = new Vector3();
const tipSide = new Vector3();
const pluckHand = new Quaternion();
const pluckWrist = new Vector3();
const palmOffset = new Vector3();
const hanging = new Vector3();
const wristR = new Vector3();
const handR = new Quaternion();
const wristL = new Vector3();
const handL = new Quaternion();
const fingers = new Vector3();

/**
 * Writes the arms and the instrument of a bowed string player (design 5.3, 4.7). The bow plays
 * on the strings at the place of the bow state, on the string of the stroke, and lifts in a rest.
 * Pizzicato moves the right hand over the strings near the end of the fingerboard to pluck. The
 * left palm moves along the neck to the place of the note. The two-bone IK places each arm. In
 * the rest pose, the violin and the viola go down, the left hand keeps the neck, and the bow arm
 * hangs.
 *
 * The caller writes the lean of the hold into the spine before it calculates the frames.
 *
 * @param rig The points of the player.
 * @param frames The posed frames of the root and of the chest.
 * @param state The bow state at the song time of the note layer.
 * @param weight The eased weight of the playing pose: 0 is the rest pose (5.2, 5.5).
 * @param rotations The rotations of the pose to write.
 */
export function poseBowed(
  rig: BowedRig,
  frames: TorsoFrames,
  state: BowState,
  weight: number,
  rotations: Float32Array,
): void {
  const h = BOWED_HANDS;
  const chest = frames.chest;
  const { place, strings, hand: bowHand } = places;
  instrumentAt(rig, frames, weight, place);
  stringsAt(rig, place, strings);
  bowHandAt(rig, strings, state.string, state.bow, state.lift, bowHand);

  // Pizzicato: the right palm above the strings, with the bow tip up.
  tip.fromArray(rig.hold.pizzicatoTip).applyQuaternion(chest.rotation);
  tip.addScaledVector(strings.axis, -tip.dot(strings.axis)).normalize();
  setFromBasis(pluckHand, tip, tipSide.crossVectors(tip, strings.axis).normalize()).multiply(
    bowAlign.fromArray(rig.bowAlign),
  );
  onInstrument(rig, place, pluckWrist.fromArray(rig.pluck))
    .addScaledVector(strings.top, h.pluckHeight)
    .addScaledVector(strings.across, state.pluck * h.pluck * state.gesture)
    .sub(palmOffset.fromArray(rig.armR.palm).applyQuaternion(pluckHand));

  // The bow arm hangs from the shoulder in the rest pose.
  shoulderTurn(rig, weight, turn);
  const shoulder = poseShoulder(rig.armR, chest, rig.chestBind, turn, shoulderR);
  const pizzicato = smoothstep(state.pizzicato);
  hangingWrist(rig.armR, shoulder, hanging);
  wristR.lerpVectors(bowHand.wrist, pluckWrist, pizzicato);
  mixRotation(bowHand.rotation, pluckHand, pizzicato, handR);
  writeArm(
    {
      arm: rig.armR,
      shoulder,
      wrist: wristR.lerpVectors(hanging, wristR, weight),
      hand: mixRotation(shoulder.rotation, handR, weight, handR),
      pole: rig.hold.poleR,
    },
    chest.rotation,
    rotations,
  );

  // The left palm moves along the neck. In the rest pose, it keeps its grip.
  const shift = (state.fingerboard - rig.gripPlace) * weight;
  palmOffset.fromArray(rig.neck);
  onInstrument(rig, place, wristL.fromArray(rig.grip).addScaledVector(palmOffset, shift));
  fingers.fromArray(rig.fingers).applyQuaternion(place.rotation).negate();
  setFromBasis(handL, strings.top, fingers);
  writeArm(
    {
      arm: rig.armL,
      shoulder: poseShoulder(rig.armL, chest, rig.chestBind, NO_TURN, shoulderL),
      wrist: wristL.sub(palmOffset.fromArray(rig.armL.palm).applyQuaternion(handL)),
      hand: handL,
      pole: rig.hold.poleL,
    },
    chest.rotation,
    rotations,
  );

  setBoneRotation(rotations, rig.armR.bones.shoulder, turn);
  setBoneRotation(rotations, BONES.instrument, place.local);
  writeCurl(rig.armL, (h.curlL + h.pressL * state.press * state.gesture) * weight, rotations);
  writeCurl(rig.armR, h.curlR * weight, rotations);
}
