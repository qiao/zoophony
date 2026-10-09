import { MathUtils, Quaternion, Vector3 } from 'three';

import { boneIndex } from '../models/rig.ts';
import { mixDirection, mixRotation } from './blend.ts';
import type { BowedRig, RigPoints } from './bowed-rig.ts';
import { createFrame, posePoint, setBoneRotation, setFromBasis } from './frames.ts';
import type { TorsoFrames } from './frames.ts';
import { createArmPose, poseShoulder, solveArm, writeArm, writeCurl } from './ik.ts';
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
  /** The world rotation of the instrument. */
  readonly rotation: Quaternion;
  /** The posed place of the `instrument` bone. */
  readonly pivot: Vector3;
  /**
   * The move of the `instrument` bone from its bind place, in the axes of its parent: the
   * instrument offset of the pose (design 5.1).
   */
  readonly offset: Vector3;
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
  /** The posed place of the `handR` bone. */
  readonly wrist: Vector3;
  /** The world rotation of the `handR` bone. */
  readonly rotation: Quaternion;
}

/** The rotation that changes nothing. Nothing writes it. */
const NO_TURN = new Quaternion();

const Y_AXIS = new Vector3(0, 1, 0);

const rest = new Quaternion();
const playTurn = new Quaternion();
const playShift = new Vector3();
const ORIGIN = [0, 0, 0] as const;
const restPivot = new Vector3();
const parentInverse = new Quaternion();
const pivotFromParent = new Vector3();
const pivotBind = new Vector3();

/**
 * Places the instrument: the violin and the viola go down in the rest pose. While the player
 * plays, the instrument has the play shift and the play turn of its hold.
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
  mixRotation(
    rest.fromArray(rig.restRotation),
    playTurn.fromArray(rig.hold.playTurn),
    weight,
    out.local,
  );
  out.rotation.multiplyQuaternions(parent.rotation, out.local);
  posePoint(parent, rig.parentBind, rig.pivot, out.pivot);
  out.pivot.add(playShift.fromArray(rig.playShift).applyQuaternion(parent.rotation));

  // The lap does not move with the chest, so the rest place follows the root.
  posePoint(frames.root, ORIGIN, rig.restPivot, restPivot);
  out.pivot.lerpVectors(restPivot, out.pivot, weight);
  out.offset
    .copy(out.pivot)
    .sub(parent.position)
    .applyQuaternion(parentInverse.copy(parent.rotation).invert())
    .add(pivotFromParent.fromArray(rig.parentBind))
    .sub(pivotBind.fromArray(rig.pivot));
  return out;
}

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

/** The free part of the bow hair at each end, in meters. */
export const HAIR_END = 0.03;

/**
 * Gives the place of the contact point on the free part of the bow hair.
 *
 * @param rig The points of the player.
 * @param bow The place of the contact point on the hair, in meters from the frog end.
 * @returns 0 at the frog end of the free hair, 1 at its tip end, and the share between them.
 */
export function hairShare(rig: RigPoints, bow: number): number {
  return MathUtils.clamp((bow - HAIR_END) / (rig.hairLength - 2 * HAIR_END), 0, 1);
}

/**
 * Gives the forward turn of the right shoulder bone, so that the bow arm reaches the strings.
 * The tip help of a short bow arm adds its turn toward the tip (design 5.3).
 *
 * @param rig The points of the player.
 * @param weight The weight of the playing pose.
 * @param tip The share of the tip help, from 0 at the frog to 1 at the tip.
 * @param out The quaternion to write.
 * @returns `out`, with the local rotation of the `shoulderR` bone.
 */
export function shoulderTurn(
  rig: RigPoints,
  weight: number,
  tip: number,
  out: Quaternion,
): Quaternion {
  return out.setFromAxisAngle(Y_AXIS, (rig.hold.reach + rig.tipHelp.turn * tip) * weight);
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
 * strings. The tip help of a short bow arm adds its slant toward the tip (design 5.3).
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
  slantTurn.setFromAxisAngle(
    slantAxis.copy(turnedTop).normalize(),
    rig.hold.slant + rig.tipHelp.slant * hairShare(rig, bow),
  );
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
const roll = new Quaternion();
const gripOffset = new Vector3();
const handUp = new Vector3();
const aimUp = new Vector3();
const normal = new Vector3();

/**
 * The range of the roll of the right hand around the stick, from the hold of the bind pose, in
 * radians. Past it, the hair at the frog goes into the palm or the fingers.
 */
const ROLL_RANGE = [-120 * MathUtils.DEG2RAD, 100 * MathUtils.DEG2RAD] as const;

/** The width of the turns near the far side of the stick in which the roll fades, in radians. */
const FAR_SIDE = 25 * MathUtils.DEG2RAD;

/**
 * The share of a sideways aim that gives the full roll. An aim near the line of the stick gives
 * no clear side, so its roll fades to 0.
 */
const CLEAR_AIM = 0.5;

/**
 * Gives the roll of the right hand around the stick that turns the back of the hand to a point,
 * such as the elbow. Past the range of the roll, the roll fades back to 0 at the far side, and an
 * aim near the line of the stick has less roll. Thus the roll changes with no jump when the aim
 * moves.
 *
 * @param rig The points of the player.
 * @param bow The bow at its posed place.
 * @param aim The point, in the model axes.
 * @returns The roll from the hold of the bind pose, in radians.
 */
export function rollToward(rig: RigPoints, bow: BowPlace, aim: Vector3): number {
  // The bind hand hangs: from the wrist, the arm goes up (+y).
  stick.fromArray(rig.stick).applyQuaternion(bow.rotation);
  handUp.set(0, 1, 0).applyQuaternion(bow.rotation);
  handUp.addScaledVector(stick, -handUp.dot(stick)).normalize();

  aimUp.subVectors(aim, bow.grip);
  const distance = aimUp.length();
  aimUp.addScaledVector(stick, -aimUp.dot(stick));
  const side = aimUp.length();
  if (side < 1e-9) {
    return 0;
  }

  const angle = Math.atan2(stick.dot(normal.crossVectors(handUp, aimUp)), handUp.dot(aimUp));
  const [low, high] = ROLL_RANGE;

  // Near the far side, a small move of the aim turns the roll from one end of the range to the
  // other end, so the roll fades to 0 there.
  const far = MathUtils.clamp((Math.PI - Math.abs(angle)) / FAR_SIDE, 0, 1);
  const limited = MathUtils.clamp(angle, low, high) * (angle > high || angle < low ? far : 1);
  return limited * smoothstep(Math.min(1, side / distance / CLEAR_AIM));
}

/**
 * Places the right hand around a bow. The stick lies in the fingers (design 4.6), so the hand can
 * roll around the stick and keep its grip.
 *
 * @param rig The points of the player.
 * @param bow The bow at its posed place.
 * @param angle The roll of the hand around the stick from the hold of the bind pose, in radians.
 * @param out The hand to write.
 * @returns `out`, with the wrist and the rotation of the hand.
 */
export function gripHand(rig: RigPoints, bow: BowPlace, angle: number, out: BowHand): BowHand {
  stick.fromArray(rig.stick).applyQuaternion(bow.rotation);
  out.rotation.multiplyQuaternions(roll.setFromAxisAngle(stick, angle), bow.rotation);
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

/**
 * Gives the direction of the right elbow: to the back of the hand, so that the forearm comes to
 * the wrist from there. A back of the hand along the line from the shoulder to the wrist gives no
 * clear side, so the direction of the hold takes its place, with a smooth change between them.
 *
 * @param rig The points of the player.
 * @param shoulder The posed shoulder joint.
 * @param hand The right hand.
 * @param hold The direction of the hold, in the model axes.
 * @param follow The share of the turn to the back of the hand, from 0 to 1.
 * @param out The vector to write. It must not be `hold`.
 * @returns `out`, with the direction in the model axes.
 */
function elbowPole(
  rig: RigPoints,
  shoulder: Vector3,
  hand: BowHand,
  hold: Vector3,
  follow: number,
  out: Vector3,
): Vector3 {
  armLine.subVectors(hand.wrist, shoulder).normalize();
  out.copy(hold);
  out.addScaledVector(armLine, -out.dot(armLine)).normalize();

  // The point that the elbow takes with a straight wrist, seen from the line of the arm.
  backOfHand
    .set(0, 1, 0)
    .applyQuaternion(hand.rotation)
    .multiplyScalar(rig.forearm)
    .add(hand.wrist)
    .sub(shoulder)
    .normalize();
  backOfHand.addScaledVector(armLine, -backOfHand.dot(armLine));
  const side = backOfHand.length();
  if (side < 1e-9) {
    return out;
  }

  const share = smoothstep(Math.min(1, side / CLEAR_AIM)) * follow;
  return out.multiplyScalar(1 - share).addScaledVector(backOfHand, share / side);
}

/** The places that the bow pose writes. */
export interface BowPlaces {
  /** The instrument. */
  readonly place: InstrumentPlace;
  /** The strings of the instrument. */
  readonly strings: StringsPlace;
  /** The bow on the strings. */
  readonly bow: BowPlace;
  /** The right hand that holds the bow. */
  readonly hand: BowHand;
}

/**
 * Makes the places that the bow pose writes.
 *
 * @returns The place of the instrument, the strings, the bow, and the bow hand.
 */
export function createBowPlaces(): BowPlaces {
  return {
    place: {
      local: new Quaternion(),
      rotation: new Quaternion(),
      pivot: new Vector3(),
      offset: new Vector3(),
    },
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
const restBow: BowPlace = { grip: new Vector3(), rotation: new Quaternion() };
const held: BowPlace = { grip: new Vector3(), rotation: new Quaternion() };
const stickBind = new Vector3();
const pluckPalm = new Vector3();
const bowLocal = new Quaternion();
const backOfHand = new Vector3();
const armLine = new Vector3();
const aim = new Vector3();
const wristR = new Vector3();
const solved = createArmPose();
const poleR = new Vector3();
const chestInverse = new Quaternion();
const poleTuple: [number, number, number] = [0, 0, 0];
/** The number of times that the hand rolls to the elbow and the elbow turns to the hand. */
const ROLL_PASSES = 3;

/**
 * The largest difference between the roll of the hand around a moving bow and the mix of the
 * rolls of the two holds, in radians.
 */
const ROLL_SPREAD = 30 * MathUtils.DEG2RAD;
const pole = new Vector3();
const holdPole = new Vector3();
const tipPole = new Vector3();
const poleL = new Vector3();
const restPole = new Vector3();
const handL: StopHand = { wrist: new Vector3(), rotation: new Quaternion() };

/**
 * Writes the arms and the instrument of a bowed string player (design 5.3, 4.7). The bow plays
 * on the strings at the place of the bow state, on the string of the stroke, and lifts in a rest.
 * Pizzicato moves the right hand over the strings near the end of the fingerboard to pluck. The
 * middle of the left finger block presses the strings at the place of the note on the
 * fingerboard. The two-bone IK places each arm. In the rest pose (design 5.2), the violin and
 * the viola stand on the left thigh, and the left fingers keep the strings. The right hand holds
 * the bow on the right thigh.
 *
 * The right elbow points to the directions of the hold, so that the arms stay out of the body.
 * The right hand rolls around the stick so that the back of the hand points to the elbow. In the
 * middle of a change between the bow and pizzicato, the elbow turns a part of the way to the back
 * of the hand. The `bow` bone turns back by the roll, so that the hair stays on the strings.
 *
 * The caller writes the lean of the hold into the spine before it calculates the frames.
 *
 * @param rig The points of the player.
 * @param frames The posed frames of the root and of the chest.
 * @param state The bow state at the song time of the note layer.
 * @param weight The eased weight of the playing pose: 0 is the rest pose (5.2, 5.5).
 * @param rotations The rotations of the pose to write.
 * @param offset The instrument offset of the pose to write: the move of the violin and the viola
 *   to the lap.
 */
export function poseBowed(
  rig: BowedRig,
  frames: TorsoFrames,
  state: BowState,
  weight: number,
  rotations: Float32Array,
  offset: [number, number, number],
): void {
  const h = BOWED_HANDS;
  const chest = frames.chest;
  const { place, strings, bow, hand: heldHand } = places;
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

  // The right shoulder turns forward while the player plays, and further toward the tip when the
  // bow plays with the tip help.
  const pizzicato = smoothstep(state.pizzicato);
  shoulderTurn(rig, weight, hairShare(rig, state.bow) * (1 - pizzicato), turn);
  const shoulder = poseShoulder(rig.armR, chest, rig.chestBind, turn, shoulderR);

  // In the rest pose, the hand holds the bow on the right thigh.
  restBow.rotation.fromArray(rig.restBow.rotation).premultiply(frames.root.rotation);
  posePoint(frames.root, ORIGIN, rig.restBow.grip, restBow.grip);

  // First the hand keeps the hold of the bind pose, and the elbow the direction of the hold.
  mixRotation(restBow.rotation, bow.rotation, weight, held.rotation);
  held.grip.lerpVectors(restBow.grip, bow.grip, weight);
  gripHand(rig, held, 0, heldHand);
  wristR.lerpVectors(heldHand.wrist, pluckPalm, pizzicato * weight);
  // The right elbow points out to the side in the rest pose. While the player plays, it turns
  // from the direction of the frog to the direction of the tip with the place of the bow, and to
  // the direction of pizzicato in a change.
  // Each mix runs only when it changes the direction, to keep the time of a frame.
  const [bowLow, bowHigh] = rig.bowRange;
  const tipShare = MathUtils.clamp((state.bow - bowLow) / (bowHigh - bowLow), 0, 1);
  restPole.fromArray(rig.hold.poleR);
  if (tipShare > 0) {
    mixDirection(restPole, tipPole.fromArray(rig.hold.poleTipR), tipShare, restPole);
  }
  restPole.applyQuaternion(chest.rotation);
  if (weight < 1) {
    mixDirection(
      holdPole.fromArray(rig.restPoleR).applyQuaternion(frames.root.rotation),
      restPole,
      weight,
      holdPole,
    );
  } else {
    holdPole.copy(restPole);
  }
  if (pizzicato * weight > 0) {
    mixDirection(
      holdPole,
      tipPole.fromArray(rig.hold.polePizzicato).applyQuaternion(chest.rotation),
      pizzicato * weight,
      holdPole,
    );
  }
  pole.copy(holdPole);
  aim.copy(
    solveArm(rig.armR.bind, shoulder.position, shoulder.rotation, wristR, pole, solved).elbow,
  );

  // Then the hand rolls so that its back points to the elbow, three times. In the middle of a
  // change, the elbow also turns a part of the way to the back of the hand. Each hold of the bow has its own roll. A change moves the bow, and the
  // roll of the hand stays near the mix of the rolls of the two holds: the roll of the moving bow
  // alone can pass the far side of the stick. The plucking palm is above the strings: the grip of
  // the plucking bow follows the palm.
  let angle = 0;
  const steady = weight === 1 && pizzicato === 0;
  const follow = weight * rig.hold.followChange * Math.sin(Math.PI * pizzicato);
  for (let pass = 0; pass < ROLL_PASSES; pass++) {
    const bowRoll = rollToward(rig, bow, aim);
    if (steady) {
      // The bow plays: the hand holds it with its own roll.
      angle = bowRoll;
      gripHand(rig, bow, angle, heldHand);
    } else {
      let pluckRoll = 0;
      if (pizzicato > 0) {
        pluckRoll = rollToward(rig, pluckBow, aim);
        gripHand(rig, pluckBow, pluckRoll, pluckHand);
        pluckHand.wrist
          .copy(pluckPalm)
          .sub(palmOffset.fromArray(rig.armR.palm).applyQuaternion(pluckHand.rotation));
        pluckBow.grip.fromArray(rig.grip).applyQuaternion(pluckHand.rotation).add(pluckHand.wrist);
      }
      const playRoll = bowRoll + (pluckRoll - bowRoll) * pizzicato;

      // A change to pizzicato turns the hand in its own axes, and the bow turns in the hand.
      gripHand(rig, bow, bowRoll, heldHand);
      if (pizzicato > 0) {
        mixRotation(heldHand.rotation, pluckHand.rotation, pizzicato, heldHand.rotation);
        heldHand.wrist.lerpVectors(heldHand.wrist, pluckHand.wrist, pizzicato);
      }
      held.rotation
        .copy(heldHand.rotation)
        .multiply(bowLocal.setFromAxisAngle(stickBind.fromArray(rig.stick), -playRoll));
      held.grip.fromArray(rig.grip).applyQuaternion(heldHand.rotation).add(heldHand.wrist);
      const restRoll = weight < 1 ? rollToward(rig, restBow, aim) : 0;
      mixRotation(restBow.rotation, held.rotation, weight, held.rotation);
      held.grip.lerpVectors(restBow.grip, held.grip, weight);
      const mixed = restRoll + (playRoll - restRoll) * weight;
      const own = rollToward(rig, held, aim);
      angle = MathUtils.clamp(own, mixed - ROLL_SPREAD, mixed + ROLL_SPREAD);
      gripHand(rig, held, angle, heldHand);
    }
    if (follow > 0) {
      elbowPole(rig, shoulder.position, heldHand, holdPole, follow, pole);
    }
    aim.copy(
      solveArm(rig.armR.bind, shoulder.position, shoulder.rotation, heldHand.wrist, pole, solved)
        .elbow,
    );
  }

  poleR.copy(pole).applyQuaternion(chestInverse.copy(chest.rotation).invert()).toArray(poleTuple);
  writeArm(
    { arm: rig.armR, shoulder, wrist: heldHand.wrist, hand: heldHand.rotation, pole: poleTuple },
    chest.rotation,
    rotations,
  );

  // The bow turns back in the hand by the roll, so that its hair keeps its side.
  setBoneRotation(
    rotations,
    BONES.bow,
    bowLocal.setFromAxisAngle(stickBind.fromArray(rig.stick), -angle),
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
      pole: mixDirection(
        poleL.fromArray(rig.restPoleL),
        holdPole.fromArray(rig.hold.poleL),
        weight,
        poleL,
      ).toArray(poleTuple),
    },
    chest.rotation,
    rotations,
  );

  setBoneRotation(rotations, rig.armR.bones.shoulder, turn);
  setBoneRotation(rotations, BONES.instrument, place.local);
  place.offset.toArray(offset);
  writeCurl(rig.armL, (h.curlL + h.pressL * state.press * state.gesture) * weight, rotations);
  writeCurl(rig.armR, h.curlR, rotations);
}
