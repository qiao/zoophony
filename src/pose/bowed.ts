import { MathUtils, Quaternion, Vector3 } from 'three';

import { boneIndex } from '../models/rig.ts';
import { mixRotation } from './blend.ts';
import type { BowedRig, RigPoints } from './bowed-rig.ts';
import { createFrame, posePoint, setBoneRotation, setFromBasis } from './frames.ts';
import type { TorsoFrames } from './frames.ts';
import { hangingWrist, poseShoulder, writeArm, writeCurl } from './ik.ts';
import { smoothstep } from './rest.ts';
import type { BowState } from './strokes.ts';

/** The sizes of the hand motion of the bowed strings, in meters and radians (design 5.3). */
export const BOWED_HANDS = {
  /** The right palm is this high above the strings to pluck. */
  pluckHeight: 0.035,
  /** The plucking hand moves this far to each side of the strings, at a gesture size of 1. */
  pluck: 0.012,
  /** The curl of the left fingers, and the extra curl of a press at the note start. */
  curlL: 40 * MathUtils.DEG2RAD,
  pressL: 15 * MathUtils.DEG2RAD,
  /**
   * The tilt of the left hand from the normal of the strings to the side of the fingers. The
   * fingers point up from the strings, tilted over the neck, and the palm is below the neck, on
   * the other side.
   */
  tiltL: 30 * MathUtils.DEG2RAD,
  /** The curl of the right fingers around the bow. */
  curlR: 30 * MathUtils.DEG2RAD,
} as const;

const BONES = {
  chest: boneIndex('chest'),
  instrument: boneIndex('instrument'),
} as const;

/** The instrument at its posed place. */
export interface InstrumentPlace {
  /** The rotation of the `instrument` bone relative to its parent. */
  readonly local: Quaternion;
  /** The world rotation of the instrument and the posed place of its bone. */
  readonly rotation: Quaternion;
  readonly pivot: Vector3;
}

/** The strings of an instrument at their posed place. */
export interface StringsPlace {
  /** The point on the strings where the bow plays. */
  readonly contact: Vector3;
  readonly axis: Vector3;
  readonly top: Vector3;
  /** The direction across the strings to the side of the bow tip. */
  readonly across: Vector3;
}

/** The bow hand that puts the bow hair on the strings. */
export interface BowHand {
  readonly wrist: Vector3;
  /** The world rotation of the `handR` bone. */
  readonly rotation: Quaternion;
}

/** The rotation that changes nothing. Nothing writes it. */
const NO_TURN = new Quaternion();

const Y_AXIS = new Vector3(0, 1, 0);

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
export function instrumentAt(
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
export function stringsAt(rig: RigPoints, place: InstrumentPlace, out: StringsPlace): StringsPlace {
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
export function shoulderTurn(rig: RigPoints, weight: number, out: Quaternion): Quaternion {
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
export function bowHandAt(
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

/** The left hand that presses the strings. */
export interface StopHand {
  readonly wrist: Vector3;
  /** The world rotation of the `handL` bone. */
  readonly rotation: Quaternion;
}

const Z_AXIS = new Vector3(0, 0, 1);
const neck = new Vector3();
const fingers = new Vector3();
const fingersUp = new Vector3();
const palmSide = new Vector3();
const curl = new Quaternion();
const block = new Vector3();

/**
 * Places the left hand so that the middle of its finger block presses the strings at a place
 * on the fingerboard. The fingers point up from the strings, tilted over the neck, and the palm
 * faces the neck from below.
 *
 * @param rig The points of the player.
 * @param place The place of the instrument.
 * @param strings The strings at their posed place.
 * @param stop The place on the target `fingerboard`: 0 at the nut, 1 at the end.
 * @param curlAngle The curl of the fingers, in radians.
 * @param out The hand to write.
 * @returns `out`, with the wrist and the rotation of the hand.
 */
export function stopHandAt(
  rig: RigPoints,
  place: InstrumentPlace,
  strings: StringsPlace,
  stop: number,
  curlAngle: number,
  out: StopHand,
): StopHand {
  const tilt = BOWED_HANDS.tiltL;
  onInstrument(
    rig,
    place,
    out.wrist.fromArray(rig.nut).addScaledVector(neck.fromArray(rig.neck), stop),
  );
  fingers.fromArray(rig.fingers).applyQuaternion(place.rotation);
  fingersUp
    .copy(strings.top)
    .multiplyScalar(Math.cos(tilt))
    .addScaledVector(fingers, Math.sin(tilt));
  palmSide
    .copy(fingers)
    .multiplyScalar(Math.cos(tilt))
    .addScaledVector(strings.top, -Math.sin(tilt));
  // The bind hand hangs: its fingers point to -y, and its palm faces +x.
  setFromBasis(out.rotation, palmSide, fingersUp.negate());
  curl.setFromAxisAngle(Z_AXIS, curlAngle);
  block.fromArray(rig.fingerBlock).applyQuaternion(curl).add(neck.fromArray(rig.knuckles));
  out.wrist.sub(block.applyQuaternion(out.rotation));
  return out;
}

/** The places that the bow pose writes. */
export interface BowPlaces {
  readonly place: InstrumentPlace;
  readonly strings: StringsPlace;
  readonly hand: BowHand;
}

/**
 * Makes the places that the bow pose writes.
 *
 * @returns The place of the instrument, the strings, and the bow hand.
 */
export function createBowPlaces(): BowPlaces {
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
const handL: StopHand = { wrist: new Vector3(), rotation: new Quaternion() };

/**
 * Writes the arms and the instrument of a bowed string player (design 5.3, 4.7). The bow plays
 * on the strings at the place of the bow state, on the string of the stroke, and lifts in a rest.
 * Pizzicato moves the right hand over the strings near the end of the fingerboard to pluck. The
 * middle of the left finger block presses the strings at the place of the note on the
 * fingerboard. The two-bone IK places each arm. In the rest pose, the violin and the viola go
 * down, the left fingers keep the strings, and the bow arm hangs.
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

  // The left fingers press the strings at the place of the note, in the part of the fingerboard
  // that the arm reaches. In the rest pose, they keep the place of the rest. The press of a note
  // curls the fingers more, but it does not move the hand.
  const [low, high] = rig.stopRange;
  const note = low + state.fingerboard * (high - low);
  const stop = rig.hold.restPlace + (note - rig.hold.restPlace) * weight;
  stopHandAt(rig, place, strings, stop, h.curlL * weight, handL);
  writeArm(
    {
      arm: rig.armL,
      shoulder: poseShoulder(rig.armL, chest, rig.chestBind, NO_TURN, shoulderL),
      wrist: handL.wrist,
      hand: handL.rotation,
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
