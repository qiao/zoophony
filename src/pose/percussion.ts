import {
  DEG,
  IDENTITY,
  add,
  basisRotation,
  invert,
  length,
  multiply,
  normalize,
  reject,
  rotate,
  scale,
  sub,
} from '../models/math.ts';
import type { Quat, Vec3 } from '../models/math.ts';
import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import { placePoint } from '../models/instruments/hold.ts';
import { TIMPANI, xylophoneBarPosition } from '../models/instruments/percussion.ts';
import type { PlayTarget } from '../models/instruments/types.ts';
import type { PlayerNote } from '../score/types.ts';
import { mix, mixRotation } from './blend.ts';
import type { TorsoFrames } from './bowed.ts';
import type { InstrumentOf } from './family.ts';
import { armRig, limitReach, poseShoulder, writeArm, writeCurl } from './ik.ts';
import type { ArmRig } from './ik.ts';
import { groupChords } from './note-groups.ts';
import { alternateHands, buildStrikeTrack } from './strikes.ts';
import type {
  Strike,
  StrikeGroup,
  StrikeSizes,
  StrikeState,
  StrikeTarget,
  StrikeTrack,
} from './strikes.ts';

/** The timpani, the drums, the cymbals, the small percussion, and the xylophone (design 4.6). */
export type PercussionInstrument = InstrumentOf<'percussion'>;

/**
 * How a percussion player shares its strikes between its hands (design 5.3).
 *
 * - `alternate`: two mallets or sticks. See `alternateHands()`.
 * - `right`: the right hand strikes each note. The bass drum has one beater, and the small
 *   percussion player holds the triangle in its left hand.
 * - `pair`: the two cymbals strike each other.
 */
export type HandsRule = 'alternate' | 'right' | 'pair';

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
}

/** The elbows of a percussion player point down and out. */
const POLE_L: Vec3 = [-1, -1, 0.3];
const POLE_R: Vec3 = [1, -1, 0.3];

/** The holds of the percussion instruments. */
export const PERCUSSION_HOLDS = {
  // The two mallets play side by side on one kettle.
  timpani: {
    hands: 'alternate',
    sizes: { lift: 0.12, rest: 0.04 },
    offsetL: [-0.05, 0, 0],
    offsetR: [0.05, 0, 0],
    poleL: POLE_L,
    poleR: POLE_R,
  },
  'bass-drum': {
    hands: 'right',
    sizes: { lift: 0.12, rest: 0.05 },
    offsetL: [0, 0, 0],
    offsetR: [0, 0, 0],
    poleL: POLE_L,
    poleR: POLE_R,
  },
  'snare-drum': {
    hands: 'alternate',
    sizes: { lift: 0.1, rest: 0.03 },
    offsetL: [-0.04, 0, 0],
    offsetR: [0.04, 0, 0],
    poleL: POLE_L,
    poleR: POLE_R,
  },
  // The lift is the half of the gap between the inner faces of the two cymbals.
  cymbals: {
    hands: 'pair',
    sizes: { lift: 0.15, rest: 0.06 },
    offsetL: [0, 0, 0],
    offsetR: [0, 0, 0],
    poleL: POLE_L,
    poleR: POLE_R,
  },
  // The left hand holds the triangle up, and its elbow points out to the left.
  'small-percussion': {
    hands: 'right',
    sizes: { lift: 0.05, rest: 0.02 },
    offsetL: [0, 0, 0],
    offsetR: [0, 0, 0],
    poleL: [-1, -0.5, 0.3],
    poleR: POLE_R,
  },
  xylophone: {
    hands: 'alternate',
    sizes: { lift: 0.08, rest: 0.03 },
    offsetL: [0, 0, 0],
    offsetR: [0, 0, 0],
    poleL: POLE_L,
    poleR: POLE_R,
  },
} as const satisfies Readonly<Record<PercussionInstrument, PercussionHold>>;

/** The places of the hands of a percussion player, in head heights `H` (design 5.3). */
export const PERCUSSION_PLACES = {
  /**
   * A mallet points from this place to its target, from the shoulder joint of its side. Thus the
   * wrist stays in front of the body and below the shoulder, and the mallet slants down.
   */
  malletHome: [0, -0.2, -0.75],
  /** The cymbals meet here, from the middle of the two shoulder joints. */
  crash: [0, -0.09, -1.1],
  /** The clip of the triangle in the left hand, from the left shoulder joint. */
  triangleClip: [0.3, 0, -1],
} as const;

/** The curl of the fingers around a mallet, a stick, or the strap of a cymbal. */
export const GRIP_CURL = 60 * DEG;

/** The MIDI key of the tambourine (design 4.6). The other keys of the player strike the triangle. */
const TAMBOURINE_KEY = 54;

/** The rotation of a mallet in the bind pose: +x of the mallet to the front, +y up (design 4.6). */
const MALLET_BIND = basisRotation([0, 0, -1], [0, 1, 0]);

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
      /** The place from which the mallet points to its target (`PERCUSSION_PLACES.malletHome`). */
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
  return {
    point: placePoint(model.pieces, { bone: target.bone, at }),
    normal: normalize(rotate(placed?.at.rotation ?? IDENTITY, target.normal)),
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
  const inH = (v: Vec3): Vec3 => scale(v, h);
  const mallet = (arm: ArmRig, bone: 'malletL' | 'malletR'): PercussionSide => ({
    kind: 'mallet',
    arm,
    head: bindTarget(
      model,
      findTarget(model, (t) => t.kind === 'mallet-head' && t.bone === bone),
    ).point,
    home: add(arm.bind.shoulder, inH(PERCUSSION_PLACES.malletHome)),
  });
  const targets = new Map<number, StrikeTarget>();
  const heads = model.instrument.targets.filter((t) => t.kind === 'head');
  let sides: readonly [PercussionSide, PercussionSide];
  switch (instrument) {
    case 'timpani':
      for (const [i, head] of heads.entries()) {
        targets.set(i, bindTarget(model, head));
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
      const middle = scale(add(left.bind.shoulder, right.bind.shoulder), 0.5);
      targets.set(0, { point: add(middle, inH(PERCUSSION_PLACES.crash)), normal: [1, 0, 0] });
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
      const clip = add(left.bind.shoulder, inH(PERCUSSION_PLACES.triangleClip));
      const clipBind = model.skeleton.positions[boneIndex('malletL')] ?? clip;
      const wrist = sub(clip, rotate(TRIANGLE_HAND, sub(clipBind, left.bind.wrist)));
      const bar = bindTarget(
        model,
        findTarget(model, (t) => t.kind === 'bar'),
      );
      targets.set(0, {
        point: add(wrist, rotate(TRIANGLE_HAND, sub(bar.point, left.bind.wrist))),
        normal: rotate(TRIANGLE_HAND, bar.normal),
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
  };
}

/**
 * Moves a target by the offset of a hand.
 *
 * @param target The target.
 * @param offset The offset, in meters.
 * @returns The moved target.
 */
function offsetTarget(target: StrikeTarget, offset: Vec3): StrikeTarget {
  return { point: add(target.point, offset), normal: target.normal };
}

/** The strike data of the two hands. A hand with no strikes has `null`. */
export interface PercussionTracks {
  readonly left: StrikeTrack | null;
  readonly right: StrikeTrack | null;
}

/**
 * Calculates the strike data of the two hands of a percussion player (design 5.3). The notes that
 * start within 50 ms of each other strike together. A drum player strikes its own instrument for
 * each of its notes, also for the notes of another key group (design 3.8). Of a chord of the
 * small percussion player, the triangle sounds unless all notes are the tambourine.
 *
 * @param rig The points of the player.
 * @param notes The notes of the player, sorted by start.
 * @param loudness The loudness of each note, in the order of `notes`.
 * @param amplitude The seeded amplitude of the player.
 * @returns The strike data of each hand.
 */
export function percussionTracks(
  rig: PercussionRig,
  notes: readonly PlayerNote[],
  loudness: readonly number[],
  amplitude: number,
): PercussionTracks {
  const { hold, instrument } = rig;
  const kettles = instrument === 'timpani' ? rig.targets.size : 4;
  const groups = groupChords(notes, loudness).map((group): StrikeGroup => {
    const keys = new Set<number>();
    for (const note of notes.slice(group.first, group.first + group.count)) {
      keys.add(targetKeyOf(instrument, note.pitch, kettles));
    }
    // The triangle (key 0) sounds over the tambourine (key 1).
    const chosen = instrument === 'small-percussion' ? [Math.min(...keys)] : [...keys];
    const targets: StrikeTarget[] = [];
    for (const key of chosen) {
      const target = rig.targets.get(key) ?? nearestTarget(rig, key);
      if (target) {
        targets.push(target);
      }
    }
    return { start: group.start, loudness: group.loudness, targets };
  });
  const track = (strikes: readonly Strike[], offset: Vec3, rest: StrikeTarget): StrikeTrack =>
    buildStrikeTrack(
      strikes.map((s) => ({ ...s, point: add(s.point, offset) })),
      strikes[0] ? offsetTarget(strikes[0], offset) : rest,
      hold.sizes,
      amplitude,
    );
  if (hold.hands === 'alternate') {
    const [left, right] = alternateHands(groups);
    return {
      left: track(left, hold.offsetL, rig.restL),
      right: track(right, hold.offsetR, rig.restR),
    };
  }
  const strikes = groups.flatMap((g): Strike[] => {
    const target = g.targets[0];
    return target ? [{ ...target, start: g.start, loudness: g.loudness }] : [];
  });
  const one = track(strikes, hold.offsetR, rig.restR);
  return hold.hands === 'pair' ? { left: one, right: one } : { left: null, right: one };
}

/**
 * Finds the target of the nearest key, for a key that the instrument does not have.
 *
 * @param rig The points of the player.
 * @param key The key of the target.
 * @returns The target, or `undefined` if the instrument has no targets.
 */
function nearestTarget(rig: PercussionRig, key: number): StrikeTarget | undefined {
  let best: StrikeTarget | undefined;
  let distance = Infinity;
  for (const [k, target] of rig.targets) {
    if (Math.abs(k - key) < distance) {
      best = target;
      distance = Math.abs(k - key);
    }
  }
  return best;
}

/** The motion of the two hands of a percussion player at one time. */
export interface PercussionState {
  readonly left: StrikeState;
  readonly right: StrikeState;
}

/**
 * Gives the wrist and the world rotation of a hand with a mallet whose head is at a point. The
 * mallet points from the home of the hand to the head, with its top up.
 *
 * @param side The hand with a mallet.
 * @param head The point of the mallet head.
 * @returns The wrist and the world rotation of the hand.
 */
function malletHand(
  side: Extract<PercussionSide, { kind: 'mallet' }>,
  head: Vec3,
): readonly [wrist: Vec3, hand: Quat] {
  const along = normalize(sub(head, side.home));
  const up = reject([0, 1, 0], along);
  const top: Vec3 = length(up) > 1e-6 ? normalize(up) : [0, 0, 1];
  const hand = multiply(basisRotation(along, top), invert(MALLET_BIND));
  return [sub(head, rotate(hand, sub(side.head, side.arm.bind.wrist))), hand];
}

/**
 * Writes the arms and the fingers of a percussion player (design 5.3, 4.7). Each mallet head goes
 * to the place of its strike state, and the two-bone IK places each arm. The cymbals keep the
 * turn of the bind pose, and their inner faces meet at the crash point at the note start. In the
 * rest pose, the arms hang.
 *
 * @param rig The points of the player.
 * @param frames The posed frames of the root and of the chest.
 * @param state The motion of the hands at the song time of the note layer.
 * @param weight The eased weight of the playing pose: 0 is the rest pose (5.2, 5.5).
 * @param rotations The rotations of the pose to write.
 */
export function posePercussion(
  rig: PercussionRig,
  frames: TorsoFrames,
  state: PercussionState,
  weight: number,
  rotations: Float32Array,
): void {
  const chest = frames.chest;
  for (const [side, hand, pole] of [
    [rig.left, state.left, rig.hold.poleL],
    [rig.right, state.right, rig.hold.poleR],
  ] as const) {
    if (side.kind === 'free') {
      continue;
    }
    const { arm } = side;
    const shoulder = poseShoulder(arm, chest, rig.chestBind, IDENTITY);
    let wrist: Vec3;
    let turn: Quat;
    if (side.kind === 'mallet') {
      [wrist, turn] = malletHand(side, add(hand.point, scale(hand.normal, hand.height)));
    } else if (side.kind === 'plate') {
      const face = add(hand.point, scale(hand.normal, side.sign * hand.height));
      wrist = sub(face, sub(side.face, arm.bind.wrist));
      turn = IDENTITY;
    } else {
      wrist = side.wrist;
      turn = side.hand;
    }
    const hanging = add(
      shoulder.position,
      rotate(shoulder.rotation, sub(arm.bind.wrist, arm.bind.shoulder)),
    );
    writeArm(
      {
        arm,
        shoulder,
        wrist: mix(hanging, limitReach(arm, shoulder.position, wrist), weight),
        hand: mixRotation(shoulder.rotation, turn, weight),
        pole,
      },
      chest.rotation,
      rotations,
    );
    writeCurl(arm, GRIP_CURL * weight, rotations);
  }
}
