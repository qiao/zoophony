import { MathUtils, Quaternion, Vector3 } from 'three';

import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import { harpStringPosition } from '../models/instruments/harp.ts';
import { placePoint } from '../models/instruments/hold.ts';
import type { PlacedPiece } from '../models/instruments/hold.ts';
import { pianoKeyPosition } from '../models/instruments/piano.ts';
import { IDENTITY, toQuat, toVec3 } from '../models/tuples.ts';
import type { Quat, Vec3 } from '../models/tuples.ts';
import type { PlayerNote } from '../score/types.ts';
import { mixDirection, mixRotation } from './blend.ts';
import type { InstrumentOf } from './family.ts';
import { createFrame, posePoint, setFromBasis } from './frames.ts';
import type { TorsoFrames } from './frames.ts';
import { HAND_MOTION, NO_REACH_LIMIT, buildHandTrack, splitHands } from './hand-notes.ts';
import type { HandAction, HandReach, HandState, HandTrack } from './hand-notes.ts';
import { armRig, limitReach, poseShoulder, writeArm, writeCurl } from './ik.ts';
import { lapPoint } from './lap.ts';
import type { LapPlace } from './lap.ts';
import type { ArmRig } from './ik.ts';

/** The instruments that the two hands play on keys or strings: the piano and the harp. */
export type HandsInstrument = InstrumentOf<'keyboard' | 'harp'>;

/**
 * The values of the hold of the piano and the harp (design 5.3). The directions are in the model
 * axes of the bind pose: the player faces -z, and its left is -x.
 */
export interface HandsHold {
  readonly action: HandAction;
  /** Gives the point of a key on the instrument, in the axes of the instrument piece. */
  readonly keyPoint: (key: number) => Vec3;
  /** The palm of each hand is this far from the point of its key, in the instrument axes. */
  readonly palmL: Vec3;
  readonly palmR: Vec3;
  /**
   * The side of the palm of each hand: down to the keys of the piano, and to the strings of the
   * harp. In the axes of the instrument piece.
   */
  readonly faceL: Vec3;
  readonly faceR: Vec3;
  /** The forward lean of the spine in the playing pose. */
  readonly lean: number;
  /** The keys that each hand reaches on the side of the other hand. */
  readonly reach: HandReach;
  /** The directions to which the elbows point. */
  readonly poleL: Vec3;
  readonly poleR: Vec3;
  /** The curl of the fingers on the keys or the strings, and after a pluck. */
  readonly curl: number;
  readonly curlClosed: number;
  /**
   * The move of each wrist away from the straight line from its rest place to its playing place,
   * at the middle of the change, in head heights: out to the side of the hand, up, and forward. A
   * paw of the round studio polar bear goes around its belly and over the front of the keys.
   */
  readonly restArc: Vec3;
  /** The left hand in the rest pose, on its thigh (design 5.3). */
  readonly restL: RestingHand;
  /** The right hand in the rest pose, on its thigh. */
  readonly restR: RestingHand;
}

/**
 * A hand in the rest pose: on its thigh with the palm down (`lap`), or on a string of the harp, as
 * in the playing pose (`string`).
 */
export type RestingHand =
  | {
      readonly kind: 'lap';
      /** The place of the palm. */
      readonly lap: LapPlace;
      /** The direction of the fingers. It is level. */
      readonly fingers: Vec3;
      /** The direction to which the elbow points, out to the side of the body. */
      readonly pole: Vec3;
    }
  | {
      readonly kind: 'string';
      /** The key of the string. */
      readonly key: number;
      /** The distance of the palm from the strings, in meters, more than in the playing pose. */
      readonly away: number;
      /** The direction to which the elbow points. */
      readonly pole: Vec3;
    };

/** The holds of the piano and the harp. */
export const HANDS_HOLDS = {
  // The palm is above the front edge of a white key, and 0.04 m above the keys. Thus the short
  // arms of the animals reach further, and the fingers curl down onto the keys. The spine leans
  // 16° forward: the clips of the pianist of the studio lean 12° (`lowpoly-studio/roles/
  // pianist/`), and at 12° the left paw of the studio polar bear stopped 4 mm short of A♯0. The
  // paws reach from A0 to C5 with the left paw and from C4 to C8 with the right paw
  // (`pose/hands.test.ts`), so a melody changes paws between them.
  piano: {
    action: 'strike',
    keyPoint: pianoKeyPosition,
    palmL: [0, 0.04, 0.04],
    palmR: [0, 0.04, 0.04],
    faceL: [0, -1, 0],
    faceR: [0, -1, 0],
    lean: 16 * MathUtils.DEG2RAD,
    reach: { leftHighest: 72, rightLowest: 60 },
    poleL: [-1, -0.6, 0.4],
    poleR: [1, -0.6, 0.4],
    curl: 30 * MathUtils.DEG2RAD,
    curlClosed: 30 * MathUtils.DEG2RAD,
    restArc: [0, 0, 0],
    // The palms rest on the knees, 0.25 H to the outer side of the top of the lap, as the paws of
    // the rest clip of the studio. The round belly of the studio polar bear covers its thighs, so
    // at 0.6 of the way to the knee the palms were under the belly. The elbows point down, a
    // little out, and forward.
    restL: {
      kind: 'lap',
      lap: { along: 1, offset: [-0.25, 0.12, 0] },
      fingers: [0, 0, -1],
      pole: [-0.5, -1, -0.5],
    },
    restR: {
      kind: 'lap',
      lap: { along: 1, offset: [0.25, 0.12, 0] },
      fingers: [0, 0, -1],
      pole: [0.5, -1, -0.5],
    },
  },
  // The left hand plays from the left side of the strings and the right hand from the right
  // side (design 4.6). The left hand reaches the bass strings only with a lean of 8°.
  harp: {
    action: 'pluck',
    keyPoint: harpStringPosition,
    palmL: [-0.03, 0, 0],
    palmR: [0.03, 0, 0],
    faceL: [1, 0, 0],
    faceR: [-1, 0, 0],
    lean: 8 * MathUtils.DEG2RAD,
    reach: NO_REACH_LIMIT,
    poleL: [-1, -1, 0.3],
    poleR: [1, -1, 0.3],
    curl: 15 * MathUtils.DEG2RAD,
    curlClosed: 60 * MathUtils.DEG2RAD,
    restArc: [0, 0, 0],
    // The left palm rests at 0.85 of the way to the knee, 0.13 H above the leg, so that the
    // forearm passes over the thigh. The elbow points down, a little out, and forward. The palm is
    // 0.22 H out: 0.25 H put it 0.201 H from the thinner thigh of 2026-10-11 (limit 0.2 H).
    restL: {
      kind: 'lap',
      lap: { along: 0.85, offset: [-0.22, 0.13, 0] },
      fingers: [0, 0, -1],
      pole: [-0.5, -1, -0.5],
    },
    // The harp stands at the right knee, so the right hand rests on a string. The elbow points
    // down and a little out and back.
    restR: { kind: 'string', key: 60, away: 0.02, pole: [0.3, -1, 0.3] },
  },
} as const satisfies Readonly<Record<HandsInstrument, HandsHold>>;

const BONES = {
  instrument: boneIndex('instrument'),
  root: boneIndex('root'),
} as const;

/** One hand of a piano or harp player in the bind pose. */
export interface HandSide {
  /** The arm of the side. */
  readonly arm: ArmRig;
  /** The side of the palm, in the model axes. */
  readonly face: Vec3;
  /** The hand in the rest pose, on the top of its thigh (design 5.3). */
  readonly rest: {
    /** The place of the `hand` bone, in the model axes. */
    readonly wrist: Vec3;
    /** The world rotation of the `hand` bone. */
    readonly rotation: Quat;
    /** The direction to which the elbow points. */
    readonly pole: Vec3;
    /**
     * The move of the wrist away from the straight line to the playing place, at the middle of the
     * change, in meters in the model axes ({@link HandsHold.restArc}).
     */
    readonly arc: Vec3;
  };
}

/**
 * Gives a hand that rests on the top of its thigh: the palm faces down, and the fingers are level.
 *
 * @param model The player model.
 * @param arm The arm.
 * @param rest The place of the palm and the direction of the fingers.
 * @returns The place and the world rotation of the `hand` bone.
 */
function restingHand(
  model: PlayerModel,
  hold: HandsHold,
  arm: ArmRig,
  face: Vec3,
  rest: RestingHand,
): Omit<HandSide['rest'], 'arc'> {
  if (rest.kind === 'string') {
    // The hand rests on its string as it plays: the fingers point from the shoulder to the palm.
    const offset = arm.side === 'L' ? hold.palmL : hold.palmR;
    const at = new Vector3(...hold.keyPoint(rest.key)).add(new Vector3(...offset));
    const side = new Vector3(...face);
    const palm = new Vector3(...placePoint(model.pieces, { bone: 'instrument', at: toVec3(at) }));
    palm.addScaledVector(side, -rest.away);
    const fingers = palm.clone().sub(new Vector3(...arm.bind.shoulder));
    fingers.addScaledVector(side, -fingers.dot(side)).normalize().negate();
    side.multiplyScalar(arm.side === 'L' ? 1 : -1);
    const rotation = setFromBasis(new Quaternion(), side, fingers);
    return {
      wrist: toVec3(palm.sub(new Vector3(...arm.palm).applyQuaternion(rotation))),
      rotation: toQuat(rotation),
      pole: rest.pole,
    };
  }

  // The bind palm faces the body: +x on the left and -x on the right. The fingers point down.
  const up = arm.side === 'L' ? -1 : 1;
  const back = new Vector3(...rest.fingers).setY(0).normalize().negate();
  const rotation = setFromBasis(new Quaternion(), new Vector3(0, up, 0), back);
  const palm = new Vector3(...lapPoint(model, arm.side, rest.lap));

  return {
    wrist: toVec3(palm.sub(new Vector3(...arm.palm).applyQuaternion(rotation))),
    rotation: toQuat(rotation),
    pole: rest.pole,
  };
}

/** The points of a piano or harp player in the bind pose that the pose needs. */
export interface HandsRig {
  readonly hold: HandsHold;
  readonly chestBind: Vec3;
  /** The pieces of the instrument at their places in the bind pose. */
  readonly pieces: readonly PlacedPiece[];
  readonly left: HandSide;
  readonly right: HandSide;
}

/**
 * Finds the points of a piano or harp player that the pose needs.
 *
 * @param model A player with a piano or a harp.
 * @param instrument The instrument of the model.
 * @returns The rig.
 * @throws Error if the instrument does not stand on the floor.
 */
export function handsRig(model: PlayerModel, instrument: HandsInstrument): HandsRig {
  const { positions, parents } = model.skeleton;
  if (parents[BONES.instrument] !== BONES.root) {
    throw new Error(`The ${instrument} does not stand on the floor.`);
  }
  const hold = HANDS_HOLDS[instrument];
  const main = model.pieces.find((p) => p.piece.bone === 'instrument');
  const turn = new Quaternion(...(main?.at.rotation ?? IDENTITY));
  const faceOf = (face: Vec3): Vec3 =>
    toVec3(new Vector3(...face).applyQuaternion(turn).normalize());
  const side = (s: 'L' | 'R', face: Vec3, rest: RestingHand): HandSide => {
    const arm = armRig(model, s);
    const turned = faceOf(face);
    const h = model.body.headHeight;
    const [out, up, forward] = hold.restArc;
    const arc: Vec3 = [(s === 'L' ? -out : out) * h, up * h, -forward * h];
    return { arm, face: turned, rest: { ...restingHand(model, hold, arm, turned, rest), arc } };
  };

  return {
    hold,
    chestBind: positions[boneIndex('chest')] ?? [0, 0, 0],
    pieces: model.pieces,
    left: side('L', hold.faceL, hold.restL),
    right: side('R', hold.faceR, hold.restR),
  };
}

/**
 * Gives the place of a palm for the keys of a note, in the model axes: the middle of its lowest
 * and its highest key, with the offset of the palm.
 *
 * @param rig The points of the player.
 * @param side The hand.
 * @param low The lowest key.
 * @param high The highest key.
 * @returns The place of the palm.
 */
export function palmPoint(rig: HandsRig, side: 'L' | 'R', low: number, high: number): Vec3 {
  const { keyPoint } = rig.hold;
  const offset = side === 'L' ? rig.hold.palmL : rig.hold.palmR;
  const at = new Vector3(...keyPoint(low))
    .add(new Vector3(...keyPoint(high)))
    .multiplyScalar(0.5)
    .add(new Vector3(...offset));
  return placePoint(rig.pieces, { bone: 'instrument', at: toVec3(at) });
}

/** The note data of the two hands. */
export interface HandTracks {
  readonly left: HandTrack;
  readonly right: HandTrack;
}

/**
 * Calculates the note data of the two hands of a piano or harp player (design 5.3).
 *
 * @param rig The points of the player.
 * @param notes The notes of the player, sorted by start.
 * @param loudness The loudness of each note, in the order of `notes`.
 * @param amplitude The seeded amplitude of the player.
 * @returns The note data of each hand.
 */
export function handTracks(
  rig: HandsRig,
  notes: readonly PlayerNote[],
  loudness: readonly number[],
  amplitude: number,
): HandTracks {
  const [left, right] = splitHands(notes, loudness, rig.hold.reach);
  const [firstL, firstR] = HAND_MOTION.startKeys;
  const { action } = rig.hold;
  return {
    left: buildHandTrack(left, action, (l, h) => palmPoint(rig, 'L', l, h), amplitude, firstL),
    right: buildHandTrack(right, action, (l, h) => palmPoint(rig, 'R', l, h), amplitude, firstR),
  };
}

/** The motion of the two hands at one time. */
export interface HandsState {
  readonly left: HandState;
  readonly right: HandState;
}

/** The rotation that changes nothing. Nothing writes it. */
const NO_TURN = new Quaternion();

const shoulder = createFrame();
const face = new Vector3();
const palm = new Vector3();
const fingers = new Vector3();
const palmSide = new Vector3();
const turn = new Quaternion();
const wrist = new Vector3();
const restWrist = new Vector3();
const restHand = new Quaternion();
const arcMove = new Vector3();
const poleMix = new Vector3();
const polePlay = new Vector3();
const poleTuple: [number, number, number] = [0, 0, 0];
const ORIGIN = [0, 0, 0] as const;

/**
 * Writes one arm and its fingers on the keys or the strings.
 *
 * @param rig The points of the player.
 * @param side The side of the body.
 * @param hand The state of the hand.
 * @param pole The direction to which the elbow points.
 * @param frames The posed frames of the root and of the chest.
 * @param weight The eased weight of the playing pose.
 * @param rotations The rotations of the pose to write.
 */
function poseHand(
  rig: HandsRig,
  side: HandSide,
  hand: HandState,
  pole: Vec3,
  frames: TorsoFrames,
  weight: number,
  rotations: Float32Array,
): void {
  const { hold } = rig;
  const { chest, root } = frames;
  const { arm } = side;
  poseShoulder(arm, chest, rig.chestBind, NO_TURN, shoulder);
  face.fromArray(side.face);
  // The palm lifts against its face for a strike, and pulls back from it for a pluck.
  palm.fromArray(hand.point).addScaledVector(face, -(hand.lift + hand.pull));
  // The fingers point from the shoulder to the palm, in the plane of the palm.
  fingers.subVectors(palm, shoulder.position);
  fingers.addScaledVector(face, -fingers.dot(face)).normalize().negate();
  // The bind palm side of a hand is +x on the left and -x on the right, to the body.
  palmSide.copy(face).multiplyScalar(arm.side === 'L' ? 1 : -1);
  setFromBasis(turn, palmSide, fingers);
  wrist.fromArray(arm.palm).applyQuaternion(turn);
  limitReach(arm, shoulder.position, wrist.subVectors(palm, wrist));

  // In the rest pose, the hand rests on its thigh, which does not move with the chest.
  posePoint(root, ORIGIN, side.rest.wrist, restWrist);
  restHand.fromArray(side.rest.rotation).premultiply(root.rotation);
  // The elbow points out to the side in the rest pose.
  mixDirection(poleMix.fromArray(side.rest.pole), polePlay.fromArray(pole), weight, poleMix);
  poleMix.toArray(poleTuple);
  writeArm(
    {
      arm,
      shoulder,
      wrist: wrist.lerpVectors(restWrist, wrist, weight).add(
        arcMove
          .fromArray(side.rest.arc)
          .applyQuaternion(root.rotation)
          .multiplyScalar(4 * weight * (1 - weight)),
      ),
      hand: mixRotation(restHand, turn, weight, turn),
      pole: poleTuple,
    },
    chest.rotation,
    rotations,
  );
  writeCurl(arm, (hold.curl + (hold.curlClosed - hold.curl) * hand.closed) * weight, rotations);
}

/**
 * Writes the arms and the fingers of a piano or harp player (design 5.3, 4.7). Each palm goes
 * to the place of its hand state, with the lift of a strike or the pull of a pluck, and the
 * two-bone IK places each arm. The palm faces the keys or the strings, and the fingers point
 * away from the shoulder. In the rest pose, the palms rest on the thighs.
 *
 * The caller writes the lean of the hold into the spine before it calculates the frames.
 *
 * @param rig The points of the player.
 * @param frames The posed frames of the root and of the chest.
 * @param state The motion of the hands at the song time of the note layer.
 * @param weight The eased weight of the playing pose: 0 is the rest pose (5.2, 5.5).
 * @param rotations The rotations of the pose to write.
 */
export function poseHands(
  rig: HandsRig,
  frames: TorsoFrames,
  state: HandsState,
  weight: number,
  rotations: Float32Array,
): void {
  const { hold } = rig;
  poseHand(rig, rig.left, state.left, hold.poleL, frames, weight, rotations);
  poseHand(rig, rig.right, state.right, hold.poleR, frames, weight, rotations);
}
