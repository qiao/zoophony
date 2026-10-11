import { MathUtils, Quaternion, Vector3 } from 'three';

import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import { placePoint } from '../models/instruments/hold.ts';
import { toVec3 } from '../models/tuples.ts';
import type { Vec3 } from '../models/tuples.ts';
import { mixDirection, mixRotation } from './blend.ts';
import type { BatonState } from './conductor-notes.ts';
import type { CueState } from './cues.ts';
import type { LeftHandState } from './conductor-left.ts';
import { createFrame, setFromBasis } from './frames.ts';
import type { Frame, TorsoFrames } from './frames.ts';
import { hangingArm, hangingHand, hangingWrist } from './hang.ts';
import type { HangingArm } from './hang.ts';
import { armRig, handToward, limitReach, poseShoulder, writeArm, writeCurl } from './ik.ts';
import type { ArmRig } from './ik.ts';

/**
 * The hold of the baton and of the left hand of the conductor (design 5.4). The places are in
 * head heights `H` of the parametric bear (0.513 m), in the model axes of the bind pose: the bear
 * faces -z, and its left is -x. The values of the history below are in the same `H`.
 * `CUE_MOTION` of `cues.ts` gives the directions of a cue.
 */
export const CONDUCTOR_HOLD = {
  /**
   * The point of the tip of the baton at beat 1 of each pattern, from the right shoulder joint.
   * With the pivot, it puts the wrist about 0.19 H up, 0.91 H forward, and 0.44 H out: in front
   * of the chin, as the paws of `bear-views.png`, and beside the head from behind, as in
   * `mockup.png`. The first point, 0.9 H up and 1.2 H forward, kept the hand next to the head (UX
   * audit 2026-10-05, AM1). The second point, 0.45 H up and 1.3 H forward with the pivot 0.3 H
   * forward, kept the wrist at the pivot in front of the mouth. From behind, the bear seemed to
   * hold its head (review of 2026-10-07). With the wrist 0.4 H out, beat 2 of a pattern of 4 took
   * the paw over the head in the view from behind.
   */
  beatPoint: [0.16, 0.89, -1.56],
  /**
   * The baton points from this place to its tip, from the right shoulder joint: up 49° and a little
   * inward at beat 1, and nearly upright in the ready gesture, as in `bear-views.png`. The pivot is
   * 0.91 H behind the wrist, so that the wrist follows about half of the motion of the tip in the
   * beat plane, and the arm beats with the baton.
   */
  batonPivot: [0.63, -0.54, -0.41],
  /**
   * The beat plane turns this part of the turn of the upper body to a cued section. Thus the arm
   * opens to the right in a turn to the left, and the hand stays beside the head from behind. With
   * the full turn of 30° to the left, the right hand went behind the head.
   */
  beatTurn: 0.5,
  /**
   * The left elbow points down, a little out, and a little forward, so that it is below the
   * shoulder and further in than the paw, and the forearm leans out to the paw, as in
   * `bear-views.png` and in the view from behind of `mockup.png`. An elbow level with the shoulder
   * held the upper arm out to the side, and an elbow further out (0.7) put the arms 0.09 H outside
   * the arms of the sheet.
   */
  poleL: [-0.4, -1, -0.4],
  /** The right elbow points as the left elbow, mirrored. */
  poleR: [0.4, -1, -0.4],
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
   * The curl of the fingers of the left hand in the ready gesture: a loose fist, as the paws of
   * `bear-views.png`. With the open hand of a cue, the claws pointed up.
   */
  readyCurl: 50 * MathUtils.DEG2RAD,
  /**
   * In the ready gesture of a count-in, the left hand points this far up, so that both paws are
   * up at the height of the chin, as in `bear-views.png` (design 5.4). At 40°, the left paw was
   * 0.5 H higher than the right paw.
   */
  readyLift: 21 * MathUtils.DEG2RAD,
  /**
   * In the ready gesture, the left wrist is this part of the reach of the arm from the shoulder
   * joint, so that the left paw is as far forward as the right paw, and the side view shows one
   * paw, as the sheet does. With the reach of a cue (0.85), the left paw was 0.25 H further
   * forward than the right paw, and it showed in front of the muzzle in the side view.
   */
  readyReach: 0.75,
  /**
   * In the ready gesture, the left hand points this far outward, to the left of the front, so
   * that the two paws are at the same width, as in `bear-views.png`, and the paw shows beside the
   * head from behind. At 10° inward, the forearm of option B came 0.8 cm from the head.
   */
  readyOut: 32 * MathUtils.DEG2RAD,
} as const;

/** One place of the left hand between its cues (design 5.4). */
export interface LeftHandPlace {
  /** The wrist, from the left shoulder joint, in head heights `H`, in the model axes. */
  readonly wrist: Vec3;
  /** The direction of the fingers, in the model axes. */
  readonly fingers: Vec3;
  /** The curl of the fingers. */
  readonly curl: number;
}

/**
 * The places of the left hand between its cues (design 5.4). `conductor-left.ts` gives the weight
 * of each place from the score. The bear faces -z, and its left is -x.
 */
export const LEFT_HAND_PLACES = {
  /**
   * The quiet hand: raised and ready above the left shoulder, beside the head from behind, as in
   * `mockup.png` and `scene.png` (02, 05), and a little lower than the paw of the ready gesture.
   * The hand that hung at the side moved too little (user report of 2026-10-06). In front of the
   * left of the chest, it seemed to hold the head (review of 2026-10-07).
   */
  quiet: { wrist: [-0.5, 0.28, -0.81], fingers: [0.2, -0.1, -1], curl: 25 * MathUtils.DEG2RAD },
  /** The mirror of the beat in a loud passage: the wrist at beat 1, above the shoulder. */
  mirror: { wrist: [-0.5, 0.41, -0.72], fingers: [0.1, 0, -1], curl: 15 * MathUtils.DEG2RAD },
  /** The raised hand of a crescendo, open and up. */
  swell: { wrist: [-0.44, 0.88, -0.78], fingers: [0, 0.6, -1], curl: 5 * MathUtils.DEG2RAD },
  /**
   * The lowered hand of a diminuendo, open and down, out at the left at the height of the
   * shoulder.
   */
  fade: { wrist: [-0.59, 0.06, -0.78], fingers: [0, -0.6, -1], curl: 5 * MathUtils.DEG2RAD },
  /** The held palm of a held chord, out to the players above the shoulder. */
  hold: { wrist: [-0.44, 0.53, -1.0], fingers: [0, 0.3, -1], curl: 5 * MathUtils.DEG2RAD },
} as const satisfies Readonly<Record<string, LeftHandPlace>>;

/**
 * The left hand moves this part of the motion of the tip of the baton when it mirrors the beat:
 * the part that the right wrist follows.
 */
export const MIRROR_SCALE = 0.45;

/** The curl of the closed left hand of a cut-off. */
export const CLOSE_CURL = 80 * MathUtils.DEG2RAD;

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
  /** The left arm in the rest pose and in the bow at the song end (design 5.2). */
  readonly hangL: HangingArm;
  /** The right arm in the rest pose. */
  readonly hangR: HangingArm;
  /** The tip of the baton in the bind pose. */
  readonly tip: Vec3;
  /** The point of beat 1 of a pattern, and the pivot of the baton, in the model axes. */
  readonly beatPoint: Vec3;
  readonly pivot: Vec3;
  /**
   * The unit axis of the beat plane to the right, in the model axes: level. The plane is square to
   * the baton at beat 1, so that the tip moves around the pivot and the wrist follows a part of
   * its motion.
   */
  readonly beatRight: Vec3;
  /** The unit axis of the beat plane up, in the model axes: up and back, square to the baton. */
  readonly beatUp: Vec3;
  /** The head height `H` of the bear: the unit of the places of the hands. */
  readonly headHeight: number;
}

/**
 * Calculates a place of the hold from the right shoulder joint, in the model axes.
 *
 * @param right The right arm of the bear.
 * @param h The head height `H` of the bear.
 * @param place The place, in `H`, from the shoulder joint.
 * @returns The point in the model axes.
 */
function fromRightShoulder(right: ArmRig, h: number, place: Vec3): Vec3 {
  return toVec3(new Vector3(...place).multiplyScalar(h).add(new Vector3(...right.bind.shoulder)));
}

/**
 * Finds the point of the tip of the baton at beat 1, in the model axes. The shots need only this
 * point of the rig, and the hanging arms of {@link conductorRig} cost more than the rest of it.
 *
 * @param model The bear with the baton.
 * @returns The point.
 */
export function conductorBeatPoint(model: PlayerModel): Vec3 {
  return fromRightShoulder(armRig(model, 'R'), model.body.headHeight, CONDUCTOR_HOLD.beatPoint);
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
  const left = armRig(model, 'L');
  const h = model.body.headHeight;
  const beatPoint = fromRightShoulder(right, h, CONDUCTOR_HOLD.beatPoint);
  const pivot = fromRightShoulder(right, h, CONDUCTOR_HOLD.batonPivot);

  const baton = new Vector3(...beatPoint).sub(new Vector3(...pivot)).normalize();
  const beatRight = new Vector3().crossVectors(baton, Y_AXIS).normalize();
  const beatUp = new Vector3().crossVectors(beatRight, baton);

  return {
    chestBind: model.skeleton.positions[boneIndex('chest')] ?? [0, 0, 0],
    spineBind: model.skeleton.positions[boneIndex('spine')] ?? [0, 0, 0],
    left,
    right,
    hangL: hangingArm(model, left),
    hangR: hangingArm(model, right),
    tip: placePoint(model.pieces, { bone: tip.bone, at: tip.from }),
    beatPoint,
    pivot,
    beatRight: toVec3(beatRight),
    beatUp: toVec3(beatUp),
    headHeight: h,
  };
}

/** The motion of the conductor at one time. */
export interface ConductorState {
  /** The point of the tip of the baton in the beat plane. */
  readonly baton: BatonState;
  /**
   * The cue motion, with the turns already scaled by the weight of the playing pose. The beat
   * plane turns by half of the turn of the upper body.
   */
  readonly cue: CueState;
  /** The weight of the ready gesture of the left hand in a count-in, from 0 to 1. */
  ready: number;
  /** The weights of the places of the left hand between its cues. */
  readonly left: LeftHandState;
  /**
   * The part of the bow at the song end that has started, from 0 to 1. The left hand comes down
   * to the side by this weight, so that the head does not bow into it.
   */
  bow: number;
}

/** The rotation that changes nothing. Nothing writes it. */
const NO_TURN = new Quaternion();

const right = createFrame();
const left = createFrame();
const tip = new Vector3();
const lifted: BatonState = { x: 0, y: 0 };
const along = new Vector3();
const top = new Vector3();
const offset = new Vector3();
const wristBind = new Vector3();
const wrist = new Vector3();
const hand = new Quaternion();
const liftTurn = new Quaternion();
const hanging = new Vector3();
const restHand = new Quaternion();
const poleMix = new Vector3();
const polePlay = new Vector3();
const poleTuple: [number, number, number] = [0, 0, 0];
const direction = new Vector3();
const toCue = new Vector3();
const pivot = new Vector3();
const place = new Vector3();
const fingers = new Vector3();
const toPlace = new Vector3();
const Y_AXIS = new Vector3(0, 1, 0);

/** The direction of the baton in the middle of a lift or a lowering of the arms. */
const LIFT_BATON = new Vector3(...CONDUCTOR_HOLD.liftBaton).normalize();

/** The direction of the left hand in the ready gesture: up and a little outward. */
const READY_DIRECTION = new Vector3(
  -Math.sin(CONDUCTOR_HOLD.readyOut) * Math.cos(CONDUCTOR_HOLD.readyLift),
  Math.sin(CONDUCTOR_HOLD.readyLift),
  -Math.cos(CONDUCTOR_HOLD.readyOut) * Math.cos(CONDUCTOR_HOLD.readyLift),
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
 * plus the point in the beat plane. The beat plane turns by {@link CONDUCTOR_HOLD.beatTurn} of the
 * turn of the upper body toward a cued section.
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
  out
    .fromArray(rig.beatPoint)
    .addScaledVector(offset.fromArray(rig.beatRight), baton.x)
    .addScaledVector(offset.fromArray(rig.beatUp), baton.y);
  return turnWithTorso(rig, out, CONDUCTOR_HOLD.beatTurn * torsoYaw);
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
 * Mixes the direction of the elbow of the hanging arm with the direction of the hold.
 *
 * @param hang The hanging arm.
 * @param pole The direction of the hold, in the axes of the chest.
 * @param weight The weight of the hold.
 * @returns The mixed unit direction, in a module tuple that the next call writes again.
 */
function mixPole(hang: HangingArm, pole: Vec3, weight: number): Vec3 {
  mixDirection(poleMix.fromArray(hang.pole), polePlay.fromArray(pole), weight, poleMix);
  return poleMix.toArray(poleTuple);
}

/**
 * Writes the arms and the fingers of the conductor (design 5.4, 4.7). The right hand moves the tip
 * of the baton to its point in the beat plane, and the two-bone IK places the arm. The beat plane
 * turns by half of the turn of the upper body. The left hand shows the dynamics and the held chords between its
 * cues, points to a cued section, and points up in the ready gesture of a count-in
 * ({@link poseLeftHand}). In the rest pose, the arms hang a little out to the sides, clear of the
 * body (design 5.2).
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
  lifted.x = state.baton.x;
  lifted.y = state.baton.y + cue.batonLift;
  batonPoint(rig, lifted, cue.torsoYaw, tip);
  turnWithTorso(rig, pivot.fromArray(rig.pivot), hold.beatTurn * cue.torsoYaw);
  batonHand(rig, tip, pivot);
  hangingWrist(rig.hangR, right, hanging);
  limitReach(rig.right, right.position, wrist);
  mixRotation(hangingHand(rig.hangR, right, restHand), hand, weight, hand);
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
      pole: mixPole(rig.hangR, hold.poleR, weight),
    },
    chest.rotation,
    rotations,
  );
  writeCurl(rig.right, hold.batonCurl * weight, rotations);

  poseLeftHand(rig, chest, state, weight, rotations);
}

/**
 * Writes the wrist and the fingers of a place of the left hand: the module vectors `place` and
 * `fingers`, in the model axes.
 *
 * @param rig The points of the conductor.
 * @param of The place.
 * @param torsoYaw The turn of the place around the `spine` bone, positive to the left.
 * @param baton The motion of the baton to mirror, in meters, or `null` for no motion.
 */
function placeOf(
  rig: ConductorRig,
  of: LeftHandPlace,
  torsoYaw: number,
  baton: BatonState | null,
): void {
  place.fromArray(of.wrist).multiplyScalar(rig.headHeight);
  if (baton) {
    place.x -= MIRROR_SCALE * baton.x;
    place.y += MIRROR_SCALE * baton.y;
  }
  turnWithTorso(rig, place.add(toPlace.fromArray(rig.left.bind.shoulder)), torsoYaw);
  fingers.fromArray(of.fingers).normalize().applyAxisAngle(Y_AXIS, torsoYaw);
}

/**
 * Writes the left arm and its fingers (design 5.4). Between its cues, the hand rests at the quiet
 * place, mirrors the beat in a loud passage, rises in a crescendo, comes down in a diminuendo,
 * and holds the palm out on a held chord, by the weights from the score. A cue and the ready
 * gesture of a count-in win over these places by their weights. In the rest pose and in the bow
 * at the song end, the arm hangs.
 *
 * @param rig The points of the conductor.
 * @param chest The posed frame of the chest.
 * @param state The motion at the song time.
 * @param weight The eased weight of the playing pose: 0 is the rest pose (5.2).
 * @param rotations The rotations of the pose to write.
 */
function poseLeftHand(
  rig: ConductorRig,
  chest: Frame,
  state: ConductorState,
  weight: number,
  rotations: Float32Array,
): void {
  const { cue, left: weights } = state;
  const places = LEFT_HAND_PLACES;
  poseShoulder(rig.left, chest, rig.chestBind, NO_TURN, left);
  // The places turn with the upper body to the left. In a turn to the right, they stay, so that
  // the hand does not come over the desk of the stand.
  const turn = Math.max(0, cue.torsoYaw);
  placeOf(rig, places.quiet, turn, null);
  wrist.copy(place);
  direction.copy(fingers);
  let curl: number = places.quiet.curl;
  const steps = [
    [places.mirror, weights.mirror],
    [places.swell, weights.swell],
    [places.fade, weights.fade],
    [places.hold, weights.hold],
  ] as const;
  for (const [of, w] of steps) {
    if (w > 0) {
      placeOf(rig, of, turn, of === places.mirror ? state.baton : null);
      wrist.lerp(place, w);
      direction.lerp(fingers, w);
      curl += (of.curl - curl) * w;
    }
  }
  curl += (CLOSE_CURL - curl) * weights.close;

  // The cue and the ready gesture point the arm from the shoulder joint.
  const ready = state.ready * (1 - cue.hand);
  const lift = Math.max(cue.hand, state.ready);
  if (lift > 0) {
    toCue.copy(READY_DIRECTION).multiplyScalar(ready);
    if (cue.hand > 0) {
      toCue.addScaledVector(directionOf(cue.handYaw, cue.handLift, fingers), cue.hand);
    }
    toCue.normalize();
    const reach =
      (ready * CONDUCTOR_HOLD.readyReach + cue.hand * cue.handReach) / (ready + cue.hand);
    place.copy(left.position).addScaledVector(toCue, reach * rig.left.reach);
    wrist.lerp(place, lift);
    direction.lerp(toCue, lift);
    const liftCurl =
      (ready * CONDUCTOR_HOLD.readyCurl + cue.hand * CONDUCTOR_HOLD.cueCurl) / (ready + cue.hand);
    curl += (liftCurl - curl) * lift;
  }
  limitReach(rig.left, left.position, wrist);
  handToward(left, place.copy(left.position).add(direction.normalize()), hand);
  const up = weight * (1 - state.bow);
  hangingWrist(rig.hangL, left, hanging);
  writeArm(
    {
      arm: rig.left,
      shoulder: left,
      wrist: wrist.lerpVectors(hanging, wrist, up),
      hand: mixRotation(hangingHand(rig.hangL, left, restHand), hand, up, hand),
      pole: mixPole(rig.hangL, CONDUCTOR_HOLD.poleL, up),
    },
    chest.rotation,
    rotations,
  );
  writeCurl(rig.left, curl * up, rotations);
}
