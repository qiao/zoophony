import { MathUtils, Quaternion, Vector3 } from 'three';

import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import { harpStringPosition } from '../models/instruments/harp.ts';
import { placePoint } from '../models/instruments/hold.ts';
import type { PlacedPiece } from '../models/instruments/hold.ts';
import { pianoKeyFront } from '../models/instruments/piano.ts';
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
import { lapHand } from './lap.ts';
import type { LapHand } from './lap.ts';
import type { ArmRig } from './ik.ts';

/** The instruments that the two hands play on keys or strings: the piano and the harp. */
export type HandsInstrument = InstrumentOf<'keyboard' | 'harp'>;

/**
 * The values of the hold of the piano and the harp (design 5.3). The directions are in the model
 * axes of the bind pose: the player faces -z, and its left is -x.
 */
interface HandsHold {
  readonly action: HandAction;
  /**
   * Gives the point of a key on the instrument, in the axes of the instrument piece, for the scale
   * of the instrument of the species (`SpeciesParams.harpScale`). The piano ignores the scale.
   */
  readonly keyPoint: (key: number, scale: number) => Vec3;
  /** The palm of each hand is this far from the point of its key, in the instrument axes. */
  readonly palmL: Vec3;
  readonly palmR: Vec3;
  /**
   * The side of the palm of each hand: down to the keys of the piano, and to the strings of the
   * harp. In the axes of the instrument piece.
   */
  readonly faceL: Vec3;
  readonly faceR: Vec3;
  /**
   * The direction to which the fingers of each hand point, in the axes of the instrument piece, or
   * `null` for the line from the shoulder to the palm. The fingers lie in the plane of the palm,
   * so the part of the direction along the side of the palm drops out.
   */
  readonly aimL: Vec3 | null;
  readonly aimR: Vec3 | null;
  /** The forward lean of the spine in the playing pose. */
  readonly lean: number;
  /**
   * The forward lean of the spine in the rest pose. The pose mixes it with {@link HandsHold.lean}
   * by the weight of the playing pose.
   */
  readonly restLean: number;
  /**
   * The lift of the head in the rest pose, in radians: the neck and the head pitch up by it. The
   * pose mixes it with no lift by the weight of the playing pose.
   */
  readonly restHeadLift: number;
  /** The keys that each hand reaches on the side of the other hand. */
  readonly reach: HandReach;
  /**
   * The least distance between the middles of the keys of the two hands, in semitones (12
   * semitones are 7 white keys), or 0 for no limit. The other hand moves out of the way of a hand
   * that comes nearer (`splitHands()`).
   */
  readonly apart: number;
  /** The directions to which the elbows point. */
  readonly poleL: Vec3;
  readonly poleR: Vec3;
  /** The curl of the fingers on the keys or the strings, and after a pluck. */
  readonly curl: number;
  readonly curlClosed: number;
  /**
   * The move of each wrist away from the straight line from its rest place to its playing place,
   * at the middle of the change, in head heights: out to the side of the hand, up, and forward. A
   * paw of the round studio polar bear goes up over the front of the keys.
   */
  readonly restArc: Vec3;
  /** The left hand in the rest pose, in the lap (design 5.3). */
  readonly restL: RestingHand;
  /** The right hand in the rest pose, in the lap. */
  readonly restR: RestingHand;
}

/**
 * A hand in the rest pose: in its lap (`lap`), or on a string of the harp, as
 * in the playing pose (`string`).
 */
type RestingHand =
  | (LapHand & {
      readonly kind: 'lap';
      /** The direction to which the elbow points, out to the side of the body. */
      readonly pole: Vec3;
    })
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
  // The paw of the studio polar bear is longer than a white key, so the palm is 0.07 m in front
  // of the front edge of the keys and 0.065 m above them, and the curled claws lie on the keys
  // (`pianoKeyFront()`). Further back, the claws went into the fallboard, and lower, into the
  // key bed. The keys stand far in front of the round belly (`PIANO_FRONT_H`), so that the muzzle
  // keeps 5 cm from the front edge of the open lid. The spine leans 28° forward, so that the paws
  // reach the middle keys. On the level thighs of 2026-10-22, a lean of 27° left a left paw
  // 10.2 mm short of its key (`boulanger-matin.mid`, 107.95 s), and 28° 3.8 mm
  // (`docs/research/2026-10-22-studio-bears.md`). With the palm 0.06 m in front of the keys, a
  // palm stayed 0.41 mm short of its keys, and with 0.05 m, 0.3% of the notes stayed more than
  // 1 mm short. The elbows point out, down, and back: with the poles
  // (±1, -0.55, 0.5), the play folds rose from 14.5% to 29.7% of the samples, mostly on the right
  // upper arm (`docs/research/2026-10-14-polar-fix.md`). The paws reach from A0 to B♭4 with the
  // left paw and from C4 to C8 with the right paw (`pose/hands.test.ts`), so a melody changes
  // paws between them. The wrists go up and a little forward over the case between the lap and
  // the keys (`restArc`): with no arc forward, the claws went 1.6 cm into the belly when the paws
  // lowered. With the paws in the lap, an arc of 0.5 H out stood the upper arms 61° out from the
  // trunk in the lift. With no arc out, they stand out at most as far as in a play.
  piano: {
    action: 'strike',
    keyPoint: pianoKeyFront,
    palmL: [0, 0.065, 0.07],
    palmR: [0, 0.065, 0.07],
    faceL: [0, -1, 0],
    faceR: [0, -1, 0],
    aimL: null,
    aimR: null,
    lean: 28 * MathUtils.DEG2RAD,
    restLean: 8 * MathUtils.DEG2RAD,
    restHeadLift: 8 * MathUtils.DEG2RAD,
    reach: { leftHighest: 70, rightLowest: 60 },
    // The wide paws of the polar bear point in along the forearms, so they went up to 4.7 cm into
    // each other when the palms were nearer than 33 cm, 24 semitones in the middle of the keys.
    // At 24 semitones, they go at most 0.2 cm into each other in the demos, and at 22 up to 1.1 cm
    // (`docs/research/2026-10-21-pirates-clip.md`). At 25 and more, the right paw turned more
    // than 15° further from its accepted grip than on `main` (`pnpm arm-check pianist`).
    apart: 24,
    poleL: [-1, -0.5, 0.5],
    poleR: [1, -0.5, 0.5],
    curl: 30 * MathUtils.DEG2RAD,
    curlClosed: 30 * MathUtils.DEG2RAD,
    restArc: [0, 0.4, 0.1],
    // The rest pose is the rest position of a pianist before a performance: the trunk sits tall
    // with a slight lean toward the piano, the head is up, and the hands rest in the lap
    // (`docs/research/2026-10-13-pianist-lap.md`). The rest lean is the lean of the `ready` clip
    // of the studio (`clip_ready()` of `lowpoly-studio/roles/pianist/clips.py`). The head lifts
    // against it (`restHeadLift`), so the gaze is level and the face shows over the lid. The round
    // belly of the studio polar bear covers its thighs, so the paws rest on the low front of the
    // belly over the thighs, at about the height of the top of the leg above the knee and nearer
    // to the middle line than the knees. The palms face back and down onto the belly, and the
    // fingers point in, toward each other. The elbows hang by the sides, out and a little back.
    // The arms are short, so the forearms and the upper arms lie on the belly, up to 3 cm into
    // it. Higher paws with the elbows forward looked as if the bear held its paws up at the keys
    // (review of 2026-10-13). With the trunk of the studio rest clip, the bear slumped forward over
    // its knees, and the paws hung beside them (user report of 2026-10-13).
    restL: {
      kind: 'lap',
      lap: { along: 1, offset: [0.03, 0.14, -0.5] },
      palm: [0.06, -0.57, 0.79],
      fingers: [1.18, -0.09, -0.92],
      pole: [-1, -1, 0.77],
    },
    restR: {
      kind: 'lap',
      lap: { along: 1, offset: [-0.03, 0.14, -0.5] },
      palm: [-0.06, -0.57, 0.79],
      fingers: [-1.18, -0.09, -0.92],
      pole: [1, -1, 0.77],
    },
  },
  // The left hand plays from the left side of the strings and the right hand from the right
  // side (design 4.6), with the forearms about level, as a real harpist plays (musicmark.org.uk,
  // "A Common Approach", harp, area B). The short arms of the deer set the values
  // (`docs/research/2026-10-21-mesh-deer.md`). The left palm lies 0.14 m above the middle of each
  // string, nearer to the shoulder: at the middle, the left paw missed the far bass strings by up
  // to 5 cm, and with 0.1 m on the deer of 1.2 times the size, by up to 7 mm. The left fingers point up and back along the strings (`aimL`): with the fingers on
  // the line from the shoulder, the left paw bent 86° to 91° on its forearm (paw swing of
  // `pnpm arm-check`, limit 70°). Of 6 elbow directions, the two that point down passed the arm
  // gate (paw bends of 60° and 65°). The left elbow takes the one that points a little out, as a
  // harpist holds the elbows out.
  harp: {
    action: 'pluck',
    keyPoint: harpStringPosition,
    palmL: [-0.03, 0.14, 0],
    palmR: [0.03, 0, 0],
    faceL: [1, 0, 0],
    faceR: [-1, 0, 0],
    aimL: [0, 1, 0.5],
    aimR: null,
    lean: 8 * MathUtils.DEG2RAD,
    restLean: 0,
    restHeadLift: 0,
    reach: NO_REACH_LIMIT,
    apart: 0,
    poleL: [-0.3, -1, 0],
    poleR: [1, -1, 0.3],
    curl: 15 * MathUtils.DEG2RAD,
    curlClosed: 60 * MathUtils.DEG2RAD,
    restArc: [0, 0, 0],
    // Both hands rest on a string, a little away from it, as in the play. A left palm on the left
    // thigh, the rest of before, folded the left shoulder of the deer and flattened its upper arm
    // (flat p5 0.39, limit 0.55), and the lift twisted the upper arm by 170°.
    restL: { kind: 'string', key: 48, away: 0.02, pole: [-0.3, -1, 0.3] },
    restR: { kind: 'string', key: 60, away: 0.02, pole: [0.3, -1, 0.3] },
  },
} as const satisfies Readonly<Record<HandsInstrument, HandsHold>>;

const BONES = {
  instrument: boneIndex('instrument'),
  root: boneIndex('root'),
} as const;

/** One hand of a piano or harp player in the bind pose. */
interface HandSide {
  /** The arm of the side. */
  readonly arm: ArmRig;
  /** The side of the palm, in the model axes. */
  readonly face: Vec3;
  /**
   * The direction of the fingers, in the model axes, or `null` for the line from the shoulder to
   * the palm ({@link HandsHold.aimL}).
   */
  readonly aim: Vec3 | null;
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
 * Gives a hand that rests on its lap: the palm faces the side of the rest hand, and the fingers
 * point in the plane of the palm.
 *
 * @param model The player model.
 * @param hold The hold of the instrument.
 * @param scale The scale of the instrument of the species.
 * @param arm The arm.
 * @param face The side of the palm, in the model axes.
 * @param rest The place of the palm and the direction of the fingers.
 * @returns The place and the world rotation of the `hand` bone.
 */
function restingHand(
  model: PlayerModel,
  hold: HandsHold,
  scale: number,
  arm: ArmRig,
  face: Vec3,
  rest: RestingHand,
): Omit<HandSide['rest'], 'arc'> {
  if (rest.kind === 'string') {
    // The hand rests on its string as it plays: the fingers point from the shoulder to the palm.
    const offset = arm.side === 'L' ? hold.palmL : hold.palmR;
    const at = new Vector3(...hold.keyPoint(rest.key, scale)).add(new Vector3(...offset));
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

  return { ...lapHand(model, arm, rest), pole: rest.pole };
}

/** The points of a piano or harp player in the bind pose that the pose needs. */
export interface HandsRig {
  readonly hold: HandsHold;
  /** The scale of the instrument of the species (`instrumentScale()` of `models/species.ts`). */
  readonly scale: number;
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
 * @param scale The scale of the instrument of the species of the player (`instrumentScale()` of
 *   `models/species.ts`).
 * @returns The rig.
 * @throws Error if the instrument does not stand on the floor.
 */
export function handsRig(model: PlayerModel, instrument: HandsInstrument, scale = 1): HandsRig {
  const { positions, parents } = model.skeleton;
  if (parents[BONES.instrument] !== BONES.root) {
    throw new Error(`The ${instrument} does not stand on the floor.`);
  }
  const hold = HANDS_HOLDS[instrument];
  const main = model.pieces.find((p) => p.piece.bone === 'instrument');
  const turn = new Quaternion(...(main?.at.rotation ?? IDENTITY));
  const faceOf = (face: Vec3): Vec3 =>
    toVec3(new Vector3(...face).applyQuaternion(turn).normalize());
  const side = (s: 'L' | 'R', face: Vec3, aim: Vec3 | null, rest: RestingHand): HandSide => {
    const arm = armRig(model, s);
    const turned = faceOf(face);
    const h = model.body.headHeight;
    const [out, up, forward] = hold.restArc;
    const arc: Vec3 = [(s === 'L' ? -out : out) * h, up * h, -forward * h];
    const resting = restingHand(model, hold, scale, arm, turned, rest);
    return { arm, face: turned, aim: aim && faceOf(aim), rest: { ...resting, arc } };
  };

  return {
    hold,
    scale,
    chestBind: positions[boneIndex('chest')] ?? [0, 0, 0],
    pieces: model.pieces,
    left: side('L', hold.faceL, hold.aimL, hold.restL),
    right: side('R', hold.faceR, hold.aimR, hold.restR),
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
function palmPoint(rig: HandsRig, side: 'L' | 'R', low: number, high: number): Vec3 {
  const { keyPoint } = rig.hold;
  const offset = side === 'L' ? rig.hold.palmL : rig.hold.palmR;
  const at = new Vector3(...keyPoint(low, rig.scale))
    .add(new Vector3(...keyPoint(high, rig.scale)))
    .multiplyScalar(0.5)
    .add(new Vector3(...offset));
  return placePoint(rig.pieces, { bone: 'instrument', at: toVec3(at) });
}

/** The note data of the two hands. */
interface HandTracks {
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
  const [left, right] = splitHands(notes, loudness, rig.hold.reach, rig.hold.apart);
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
  // The fingers point from the shoulder to the palm, or along the aim of the hold, in the plane of
  // the palm.
  if (side.aim) {
    fingers.fromArray(side.aim);
  } else {
    fingers.subVectors(palm, shoulder.position);
  }
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
