import { Quaternion, Vector3 } from 'three';

import type { Vec3 } from '../models/tuples.ts';
import type { PlayerNote } from '../score/types.ts';
import { mixDirection, mixRotation } from './blend.ts';
import { createFrame, setFromBasis } from './frames.ts';
import type { Frame, TorsoFrames } from './frames.ts';
import { hangingHand, hangingWrist } from './hang.ts';
import type { HangingArm } from './hang.ts';
import { limitReach, poseShoulder, writeArm, writeCurl } from './ik.ts';
import { groupChords } from './note-groups.ts';
import { GRIP_CURL, MALLET_INVERSE, offsetTarget, targetKeyOf } from './percussion-rig.ts';
import type { PercussionRig, PercussionSide } from './percussion-rig.ts';
import { alternateHands, buildStrikeTrack } from './strikes.ts';
import type { Strike, StrikeGroup, StrikeState, StrikeTarget, StrikeTrack } from './strikes.ts';

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
      strikes.map((s) => ({ ...s, point: offsetTarget(s, offset).point })),
      strikes[0] ? offsetTarget(strikes[0], offset) : rest,
      hold.sizes,
      amplitude,
    );
  if (hold.hands === 'alternate' || hold.hands === 'sides') {
    const [left, right] = alternateHands(groups, hold.hands === 'sides' ? 0 : undefined);
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

/** The rotation that changes nothing. Nothing writes it. */
const NO_TURN = new Quaternion();

const shoulder = createFrame();
const wrist = new Vector3();
const turn = new Quaternion();
const hanging = new Vector3();
const restHand = new Quaternion();
const poleMix = new Vector3();
const polePlay = new Vector3();
const poleTuple: [number, number, number] = [0, 0, 0];
const head = new Vector3();
const along = new Vector3();
const top = new Vector3();
const offset = new Vector3();
const wristBind = new Vector3();

/**
 * Writes the wrist and the world rotation of a hand with a mallet whose head is at a point. The
 * mallet points from the home of the hand to the head, with its top up. The function writes the
 * module vectors `wrist` and `turn`.
 *
 * @param side The hand with a mallet.
 * @param point The point of the mallet head.
 */
function malletHand(side: Extract<PercussionSide, { kind: 'mallet' }>, point: Vector3): void {
  along.copy(point).sub(offset.fromArray(side.home)).normalize();
  top.set(0, 1, 0).addScaledVector(along, -along.y);
  if (top.length() > 1e-6) {
    top.normalize();
  } else {
    top.set(0, 0, 1);
  }
  setFromBasis(turn, along, top).multiply(MALLET_INVERSE);
  offset.fromArray(side.head).sub(wristBind.fromArray(side.arm.bind.wrist)).applyQuaternion(turn);
  wrist.copy(point).sub(offset);
}

/**
 * Writes one arm and its fingers. An arm with no instrument hangs, also while the player plays.
 *
 * @param rig The points of the player.
 * @param side The hand.
 * @param hang The arm of the rest pose.
 * @param hand The strike state of the hand.
 * @param pole The direction to which the elbow points while the player plays.
 * @param chest The posed frame of the chest.
 * @param weight The eased weight of the playing pose.
 * @param rotations The rotations of the pose to write.
 */
function poseHand(
  rig: PercussionRig,
  side: PercussionSide,
  hang: HangingArm,
  hand: StrikeState,
  pole: Vec3,
  chest: Frame,
  weight: number,
  rotations: Float32Array,
): void {
  const { arm } = side;
  poseShoulder(arm, chest, rig.chestBind, NO_TURN, shoulder);
  hangingWrist(hang, shoulder, hanging);
  hangingHand(hang, shoulder, restHand);
  const play = side.kind === 'free' ? 0 : weight;

  head.fromArray(hand.point);
  if (side.kind === 'mallet') {
    malletHand(side, head.addScaledVector(offset.fromArray(hand.normal), hand.height));
  } else if (side.kind === 'plate') {
    head.addScaledVector(offset.fromArray(hand.normal), side.sign * hand.height);
    wrist.fromArray(side.face).sub(offset.fromArray(arm.bind.wrist));
    wrist.subVectors(head, wrist);
    turn.identity();
  } else if (side.kind === 'hold') {
    wrist.fromArray(side.wrist);
    turn.fromArray(side.hand);
  } else {
    wrist.copy(hanging);
    turn.copy(restHand);
  }
  limitReach(arm, shoulder.position, wrist);

  // The elbow of the hanging arm points back and out.
  mixDirection(poleMix.fromArray(hang.pole), polePlay.fromArray(pole), play, poleMix);
  poleMix.toArray(poleTuple);
  writeArm(
    {
      arm,
      shoulder,
      wrist: wrist.lerpVectors(hanging, wrist, play),
      hand: mixRotation(restHand, turn, play, turn),
      pole: poleTuple,
    },
    chest.rotation,
    rotations,
  );
  writeCurl(arm, GRIP_CURL * play, rotations);
}

/**
 * Writes the arms and the fingers of a percussion player (design 5.3, 4.7). Each mallet head goes
 * to the place of its strike state, and the two-bone IK places each arm. The cymbals keep the
 * turn of the bind pose, and their inner faces meet at the crash point at the note start. In the
 * rest pose, the arms hang a little out to the sides, clear of the body (design 5.2).
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
  poseHand(rig, rig.left, rig.hangL, state.left, rig.hold.poleL, chest, weight, rotations);
  poseHand(rig, rig.right, rig.hangR, state.right, rig.hold.poleR, chest, weight, rotations);
}
