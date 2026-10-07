import { MathUtils, Quaternion, Vector3 } from 'three';

import { boneIndex } from '../models/rig.ts';
import { mixRotation } from './blend.ts';
import type { BowedRig, RigPoints } from './bowed-rig.ts';
import { createFrame, posePoint, setBoneRotation, setFromBasis } from './frames.ts';
import type { TorsoFrames } from './frames.ts';
import { createArmPose, hangingWrist, poseShoulder, solveArm, writeArm, writeCurl } from './ik.ts';
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
  /** The curl of the right fingers around the bow stick (design 4.6). */
  curlR: 45 * MathUtils.DEG2RAD,
} as const;

const BONES = {
  chest: boneIndex('chest'),
  instrument: boneIndex('instrument'),
  bow: boneIndex('bow'),
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

/** The bow at its posed place: the bow bone at the grip, and its world rotation. */
export interface BowPlace {
  /** The posed place of the `bow` bone: the grip on the stick. */
  readonly grip: Vector3;
  /** The world rotation of the `bow` bone. */
  readonly rotation: Quaternion;
}

/** The right hand that holds the bow. */
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
 * Places the bow so that its hair lies on a string, with a place of the hair on the contact
 * point. The string turns the bow around the strings, and the slant turns it in the plane of the
 * strings.
 *
 * @param rig The points of the player.
 * @param strings The strings at their posed place.
 * @param string The string, from 0 (the lowest) to 3.
 * @param bow The place of the contact point on the hair, in meters from the frog end.
 * @param lift The distance of the hair above the strings.
 * @param out The bow to write.
 * @returns `out`, with the grip and the rotation of the bow.
 */
export function bowAt(
  rig: RigPoints,
  strings: StringsPlace,
  string: number,
  bow: number,
  lift: number,
  out: BowPlace,
): BowPlace {
  turnedAxis.copy(strings.axis).normalize();
  stringTurn.setFromAxisAngle(turnedAxis, (string - 1.5) * rig.hold.stringTurn);
  turnedTop.copy(strings.top).applyQuaternion(stringTurn);
  slantTurn.setFromAxisAngle(slantAxis.copy(turnedTop).normalize(), rig.hold.slant);
  along.copy(strings.across).applyQuaternion(stringTurn).applyQuaternion(slantTurn);
  setFromBasis(out.rotation, along, down.copy(turnedTop).negate()).multiply(
    bowAlign.fromArray(rig.bowAlign),
  );
  out.grip
    .copy(strings.contact)
    .addScaledVector(turnedTop, lift)
    .sub(hairStart.fromArray(rig.hairStart).applyQuaternion(out.rotation))
    .addScaledVector(along, -bow);
  return out;
}

const stick = new Vector3();
const handUp = new Vector3();
const aimUp = new Vector3();
const normal = new Vector3();
/**
 * The range of the roll of the right hand around the stick, from the hold of the bind pose, in
 * radians. Past it, the hair at the frog goes into the palm or the fingers.
 */
const ROLL_RANGE = [-120 * MathUtils.DEG2RAD, 100 * MathUtils.DEG2RAD] as const;
const roll = new Quaternion();
const gripOffset = new Vector3();

/**
 * Places the right hand around a bow. The stick lies in the fingers (design 4.6), so the hand can
 * roll around the stick and keep its grip. The hand rolls so that its back points as near as
 * possible to a point, such as the elbow: then the forearm comes to the wrist from the back of
 * the hand, and the frog end of the stick stays out of the forearm.
 *
 * @param rig The points of the player.
 * @param bow The bow at its posed place.
 * @param aim The point to which the hand points from the wrist, in the model axes.
 * @param out The hand to write.
 * @param share The part of the roll that the hand makes, from 0 to 1.
 * @returns `out`, with the wrist and the rotation of the hand.
 */
export function gripHand(
  rig: RigPoints,
  bow: BowPlace,
  aim: Vector3,
  out: BowHand,
  share = 1,
): BowHand {
  stick.fromArray(rig.stick).applyQuaternion(bow.rotation);
  // The bind hand hangs: from the wrist, the arm goes up (+y).
  handUp.set(0, 1, 0).applyQuaternion(bow.rotation);
  handUp.addScaledVector(stick, -handUp.dot(stick)).normalize();
  aimUp.subVectors(aim, bow.grip);
  aimUp.addScaledVector(stick, -aimUp.dot(stick));
  if (aimUp.lengthSq() < 1e-12) {
    out.rotation.copy(bow.rotation);
  } else {
    aimUp.normalize();
    const angle =
      share *
      MathUtils.clamp(
        Math.atan2(stick.dot(normal.crossVectors(handUp, aimUp)), handUp.dot(aimUp)),
        ROLL_RANGE[0],
        ROLL_RANGE[1],
      );
    out.rotation.multiplyQuaternions(roll.setFromAxisAngle(stick, angle), bow.rotation);
  }
  out.wrist.copy(bow.grip).sub(gripOffset.fromArray(rig.grip).applyQuaternion(out.rotation));
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
  readonly bow: BowPlace;
  readonly hand: BowHand;
}

/**
 * Makes the places that the bow pose writes.
 *
 * @returns The place of the instrument, the strings, the bow, and the bow hand.
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
    bow: { grip: new Vector3(), rotation: new Quaternion() },
    hand: { wrist: new Vector3(), rotation: new Quaternion() },
  };
}

const places = createBowPlaces();
const shoulderR = createFrame();
const shoulderL = createFrame();
const turn = new Quaternion();
const tip = new Vector3();
const tipSide = new Vector3();
const pluckBow: BowPlace = { grip: new Vector3(), rotation: new Quaternion() };
const pluckHand: BowHand = { wrist: new Vector3(), rotation: new Quaternion() };
const palmOffset = new Vector3();
const hanging = new Vector3();
const restBow: BowPlace = { grip: new Vector3(), rotation: new Quaternion() };
const held: BowPlace = { grip: new Vector3(), rotation: new Quaternion() };
const pluckPalm = new Vector3();
const bowLocal = new Quaternion();
const aim = new Vector3();
const backOfHand = new Vector3();
const poleR = new Vector3();
const chestInverse = new Quaternion();
const poleTuple: [number, number, number] = [0, 0, 0];
const POLE_K = 0.8;
const pole = new Vector3();
const solved = createArmPose();
const handL: StopHand = { wrist: new Vector3(), rotation: new Quaternion() };

/**
 * Writes the arms and the instrument of a bowed string player (design 5.3, 4.7). The bow plays
 * on the strings at the place of the bow state, on the string of the stroke, and lifts in a rest.
 * Pizzicato moves the right hand over the strings near the end of the fingerboard to pluck. The
 * middle of the left finger block presses the strings at the place of the note on the
 * fingerboard. The two-bone IK places each arm. In the rest pose, the violin and the viola go
 * down, the left fingers keep the strings, and the bow arm hangs.
 *
 * The right hand rolls around the stick so that the back of the hand points to the elbow. The
 * `bow` bone turns back by the roll, so that the hair stays on the strings.
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
  const { place, strings, bow, hand: bowHand } = places;
  instrumentAt(rig, frames, weight, place);
  stringsAt(rig, place, strings);
  bowAt(rig, strings, state.string, state.bow, state.lift, bow);

  // Pizzicato: the right palm above the strings, with the bow tip up.
  tip.fromArray(rig.hold.pizzicatoTip).applyQuaternion(chest.rotation);
  tip.addScaledVector(strings.axis, -tip.dot(strings.axis)).normalize();
  setFromBasis(
    pluckBow.rotation,
    tip,
    tipSide.crossVectors(tip, strings.axis).normalize(),
  ).multiply(bowAlign.fromArray(rig.bowAlign));
  onInstrument(rig, place, pluckPalm.fromArray(rig.pluck))
    .addScaledVector(strings.top, h.pluckHeight)
    .addScaledVector(strings.across, state.pluck * h.pluck * state.gesture);
  pluckBow.grip.copy(pluckPalm);

  // The bow arm hangs from the shoulder in the rest pose.
  shoulderTurn(rig, weight, turn);
  const shoulder = poseShoulder(rig.armR, chest, rig.chestBind, turn, shoulderR);
  const pizzicato = smoothstep(state.pizzicato);
  hangingWrist(rig.armR, shoulder, hanging);
  pole.fromArray(rig.hold.poleR).applyQuaternion(chest.rotation);
  // In the rest pose, the hand hangs with the bow.
  restBow.rotation.copy(shoulder.rotation);
  restBow.grip.fromArray(rig.grip).applyQuaternion(shoulder.rotation).add(hanging);
  // The hand points to the shoulder first, then to the elbow of that arm. The elbow turns to
  // the back of the hand, so that the forearm comes to the wrist from there. The hand holds the
  // bow at each step of a change: the bow moves, and the hand follows it.
  aim.copy(shoulder.position);
  for (let pass = 0; pass < 2; pass++) {
    // The plucking palm is above the strings: the grip of the plucking bow follows the palm.
    for (let step = 0; step < 2; step++) {
      gripHand(rig, pluckBow, aim, pluckHand);
      pluckHand.wrist
        .copy(pluckPalm)
        .sub(palmOffset.fromArray(rig.armR.palm).applyQuaternion(pluckHand.rotation));
      pluckBow.grip.fromArray(rig.grip).applyQuaternion(pluckHand.rotation).add(pluckHand.wrist);
    }
    mixRotation(bow.rotation, pluckBow.rotation, pizzicato, held.rotation);
    held.grip.lerpVectors(bow.grip, pluckBow.grip, pizzicato);
    mixRotation(restBow.rotation, held.rotation, weight, held.rotation);
    held.grip.lerpVectors(restBow.grip, held.grip, weight);
    gripHand(rig, held, aim, bowHand, weight);
    backOfHand
      .set(0, 1, 0)
      .applyQuaternion(bowHand.rotation)
      .multiplyScalar(rig.forearm)
      .add(bowHand.wrist)
      .sub(shoulder.position)
      .normalize();
    pole
      .fromArray(rig.hold.poleR)
      .applyQuaternion(chest.rotation)
      .normalize()
      .multiplyScalar(1 - POLE_K)
      .addScaledVector(backOfHand, POLE_K);
    aim.copy(
      solveArm(rig.armR.bind, shoulder.position, shoulder.rotation, bowHand.wrist, pole, solved)
        .elbow,
    );
  }
  poleR.copy(pole).applyQuaternion(chestInverse.copy(chest.rotation).invert()).toArray(poleTuple);
  writeArm(
    { arm: rig.armR, shoulder, wrist: bowHand.wrist, hand: bowHand.rotation, pole: poleTuple },
    chest.rotation,
    rotations,
  );
  setBoneRotation(
    rotations,
    BONES.bow,
    bowLocal.copy(bowHand.rotation).invert().multiply(held.rotation),
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
