import { MathUtils, Quaternion, Vector3 } from 'three';

import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import { placePoint } from '../models/instruments/hold.ts';
import { TIMPANI, xylophoneBarPosition } from '../models/instruments/percussion.ts';
import type { PlayTarget } from '../models/instruments/types.ts';
import { IDENTITY, toVec3 } from '../models/tuples.ts';
import type { Quat, Vec3 } from '../models/tuples.ts';
import type { InstrumentOf } from './family.ts';
import { setFromBasis } from './frames.ts';
import { hangingArm } from './hang.ts';
import type { HangingArm } from './hang.ts';
import { armRig } from './ik.ts';
import type { ArmRig } from './ik.ts';
import type { StrikeSizes, StrikeTarget } from './strikes.ts';

/** The timpani, the drums, the cymbals, the small percussion, and the xylophone (design 4.6). */
export type PercussionInstrument = InstrumentOf<'percussion'>;

/**
 * How a percussion player shares its strikes between its hands (design 5.3).
 *
 * - `alternate`: two mallets or sticks. See `alternateHands()`.
 * - `sides`: two mallets, and each hand strikes the targets on its side of the middle of the
 *   player, so that a roll on one kettle stays in one hand. A player with short arms and a long
 *   nose between two kettles cannot reach across to the far kettle.
 * - `right`: the right hand strikes each note. The bass drum has one beater, and the small
 *   percussion player holds the triangle in its left hand.
 * - `pair`: the two cymbals strike each other.
 */
export type HandsRule = 'alternate' | 'sides' | 'right' | 'pair';

/**
 * The values of the hold of each percussion instrument (design 5.3). The directions are in the
 * model axes of the bind pose: the player faces -z, and its left is -x.
 */
export interface PercussionHold {
  readonly hands: HandsRule;
  readonly sizes: StrikeSizes;
  /** The move of the target of each hand from the middle of a head, in meters. */
  readonly offsetL: Vec3;
  readonly offsetR: Vec3;
  /** The directions to which the elbows point. */
  readonly poleL: Vec3;
  readonly poleR: Vec3;
  /**
   * The move of each target of a kettle from the middle of its head toward the player, in meters
   * on the floor plane: the playing spot of a timpanist lies between the middle and the rim
   * nearest to the player. 0 for the other instruments.
   */
  readonly inward: number;
  /**
   * The place from which a mallet points to its target, from the shoulder joint of its side, in
   * head heights `H`. Thus the wrist stays in front of the body and below the shoulder, and the
   * mallet slants down.
   */
  readonly home: Vec3;
}

/**
 * The elbows of a percussion player point down and out. A hold turns them nearer to the body
 * where the arms permit (design 5.3).
 */
const POLE_L: Vec3 = [-1, -1, 0.3];
const POLE_R: Vec3 = [1, -1, 0.3];

/** The place from which a mallet points to its target in most holds (`PercussionHold.home`). */
const MALLET_HOME: Vec3 = [0, -0.2, -0.75];

/** The holds of the percussion instruments. */
export const PERCUSSION_HOLDS = {
  // The two mallets play side by side on one kettle. When a hand reaches across to a far kettle,
  // the left arm goes into the torso (design 5.3), and elbows nearer to the body went deeper.
  timpani: {
    hands: 'alternate',
    sizes: { lift: 0.12, rest: 0.04 },
    offsetL: [-0.05, 0, 0],
    offsetR: [0.05, 0, 0],
    poleL: POLE_L,
    poleR: POLE_R,
    inward: 0,
    home: MALLET_HOME,
  },
  'bass-drum': {
    hands: 'right',
    sizes: { lift: 0.12, rest: 0.05 },
    offsetL: [0, 0, 0],
    offsetR: [0, 0, 0],
    poleL: POLE_L,
    poleR: [0.5, -1, 0.25],
    inward: 0,
    home: MALLET_HOME,
  },
  'snare-drum': {
    hands: 'alternate',
    sizes: { lift: 0.1, rest: 0.03 },
    offsetL: [-0.04, 0, 0],
    offsetR: [0.04, 0, 0],
    poleL: [-0.6, -1, 0.3],
    poleR: [0.6, -1, 0.3],
    inward: 0,
    home: MALLET_HOME,
  },
  // The lift is the half of the gap between the inner faces of the two cymbals.
  cymbals: {
    hands: 'pair',
    sizes: { lift: 0.15, rest: 0.06 },
    offsetL: [0, 0, 0],
    offsetR: [0, 0, 0],
    poleL: POLE_L,
    poleR: POLE_R,
    inward: 0,
    home: MALLET_HOME,
  },
  // The left hand holds the triangle up, and its elbow points out to the left.
  'small-percussion': {
    hands: 'right',
    sizes: { lift: 0.05, rest: 0.02 },
    offsetL: [0, 0, 0],
    offsetR: [0, 0, 0],
    poleL: [-1, -0.5, 0.3],
    poleR: POLE_R,
    inward: 0,
    home: MALLET_HOME,
  },
  xylophone: {
    hands: 'alternate',
    sizes: { lift: 0.08, rest: 0.03 },
    offsetL: [0, 0, 0],
    offsetR: [0, 0, 0],
    poleL: [-0.8, -1, 0.3],
    poleR: [0.8, -1, 0.3],
    inward: 0,
    home: MALLET_HOME,
  },
} as const satisfies Readonly<Record<PercussionInstrument, PercussionHold>>;

/** The places of the hands of a percussion player, in head heights `H` (design 5.3). */
export const PERCUSSION_PLACES = {
  /** The place from which a mallet points to its target in most holds (`PercussionHold.home`). */
  malletHome: MALLET_HOME,
  /** The cymbals meet here, from the middle of the two shoulder joints. */
  crash: [0, -0.09, -1.1],
  /** The clip of the triangle in the left hand, from the left shoulder joint. */
  triangleClip: [0.3, 0, -1],
} as const;

/** The curl of the fingers around a mallet, a stick, or the strap of a cymbal. */
export const GRIP_CURL = 60 * MathUtils.DEG2RAD;

/** The MIDI key of the tambourine (design 4.6). The other keys of the player strike the triangle. */
const TAMBOURINE_KEY = 54;

/** The rotation of a mallet in the bind pose: +x of the mallet to the front, +y up (design 4.6). */
const MALLET_BIND = setFromBasis(new Quaternion(), new Vector3(0, 0, -1), new Vector3(0, 1, 0));

/** The inverse of {@link MALLET_BIND}. */
export const MALLET_INVERSE = MALLET_BIND.clone().invert();

/**
 * The rotation of the left hand that holds the triangle up: the clip, which is in front of the
 * palm in the bind pose, comes under the hand, and the triangle hangs in the plane x-y. Thus the
 * side of the triangle that the beater strikes faces the right hand.
 */
const TRIANGLE_HAND: Quat = [-Math.SQRT1_2, 0, 0, Math.SQRT1_2];

/**
 * One hand of a percussion player.
 *
 * - `mallet`: the hand strikes with the head of a mallet, a stick, or a beater.
 * - `plate`: the hand holds a cymbal. Its inner face moves along the normal of the crash.
 * - `hold`: the hand keeps one place: the left hand with the triangle.
 * - `free`: the arm hangs, as the left arm of the bass drum player.
 */
export type PercussionSide =
  | {
      readonly kind: 'mallet';
      readonly arm: ArmRig;
      /** The head of the mallet in the bind pose. */
      readonly head: Vec3;
      /** The place from which the mallet points to its target (`PercussionHold.home`). */
      readonly home: Vec3;
    }
  | {
      readonly kind: 'plate';
      readonly arm: ArmRig;
      /** The middle of the inner face of the cymbal in the bind pose. */
      readonly face: Vec3;
      /** -1 for the left cymbal and 1 for the right cymbal: the side of the crash point. */
      readonly sign: -1 | 1;
    }
  | {
      readonly kind: 'hold';
      readonly arm: ArmRig;
      readonly wrist: Vec3;
      /** The world rotation of the hand. */
      readonly hand: Quat;
    }
  | { readonly kind: 'free'; readonly arm: ArmRig };

/** The points of a percussion player in the bind pose that the pose needs. */
export interface PercussionRig {
  readonly instrument: PercussionInstrument;
  readonly hold: PercussionHold;
  readonly chestBind: Vec3;
  readonly left: PercussionSide;
  readonly right: PercussionSide;
  /** The targets of the instrument, by a key of each target (see `targetKeyOf()`). */
  readonly targets: ReadonlyMap<number, StrikeTarget>;
  /** The target of each hand before its first strike. */
  readonly restL: StrikeTarget;
  readonly restR: StrikeTarget;
  /** The left arm in the rest pose, and the left arm that does not play (design 5.2, 5.3). */
  readonly hangL: HangingArm;
  /** The right arm in the rest pose. */
  readonly hangR: HangingArm;
}

/**
 * Finds a play target of the instrument of a player.
 *
 * @param model The player model.
 * @param test Tells whether a target is the one to find.
 * @returns The target.
 * @throws Error if the instrument has no such target.
 */
function findTarget(model: PlayerModel, test: (t: PlayTarget) => boolean): PlayTarget {
  const target = model.instrument.targets.find(test);
  if (!target) {
    throw new Error(`The ${model.instrument.id} has no target for the pose.`);
  }
  return target;
}

/**
 * Gives a target of a piece in the model axes of the bind pose.
 *
 * @param model The player model.
 * @param target The play target.
 * @param at The point on the piece. The point of the target by default.
 * @returns The point and the unit normal.
 */
function bindTarget(model: PlayerModel, target: PlayTarget, at: Vec3 = target.from): StrikeTarget {
  const placed = model.pieces.find((p) => p.piece.bone === target.bone);
  const turn = new Quaternion(...(placed?.at.rotation ?? IDENTITY));
  return {
    point: placePoint(model.pieces, { bone: target.bone, at }),
    normal: toVec3(new Vector3(...target.normal).applyQuaternion(turn).normalize()),
  };
}

/**
 * Gives the key of the target of a note: the index of the kettle of the timpani, the MIDI key of
 * the bar of the xylophone, 1 for the tambourine and 0 for the triangle, and 0 for a drum or the
 * cymbals.
 *
 * @param instrument The instrument.
 * @param pitch The MIDI key of the note.
 * @param kettles The number of kettles of the timpani.
 * @returns The key of the target.
 */
export function targetKeyOf(instrument: PercussionInstrument, pitch: number, kettles = 4): number {
  switch (instrument) {
    case 'timpani':
      return kettleOf(pitch, kettles);
    case 'xylophone':
      return pitch;
    case 'small-percussion':
      return pitch === TAMBOURINE_KEY ? 1 : 0;
    case 'bass-drum':
    case 'snare-drum':
    case 'cymbals':
      return 0;
    default: {
      const unhandled: never = instrument;
      throw new Error(`The instrument "${String(unhandled)}" is not percussion.`);
    }
  }
}

/**
 * Selects the kettle of a timpani note (design 5.3): the kettle whose key range has its middle
 * nearest to the key. Of two kettles at the same distance, the larger kettle plays the note.
 *
 * @param pitch The MIDI key.
 * @param kettles The number of kettles.
 * @returns The index of the kettle, 0 for the largest.
 */
export function kettleOf(pitch: number, kettles: number): number {
  let best = 0;
  let distance = Infinity;
  for (const [i, [low, high]] of TIMPANI.keys.slice(0, kettles).entries()) {
    const d = Math.abs(pitch - (low + high) / 2);
    if (d < distance) {
      best = i;
      distance = d;
    }
  }
  return best;
}

/**
 * Finds the points of a percussion player that the pose needs.
 *
 * @param model A player with a percussion instrument.
 * @param instrument The instrument of the model.
 * @returns The rig.
 * @throws Error if the instrument has no target that the pose needs.
 */
export function percussionRig(model: PlayerModel, instrument: PercussionInstrument): PercussionRig {
  const hold: PercussionHold = PERCUSSION_HOLDS[instrument];
  const h = model.body.headHeight;
  const left = armRig(model, 'L');
  const right = armRig(model, 'R');
  const inH = (v: Vec3): Vector3 => new Vector3(...v).multiplyScalar(h);
  const fromShoulder = (arm: ArmRig, v: Vec3): Vector3 =>
    inH(v).add(new Vector3(...arm.bind.shoulder));
  const mallet = (arm: ArmRig, bone: 'malletL' | 'malletR'): PercussionSide => ({
    kind: 'mallet',
    arm,
    head: bindTarget(
      model,
      findTarget(model, (t) => t.kind === 'mallet-head' && t.bone === bone),
    ).point,
    home: toVec3(fromShoulder(arm, hold.home)),
  });
  const targets = new Map<number, StrikeTarget>();
  const heads = model.instrument.targets.filter((t) => t.kind === 'head');
  let sides: readonly [PercussionSide, PercussionSide];
  switch (instrument) {
    case 'timpani':
      for (const [i, head] of heads.entries()) {
        targets.set(i, towardPlayer(bindTarget(model, head), hold.inward));
      }
      sides = [mallet(left, 'malletL'), mallet(right, 'malletR')];
      break;
    case 'bass-drum':
    case 'snare-drum':
      targets.set(
        0,
        bindTarget(
          model,
          findTarget(model, (t) => t.kind === 'head'),
        ),
      );
      sides = [
        instrument === 'snare-drum' ? mallet(left, 'malletL') : { kind: 'free', arm: left },
        mallet(right, 'malletR'),
      ];
      break;
    case 'xylophone': {
      const bars = findTarget(model, (t) => t.kind === 'bars');
      const [low, high] = bars.keys ?? [0, -1];
      for (let key = low; key <= high; key++) {
        targets.set(key, bindTarget(model, bars, xylophoneBarPosition(key)));
      }
      sides = [mallet(left, 'malletL'), mallet(right, 'malletR')];
      break;
    }
    case 'cymbals': {
      const middle = new Vector3(...left.bind.shoulder)
        .add(new Vector3(...right.bind.shoulder))
        .multiplyScalar(0.5);
      const crash = inH(PERCUSSION_PLACES.crash).add(middle);
      targets.set(0, { point: toVec3(crash), normal: [1, 0, 0] });
      const face = (bone: 'malletL' | 'malletR'): Vec3 =>
        bindTarget(
          model,
          findTarget(model, (t) => t.kind === 'plate' && t.bone === bone),
        ).point;
      sides = [
        { kind: 'plate', arm: left, face: face('malletL'), sign: -1 },
        { kind: 'plate', arm: right, face: face('malletR'), sign: 1 },
      ];
      break;
    }
    case 'small-percussion': {
      // The left hand holds the clip of the triangle in front of the chest.
      const clip = fromShoulder(left, PERCUSSION_PLACES.triangleClip);
      const clipBind = model.skeleton.positions[boneIndex('malletL')] ?? toVec3(clip);
      const hand = new Quaternion(...TRIANGLE_HAND);
      const bindWrist = new Vector3(...left.bind.wrist);
      // Gives a bind point of the hand at the place of the hand that holds the triangle.
      const held = (point: Vec3): Vector3 =>
        new Vector3(...point).sub(bindWrist).applyQuaternion(hand);
      const wrist = toVec3(clip.sub(held(clipBind)));
      const bar = bindTarget(
        model,
        findTarget(model, (t) => t.kind === 'bar'),
      );
      targets.set(0, {
        point: toVec3(held(bar.point).add(new Vector3(...wrist))),
        normal: toVec3(new Vector3(...bar.normal).applyQuaternion(hand)),
      });
      targets.set(
        1,
        bindTarget(
          model,
          findTarget(model, (t) => t.kind === 'head'),
        ),
      );
      sides = [{ kind: 'hold', arm: left, wrist, hand: TRIANGLE_HAND }, mallet(right, 'malletR')];
      break;
    }
    default: {
      const unhandled: never = instrument;
      throw new Error(`The instrument "${String(unhandled)}" is not percussion.`);
    }
  }
  const ordered = [...targets.values()].toSorted((a, b) => a.point[0] - b.point[0]);
  const fallback: StrikeTarget = { point: [0, 0, 0], normal: [0, 1, 0] };
  return {
    instrument,
    hold,
    chestBind: model.skeleton.positions[boneIndex('chest')] ?? [0, 0, 0],
    left: sides[0],
    right: sides[1],
    targets,
    restL: offsetTarget(ordered[0] ?? fallback, hold.offsetL),
    restR: offsetTarget(ordered.at(-1) ?? fallback, hold.offsetR),
    hangL: hangingArm(model, left),
    hangR: hangingArm(model, right),
  };
}

/**
 * Moves a target by the offset of a hand.
 *
 * @param target The target.
 * @param offset The offset, in meters.
 * @returns The moved target.
 */
export function offsetTarget(target: StrikeTarget, offset: Vec3): StrikeTarget {
  const point = new Vector3(...target.point).add(new Vector3(...offset));
  return { point: toVec3(point), normal: target.normal };
}

/**
 * Moves a target toward the player on the floor plane: the player stands at the origin of the
 * model axes.
 *
 * @param target The target.
 * @param distance The move, in meters.
 * @returns The moved target, or the target with no move for a distance of 0.
 */
function towardPlayer(target: StrikeTarget, distance: number): StrikeTarget {
  const [x, , z] = target.point;
  const length = Math.hypot(x, z);
  if (distance === 0 || length === 0) {
    return target;
  }
  return offsetTarget(target, [(-x / length) * distance, 0, (-z / length) * distance]);
}
