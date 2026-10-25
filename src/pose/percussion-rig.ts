import { MathUtils, Quaternion, Vector3 } from 'three';

import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import { placePoint } from '../models/instruments/hold.ts';
import {
  TIMPANI,
  XYLOPHONE,
  kettleHeadRadius,
  xylophoneBarPosition,
} from '../models/instruments/percussion.ts';
import type { PlayTarget } from '../models/instruments/types.ts';
import { IDENTITY, toQuat, toVec3 } from '../models/tuples.ts';
import type { Quat, Vec3 } from '../models/tuples.ts';
import type { InstrumentOf } from './family.ts';
import { hangingArm } from './hang.ts';
import type { HangingArm } from './hang.ts';
import { armRig } from './ik.ts';
import type { ArmRig } from './ik.ts';
import { plantedLegs } from './side-move.ts';
import type { PlantedLegs, SideMove } from './side-move.ts';
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
 * The turn of a mallet around its own axis in the paw (design 5.3). A round mallet looks the same
 * at each turn, so the turn only sets the paw on the forearm.
 *
 * - `up`: the top of the grip points up, as in the bind pose, where the arm hangs and the mallet
 *   points forward from the fist.
 * - `shoulder`: the top of the grip points toward the shoulder joint of its side, so that the paw
 *   stays near the line of the arm. A mallet that slants down in front of a short arm with the
 *   top up turns the paw almost upside down on the forearm.
 */
export type MalletTop = 'up' | 'shoulder';

/**
 * The mallet of a percussion hold across the forearm between strikes (design 5.3). A real player
 * holds a mallet so that it leaves the side of the fist at about 90° to the forearm, as the bind
 * pose does, where the arm hangs and the mallet points forward. At a strike, the mallet points
 * from its home to the target, and the grip stays at that place. As the head goes up to its rest
 * height, the paw turns around the grip until the mallet lies across the forearm, at an angle in
 * the frame of the elbow, and the top of the grip points along the forearm toward the elbow.
 */
export interface MalletAcross {
  /**
   * The direction of the mallet at the rest height, across the forearm: the angle from the
   * direction of no twist of the paw on the forearm ({@link acrossAxes}) toward the out side of
   * the hand, in radians.
   */
  readonly rest: number;
  /**
   * The turn of the mallet up from that direction at the rest height, in radians, as a real
   * player lifts the head with the wrist between strikes. The paw bends on the forearm and does
   * not twist.
   */
  readonly lift: number;
  /**
   * The turn of the mallet up from its strike direction at the rest height, in radians, or
   * `null`. With a value, the paw keeps the turn of the strike between strikes, and the wrist
   * lifts the head around the level axis normal to the forearm, with no twist. Thus the tip stays
   * above its playing spot, as a real player's tip does. `rest` and `lift` then set only the paw
   * at a strike. With `null`, the paw turns to the rest direction across the forearm.
   */
  readonly pitch: number | null;
}

/**
 * The values of the hold of each percussion instrument (design 5.3). The directions are in the
 * model axes of the bind pose: the player faces -z, and its left is -x.
 */
interface PercussionHold {
  readonly hands: HandsRule;
  readonly sizes: StrikeSizes;
  /** The move of the target of each hand from the middle of a head, in meters. */
  readonly offsetL: Vec3;
  readonly offsetR: Vec3;
  /** The directions to which the elbows point. */
  readonly poleL: Vec3;
  readonly poleR: Vec3;
  /**
   * The distance of the playing spot of each kettle from the rim of its head nearest to the
   * player, in meters on the floor plane. A real timpanist strikes about 3 inches in from the
   * rim, directly in front of the player (`docs/research/2026-10-19-elephant-mesh.md`). The
   * elephant strikes further in, so that its paws rest above the near rims, as the user chose
   * (`docs/decisions/2026-10-19-elephant-pose.md`). 0 keeps the target at the middle of the
   * head, as for the other instruments.
   */
  readonly rim: number;
  /**
   * The place from which a mallet points to its target, from the shoulder joint of its side, in
   * head heights `H`. Thus the wrist stays in front of the body and below the shoulder, and the
   * mallet slants down. The x points to the out side of each hand: -x for the left hand.
   */
  readonly home: Vec3;
  /** The turn of each mallet around its own axis in the paw. */
  readonly top: MalletTop;
  /**
   * The mallet across the forearm between strikes, or `null`: then the head lifts along the
   * normal of its target, and the mallet points from the home to the head. It takes the place
   * of `top`.
   */
  readonly across: MalletAcross | null;
  /**
   * True: the player holds its mallets over the instrument also in the rest pose, and the arms do
   * not hang (design 5.2). The hanging paws of a player with short arms can reach into large
   * kettles in front of it.
   */
  readonly ready: boolean;
  /**
   * True: each timpani note plays on one of the two kettles beside the front gap
   * ({@link frontKettles}), and the other kettles stand beyond the reach of short arms. A note
   * below the middle of the lowest and the highest key of the part plays on the left kettle, and
   * the other notes on the right kettle. False: a note plays on the kettle of its key range
   * ({@link kettleOf}).
   */
  readonly pair: boolean;
  /**
   * The least distance along x from a strike of a hand to the last target of the other hand, in
   * meters (`alternateHands()`): a nearer target stays with the other hand. 0 lets a hand strike
   * up to the target of the other hand, as two mallets in turn on one timpani head.
   */
  readonly gap: number;
  /**
   * The farthest distance on the floor plane from the shoulder joint of a hand to its target, in
   * meters (`alternateHands()`). A farther target goes to the other hand when that hand is
   * nearer. `Infinity`: no limit.
   */
  readonly reach: number;
  /** The forward lean of the spine over the instrument while the player plays, in radians. */
  readonly lean: number;
  /**
   * The side move of the body behind the notes, with the feet on the floor, or `null`: the body
   * keeps its place.
   */
  readonly side: SideMove | null;
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
  // The elephant mesh has short arms behind a deep belly, and its trunk hangs between the two
  // front kettles: each hand strikes the front kettle of its side, and the outer kettles stand
  // beyond its reach (pair). The paw rests above the near rim, and the mallet strikes 0.25 m in
  // from the rim, as the user chose for the look of the reference images. As a real timpanist,
  // the paw holds the head out of the front of the fist (TIMPANI.malletTilt), and each mallet
  // points forward and in. The homes stand out from the shoulders, so that the mallets point
  // forward at a strike. Between strikes, the wrist lifts the head a little above the level, with
  // little twist of the paw on the forearm (across, 2026-10-19-elephant-grip decisions). The
  // elbows point down and a little out from the body, so that the upper arms roll less, the skin
  // does not twist at the shoulder (2026-10-19-arm-skin decisions), no gap shows between each
  // upper arm and the trunk from the back (2026-10-22-elephant-crease decisions), and the thick
  // upper arms of the quad tubes go less far into the round belly near the elbows
  // (2026-10-25-elephant-hippo-creases decisions). The mallets stay over the kettles in
  // the rest pose, because the hanging paws reach into the large kettles (ready,
  // 2026-10-19-elephant-pose decisions).
  timpani: {
    hands: 'sides',
    sizes: { lift: 0.1, rest: 0.2 },
    offsetL: [0, 0, 0],
    offsetR: [-0.05, 0, 0],
    poleL: [-0.8, -1, 0.2],
    poleR: [0.8, -1, 0.2],
    rim: 0.25,
    home: [0.1, -0.37, -0.2],
    top: 'shoulder',
    across: { rest: -1.2, lift: 0.65, pitch: null },
    ready: true,
    pair: true,
    gap: 0,
    reach: Infinity,
    lean: 0,
    side: null,
  },
  // The badger strikes the bass drum below the middle of the head, as a real player strikes off
  // the middle. The beater leaves the side of the fist at the angle of no twist of the paw on the
  // forearm between strikes (across), with the elbow out and a little down, and the paw holds it
  // over the drum also at rest (ready), so that the beater does not sweep through the body in the
  // lift (2026-10-20-mesh-badger decisions).
  'bass-drum': {
    hands: 'right',
    sizes: { lift: 0.12, rest: 0.05 },
    offsetL: [0, 0, 0],
    offsetR: [0, -0.12, 0],
    poleL: POLE_L,
    poleR: [1, -0.5, 0],
    rim: 0,
    home: MALLET_HOME,
    top: 'up',
    across: { rest: -1.4, lift: 0.6, pitch: null },
    ready: true,
    pair: false,
    gap: 0,
    reach: Infinity,
    lean: 0,
    side: null,
  },
  // The sticks leave the front of the fists (SNARE_DRUM.malletTilt) and point from homes out
  // from the shoulders, so that they make a V of about 66° at a strike and slant down 9°, as the
  // matched grip of a real player. Between strikes, each stick keeps its strike direction, and
  // the wrist lifts the tip over the head (across.pitch), as a real player's stroke from the
  // wrist. With the rest direction across the forearm, the tips swung out over the rim
  // (2026-10-25-percussion-tips decisions).
  'snare-drum': {
    hands: 'alternate',
    sizes: { lift: 0.1, rest: 0.03 },
    offsetL: [-0.04, 0, 0],
    offsetR: [0.04, 0, 0],
    poleL: [-0.6, -1, 0.3],
    poleR: [0.6, -1, 0.3],
    rim: 0,
    home: [0.5, -0.3, -0.5],
    top: 'up',
    across: { rest: -0.6, lift: 0.3, pitch: 0.9 },
    ready: false,
    pair: false,
    gap: 0,
    reach: Infinity,
    lean: 0,
    side: null,
  },
  // The lift is the half of the gap between the inner faces of the two cymbals. The elbows point
  // down and a little out, so that fewer faces of the left shoulder of the badger mesh fold in the
  // lift (2026-10-20-mesh-badger decisions).
  cymbals: {
    hands: 'pair',
    sizes: { lift: 0.15, rest: 0.06 },
    offsetL: [0, 0, 0],
    offsetR: [0, 0, 0],
    poleL: [-0.5, -1, 0.3],
    poleR: [0.5, -1, 0.3],
    rim: 0,
    home: MALLET_HOME,
    top: 'up',
    across: null,
    ready: false,
    pair: false,
    gap: 0,
    reach: Infinity,
    lean: 0,
    side: null,
  },
  // The left hand holds the triangle up, and its elbow points out to the left. The beater leaves
  // the front of the right fist (TRIANGLE.malletTilt) and keeps the angle of no twist of the paw
  // between strikes (across). The badger holds the triangle up also at rest (ready), because the
  // turn of the left paw from the hanging arm swung the paw far in the lift
  // (2026-10-20-mesh-badger decisions).
  'small-percussion': {
    hands: 'right',
    sizes: { lift: 0.05, rest: 0.02 },
    offsetL: [0, 0, 0],
    offsetR: [0, 0, 0],
    poleL: [-1, -0.5, 0.3],
    poleR: POLE_R,
    rim: 0,
    home: MALLET_HOME,
    top: 'up',
    across: { rest: -0.6, lift: 0.3, pitch: null },
    ready: true,
    pair: false,
    gap: 0,
    reach: Infinity,
    lean: 0,
    side: null,
  },
  // The mallets leave the front of the fists (XYLOPHONE.malletTilt), as the sticks of the snare
  // drum, because a real player holds them in the matched grip of the snare drum
  // (2026-10-20-mesh-badger decisions). Between strikes, each mallet keeps its strike direction,
  // and the wrist lifts the head over its bar (across.pitch), so that the two heads keep apart.
  // The short arms do not reach the bars from an upright body, so the spine leans over them
  // (lean), and the body moves from side to side behind the notes with the feet in place (side,
  // 2026-10-25-xylophone-sway decisions).
  xylophone: {
    hands: 'alternate',
    sizes: { lift: 0.08, rest: 0.03 },
    // The left mallet strikes 3 cm nearer to the player than the middle of the bar, and the right
    // mallet 3 cm farther, so that the heads keep apart on near bars. With the heads at the middle
    // of the bar, the left paw reached 41% of its strikes of the steel drum part of a file of the
    // user, and the heads touched in 7% of its samples (2026-10-25-xylophone-sway decisions).
    offsetL: [0, 0, 0.03],
    offsetR: [0, 0, -0.03],
    poleL: [-0.8, -1, 0.3],
    poleR: [0.8, -1, 0.3],
    rim: 0,
    home: MALLET_HOME,
    top: 'up',
    across: { rest: -0.6, lift: 0.3, pitch: 0.5 },
    ready: false,
    pair: false,
    // A repeat on one bar stays in one hand, so that a mallet does not strike under the head of
    // the other mallet, which rests over the bar.
    gap: 0.01,
    reach: Infinity,
    lean: 0.2,
    // The short legs tilt far with a small move of the hips, and the foot skin then sinks into
    // the floor, so the spine takes most of the move.
    side: { span: 0.25, hips: 0.02, spine: 10 * MathUtils.DEG2RAD, moveSec: 0.6 },
  },
} as const satisfies Readonly<Record<PercussionInstrument, PercussionHold>>;

/**
 * The hold of a suspended cymbal (`SpeciesParams.cymbalForm`), in place of
 * `PERCUSSION_HOLDS.cymbals` (design 5.3). The yarn mallets leave the front of the fists
 * (`SUSPENDED_CYMBAL.malletTilt`), as the sticks of the snare drum, and the two hands strike in
 * turn near the edge, opposite each other: the left hand at the left and the right hand at the
 * right (`docs/reference/percussion-technique.md` 7). The offsets move the target, the middle of a
 * cymbal of the scale 1, to these spots, 1.3 cm in from the rim. The homes stand further out than
 * for the snare drum, so that the mallets point in to the spots, and the upper arms of the badger
 * mesh fold less and stay within their accepted depth (2026-10-20-badger-cymbals decisions).
 * Between strikes, each mallet keeps its strike direction, and the wrist lifts the head over its
 * spot (`across.pitch`). With the rest direction across the forearm, the heads swung out past
 * the rim (2026-10-25-percussion-tips decisions).
 */
export const SUSPENDED_CYMBAL_HOLD: PercussionHold = {
  hands: 'alternate',
  sizes: { lift: 0.1, rest: 0.03 },
  offsetL: [-0.187, 0, 0],
  offsetR: [0.187, 0, 0],
  poleL: [-0.6, -1, 0.3],
  poleR: [0.6, -1, 0.3],
  rim: 0,
  home: [0.6, -0.3, -0.5],
  top: 'up',
  across: { rest: -0.6, lift: 0.3, pitch: 0.7 },
  ready: false,
  pair: false,
  gap: 0,
  reach: Infinity,
  lean: 0,
  side: null,
};

/** The places of the hands of a percussion player, in head heights `H` (design 5.3). */
export const PERCUSSION_PLACES = {
  /** The place from which a mallet points to its target in most holds (`PercussionHold.home`). */
  malletHome: MALLET_HOME,
  /** The cymbals meet here, from the middle of the two shoulder joints. */
  crash: [0, -0.09, -1.1],
  /**
   * The world rotation of both cymbals from the bind pose, where the plates are vertical and
   * their inner faces look along x. The crash normal turns with them, so the inner faces stay
   * parallel at the crash. `holdTurn(0, <z>)` of `pose/winds.ts` tilts the plates from vertical:
   * a positive turn puts the left plate under the right plate.
   */
  plateTurn: IDENTITY,
  /**
   * The clip of the triangle in the left hand, from the left shoulder joint: at the height of the
   * mouth of the badger, as near to the eye level of a real player as its short arm reaches.
   */
  triangleClip: [0.3, 0.5, -0.9],
  /**
   * The world rotation of the left hand that holds the triangle up, from the bind pose: the
   * clip, which is in front of the palm in the bind pose, comes under the hand, and the triangle
   * hangs in the plane x-y. Thus the side of the triangle that the beater strikes faces the right
   * hand.
   */
  // holdTurn(-90, 40) of pose/winds.ts: the paw turns 40° around z, so that it bends less on the
  // forearm of the raised arm.
  triangleHand: [-0.664463, 0.241845, 0.241845, 0.664463],
} as const;

/** The curl of the fingers around a mallet, a stick, or the strap of a cymbal. */
export const GRIP_CURL = 60 * MathUtils.DEG2RAD;

/** The MIDI key of the tambourine (design 4.6). The other keys of the player strike the triangle. */
const TAMBOURINE_KEY = 54;

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
      /** The turn of the mallet around its own axis in the paw (`PercussionHold.top`). */
      readonly top: MalletTop;
      /** The mallet across the forearm between strikes (`PercussionHold.across`). */
      readonly across: MalletAcross | null;
      /**
       * The angle of the mallet in the bind pose from the plane normal to the forearm toward the
       * wrist, in radians: 0 for a mallet at 90° to the forearm (`TIMPANI.malletTilt`).
       */
      readonly tilt: number;
      /** The distance from the grip to the middle of the head of the mallet, in meters. */
      readonly length: number;
      /** The inverse of the rotation of the mallet in the bind pose. */
      readonly inverse: Quat;
    }
  | {
      readonly kind: 'plate';
      readonly arm: ArmRig;
      /** The middle of the inner face of the cymbal in the bind pose. */
      readonly face: Vec3;
      /** -1 for the left cymbal and 1 for the right cymbal: the side of the crash point. */
      readonly sign: -1 | 1;
      /** The world rotation of the hand from the bind pose (`PERCUSSION_PLACES.plateTurn`). */
      readonly turn: Quat;
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
  /** The legs whose feet stay on the floor in a side move (`PercussionHold.side`), or `null`. */
  readonly legs: PlantedLegs | null;
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
 * Gives the octave shift of a xylophone part (design 5.3): the multiple of 12 semitones that puts
 * the highest key of the part in the highest octave of the bars, as a player plays a part below or
 * above the instrument in another octave. A part within the bars keeps its keys. The short bars of
 * the high keys stand nearest to the player, so the short arms of the badger reach them best. A
 * steel drum part of a file of the user, keys 53 to 62, struck the lowest bar with each note
 * before the shift, out of the reach of the arms. Shifted to the middle of the bars, 0% of its
 * strikes were within 5 mm of their bars, and shifted to the top, 51%
 * (`docs/research/2026-10-21-pirates-clip.md`).
 *
 * @param lowest The lowest MIDI key of the part.
 * @param highest The highest MIDI key of the part.
 * @returns The shift, in semitones.
 */
export function xylophoneShift(lowest: number, highest: number): number {
  const [low, high] = XYLOPHONE.keys;
  if (lowest >= low && highest <= high) {
    return 0;
  }
  return 12 * Math.floor((high - highest) / 12);
}

/**
 * Gives the bar of a key of a xylophone part: the key after the octave shift of the part, moved by
 * octaves into the bars when the part is wider than the bars.
 *
 * @param pitch The MIDI key of the note.
 * @param shift The octave shift of the part ({@link xylophoneShift}), in semitones.
 * @returns The MIDI key of the bar.
 */
function xylophoneBar(pitch: number, shift: number): number {
  const [low, high] = XYLOPHONE.keys;
  let key = pitch + shift;
  while (key < low) {
    key += 12;
  }
  while (key > high) {
    key -= 12;
  }
  return key;
}

/**
 * Gives the key of the target of a note: the index of the kettle of the timpani, the MIDI key of
 * the bar of the xylophone, 1 for the tambourine and 0 for the triangle, and 0 for a drum or the
 * cymbals.
 *
 * @param instrument The instrument.
 * @param pitch The MIDI key of the note.
 * @param kettles The number of kettles of the timpani.
 * @param shift The octave shift of a xylophone part ({@link xylophoneShift}), in semitones.
 * @returns The key of the target.
 */
export function targetKeyOf(
  instrument: PercussionInstrument,
  pitch: number,
  kettles = 4,
  shift = 0,
): number {
  switch (instrument) {
    case 'timpani':
      return kettleOf(pitch, kettles);
    case 'xylophone':
      return xylophoneBar(pitch, shift);
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
 * Gives the two kettles beside the front gap of the timpani (design 4.6): the last kettle at the
 * left of the gap and the first kettle at its right (`buildTimpani()`).
 *
 * @param kettles The number of kettles.
 * @returns The index of the left kettle and of the right kettle, 0 for the largest.
 */
export function frontKettles(kettles: number): readonly [number, number] {
  const split = Math.ceil(kettles / 2);
  return [split - 1, split];
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
 * Gives the two hands of a pair of hand cymbals, and sets the crash target (design 5.3): the
 * inner faces meet at the crash point, along the crash normal of `PERCUSSION_PLACES.plateTurn`.
 *
 * @param model The player with the hand cymbals.
 * @param left The left arm.
 * @param right The right arm.
 * @param inH Gives a vector in head heights in meters.
 * @param targets Gets the crash target as key 0.
 * @returns The left and the right hand.
 * @throws Error if a cymbal has no target of its inner face.
 */
function pairOfPlates(
  model: PlayerModel,
  left: ArmRig,
  right: ArmRig,
  inH: (v: Vec3) => Vector3,
  targets: Map<number, StrikeTarget>,
): readonly [PercussionSide, PercussionSide] {
  const middle = new Vector3(...left.bind.shoulder)
    .add(new Vector3(...right.bind.shoulder))
    .multiplyScalar(0.5);
  const crash = inH(PERCUSSION_PLACES.crash).add(middle);
  const plateTurn = PERCUSSION_PLACES.plateTurn;
  const normal = new Vector3(1, 0, 0).applyQuaternion(new Quaternion(...plateTurn));
  targets.set(0, { point: toVec3(crash), normal: toVec3(normal) });
  const face = (bone: 'malletL' | 'malletR'): Vec3 =>
    bindTarget(
      model,
      findTarget(model, (t) => t.kind === 'plate' && t.bone === bone),
    ).point;
  return [
    { kind: 'plate', arm: left, face: face('malletL'), sign: -1, turn: plateTurn },
    { kind: 'plate', arm: right, face: face('malletR'), sign: 1, turn: plateTurn },
  ];
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
  // A suspended cymbal has a target on its top, and the pair of hand cymbals has none.
  const suspended =
    instrument === 'cymbals' && model.instrument.targets.some((t) => t.kind === 'head');
  const hold: PercussionHold = suspended ? SUSPENDED_CYMBAL_HOLD : PERCUSSION_HOLDS[instrument];
  const h = model.body.headHeight;
  const left = armRig(model, 'L');
  const right = armRig(model, 'R');
  const inH = (v: Vec3): Vector3 => new Vector3(...v).multiplyScalar(h);
  const fromShoulder = (arm: ArmRig, v: Vec3): Vector3 =>
    inH(v).add(new Vector3(...arm.bind.shoulder));
  const malletHead = (bone: 'malletL' | 'malletR'): Vec3 =>
    bindTarget(
      model,
      findTarget(model, (t) => t.kind === 'mallet-head' && t.bone === bone),
    ).point;
  // The grip is the origin of the mallet bone.
  const malletLength = (bone: 'malletL' | 'malletR'): number => {
    const head = malletHead(bone);
    const grip = model.skeleton.positions[boneIndex(bone)] ?? head;
    return new Vector3(...head).distanceTo(new Vector3(...grip));
  };
  // The x of the home points to the out side of the hand.
  const homeOf = (arm: ArmRig): Vec3 => {
    const [x, y, z] = hold.home;
    return [arm.side === 'L' ? -x : x, y, z];
  };
  // The slant of a mallet in the bind pose toward the wrist, against the bind forearm.
  const malletTilt = (arm: ArmRig, turn: Quaternion): number => {
    const forearm = new Vector3(...arm.bind.wrist).sub(new Vector3(...arm.bind.elbow)).normalize();
    const along = new Vector3(1, 0, 0).applyQuaternion(turn);
    return Math.asin(MathUtils.clamp(along.dot(forearm), -1, 1));
  };
  const mallet = (arm: ArmRig, bone: 'malletL' | 'malletR'): PercussionSide => {
    const turn = new Quaternion(
      ...(model.pieces.find((placed) => placed.piece.bone === bone)?.at.rotation ?? IDENTITY),
    );
    return {
      kind: 'mallet',
      arm,
      head: malletHead(bone),
      home: toVec3(fromShoulder(arm, homeOf(arm))),
      top: hold.top,
      across: hold.across,
      tilt: malletTilt(arm, turn),
      length: malletLength(bone),
      inverse: toQuat(turn.clone().invert()),
    };
  };
  const targets = new Map<number, StrikeTarget>();
  const heads = model.instrument.targets.filter((t) => t.kind === 'head');
  let sides: readonly [PercussionSide, PercussionSide];
  switch (instrument) {
    case 'timpani':
      for (const [i, head] of heads.entries()) {
        const move = hold.rim > 0 ? kettleHeadRadius(i) - hold.rim : 0;
        targets.set(i, towardPlayer(bindTarget(model, head), move));
      }
      sides = [mallet(left, 'malletL'), mallet(right, 'malletR')];
      break;
    case 'cymbals':
      if (suspended) {
        targets.set(
          0,
          bindTarget(
            model,
            findTarget(model, (t) => t.kind === 'head'),
          ),
        );
        sides = [mallet(left, 'malletL'), mallet(right, 'malletR')];
      } else {
        sides = pairOfPlates(model, left, right, inH, targets);
      }
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
    case 'small-percussion': {
      // The left hand holds the clip of the triangle in front of the chest.
      const clip = fromShoulder(left, PERCUSSION_PLACES.triangleClip);
      const clipBind = model.skeleton.positions[boneIndex('malletL')] ?? toVec3(clip);
      const hand = new Quaternion(...PERCUSSION_PLACES.triangleHand);
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
      sides = [
        { kind: 'hold', arm: left, wrist, hand: PERCUSSION_PLACES.triangleHand },
        mallet(right, 'malletR'),
      ];
      break;
    }
    default: {
      const unhandled: never = instrument;
      throw new Error(`The instrument "${String(unhandled)}" is not percussion.`);
    }
  }
  const ordered = [...targets.values()].toSorted((a, b) => a.point[0] - b.point[0]);
  const fallback: StrikeTarget = { point: [0, 0, 0], normal: [0, 1, 0] };
  // With a pair of front kettles, each hand rests over its front kettle.
  const [frontL, frontR] = frontKettles(targets.size);
  const pair = instrument === 'timpani' && hold.pair;
  const restL = (pair ? targets.get(frontL) : undefined) ?? ordered[0] ?? fallback;
  const restR = (pair ? targets.get(frontR) : undefined) ?? ordered.at(-1) ?? fallback;
  return {
    instrument,
    hold,
    chestBind: model.skeleton.positions[boneIndex('chest')] ?? [0, 0, 0],
    left: sides[0],
    right: sides[1],
    targets,
    restL: offsetTarget(restL, hold.offsetL),
    restR: offsetTarget(restR, hold.offsetR),
    hangL: hangingArm(model, left),
    hangR: hangingArm(model, right),
    legs: hold.side ? plantedLegs(model) : null,
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
 * Gives the directions across a forearm (design 5.3), in the frame of the elbow: the hinge of the
 * elbow is normal to the upper arm and the forearm, as the studio skin turns its forearm
 * (`poseStudioBones()`). `up` is the direction in which a mallet leaves the fist with no twist
 * of the paw on the forearm: in the bind pose, the hinge is +x, the forearm points down, and the
 * mallet points forward. `out` is the hinge, turned to the out side of the hand.
 *
 * @param forearm The unit direction of the forearm, from the elbow to the wrist.
 * @param upper The direction of the upper arm, from the shoulder to the elbow.
 * @param side The side of the hand: its out side is -x for the left hand.
 * @param up Gets the unit direction of the mallet with no twist.
 * @param out Gets the unit direction out across the forearm, normal to `up`.
 */
export function acrossAxes(
  forearm: Vector3,
  upper: Vector3,
  side: 'L' | 'R',
  up: Vector3,
  out: Vector3,
): void {
  out.crossVectors(upper, forearm);
  if (out.lengthSq() < 1e-8) {
    out.set(1, 0, 0);
  }
  out.normalize();
  up.crossVectors(out, forearm).normalize();
  if ((side === 'L' ? -1 : 1) * out.x < 0) {
    out.negate();
  }
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
