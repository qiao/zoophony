import { MathUtils, Quaternion, Vector3 } from 'three';

import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import { harpStringPosition } from '../models/instruments/harp.ts';
import { placePoint } from '../models/instruments/hold.ts';
import type { PlacedPiece } from '../models/instruments/hold.ts';
import { pianoKeyPosition } from '../models/instruments/piano.ts';
import { IDENTITY, toVec3 } from '../models/tuples.ts';
import type { Vec3 } from '../models/tuples.ts';
import type { PlayerNote } from '../score/types.ts';
import { mixRotation } from './blend.ts';
import type { InstrumentOf } from './family.ts';
import { createFrame, setFromBasis } from './frames.ts';
import type { Frame, TorsoFrames } from './frames.ts';
import { HAND_MOTION, buildHandTrack, splitHands } from './hand-notes.ts';
import type { HandAction, HandState, HandTrack } from './hand-notes.ts';
import { armRig, hangingWrist, limitReach, poseShoulder, writeArm, writeCurl } from './ik.ts';
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
  /** The directions to which the elbows point. */
  readonly poleL: Vec3;
  readonly poleR: Vec3;
  /** The curl of the fingers on the keys or the strings, and after a pluck. */
  readonly curl: number;
  readonly curlClosed: number;
}

/** The holds of the piano and the harp. */
export const HANDS_HOLDS = {
  // The palm is above the front edge of a white key, and 0.04 m above the keys. Thus the short
  // arms of the animals reach further, and the fingers curl down onto the keys.
  piano: {
    action: 'strike',
    keyPoint: pianoKeyPosition,
    palmL: [0, 0.04, 0.04],
    palmR: [0, 0.04, 0.04],
    faceL: [0, -1, 0],
    faceR: [0, -1, 0],
    lean: 0,
    poleL: [-1, -0.6, 0.4],
    poleR: [1, -0.6, 0.4],
    curl: 30 * MathUtils.DEG2RAD,
    curlClosed: 30 * MathUtils.DEG2RAD,
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
    poleL: [-1, -1, 0.3],
    poleR: [1, -1, 0.3],
    curl: 15 * MathUtils.DEG2RAD,
    curlClosed: 60 * MathUtils.DEG2RAD,
  },
} as const satisfies Readonly<Record<HandsInstrument, HandsHold>>;

const BONES = {
  instrument: boneIndex('instrument'),
  root: boneIndex('root'),
} as const;

/** One hand of a piano or harp player in the bind pose. */
export interface HandSide {
  readonly arm: ArmRig;
  /** The side of the palm, in the model axes. */
  readonly face: Vec3;
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
  return {
    hold,
    chestBind: positions[boneIndex('chest')] ?? [0, 0, 0],
    pieces: model.pieces,
    left: { arm: armRig(model, 'L'), face: faceOf(hold.faceL) },
    right: { arm: armRig(model, 'R'), face: faceOf(hold.faceR) },
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
  const [left, right] = splitHands(notes, loudness);
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
const hanging = new Vector3();

/**
 * Writes one arm and its fingers on the keys or the strings.
 *
 * @param rig The points of the player.
 * @param side The side of the body.
 * @param hand The state of the hand.
 * @param pole The direction to which the elbow points.
 * @param chest The posed frame of the chest.
 * @param weight The eased weight of the playing pose.
 * @param rotations The rotations of the pose to write.
 */
function poseHand(
  rig: HandsRig,
  side: HandSide,
  hand: HandState,
  pole: Vec3,
  chest: Frame,
  weight: number,
  rotations: Float32Array,
): void {
  const { hold } = rig;
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
  hangingWrist(arm, shoulder, hanging);
  writeArm(
    {
      arm,
      shoulder,
      wrist: wrist.lerpVectors(hanging, wrist, weight),
      hand: mixRotation(shoulder.rotation, turn, weight, turn),
      pole,
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
 * away from the shoulder. In the rest pose, the arms hang.
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
  const chest = frames.chest;
  poseHand(rig, rig.left, state.left, hold.poleL, chest, weight, rotations);
  poseHand(rig, rig.right, state.right, hold.poleR, chest, weight, rotations);
}
