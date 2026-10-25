import { MathUtils, Quaternion, Vector3 } from 'three';

import type { Vec3 } from '../models/tuples.ts';
import type { PlayerNote } from '../score/types.ts';
import { mixDirection, mixRotation } from './blend.ts';
import { createFrame, setFromBasis } from './frames.ts';
import type { Frame, TorsoFrames } from './frames.ts';
import { hangingHand, hangingWrist } from './hang.ts';
import type { HangingArm } from './hang.ts';
import { limitReach, poseShoulder, solveTwoBone, writeArm, writeCurl } from './ik.ts';
import { groupChords } from './note-groups.ts';
import {
  GRIP_CURL,
  acrossAxes,
  frontKettles,
  offsetTarget,
  targetKeyOf,
  xylophoneShift,
} from './percussion-rig.ts';
import type { PercussionRig, PercussionSide } from './percussion-rig.ts';
import { buildSideTrack } from './side-move.ts';
import type { SideTrack } from './side-move.ts';
import { alternateHands, buildStrikeTrack } from './strikes.ts';
import type { Strike, StrikeGroup, StrikeState, StrikeTarget, StrikeTrack } from './strikes.ts';

/** The strike data of the two hands. A hand with no strikes has `null`. */
interface PercussionTracks {
  readonly left: StrikeTrack | null;
  readonly right: StrikeTrack | null;
  /** The side move of the body behind the notes (`PercussionHold.side`), or `null`. */
  readonly side: SideTrack | null;
}

/**
 * Calculates the strike data of the two hands of a percussion player (design 5.3). The notes that
 * start within 50 ms of each other strike together. A drum player strikes its own instrument for
 * each of its notes, also for the notes of another key group (design 3.8). Of a chord of the
 * small percussion player, the triangle sounds unless all notes are the tambourine. A timpani
 * hold with a pair of front kettles (`PercussionHold.pair`) plays each note on one of them. A
 * hold with a side move (`PercussionHold.side`) moves the body toward the mean side place of the
 * targets of each strike group.
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
  // With a pair of front kettles, a note below the middle key of the part plays on the left one.
  const pair = instrument === 'timpani' && hold.pair;
  const [frontL, frontR] = frontKettles(kettles);
  let lowest = Infinity;
  let highest = -Infinity;
  for (const note of notes) {
    lowest = Math.min(lowest, note.pitch);
    highest = Math.max(highest, note.pitch);
  }
  const middle = (lowest + highest) / 2;
  const shift = instrument === 'xylophone' ? xylophoneShift(lowest, highest) : 0;
  const keyOf = (pitch: number): number =>
    pair ? (pitch < middle ? frontL : frontR) : targetKeyOf(instrument, pitch, kettles, shift);
  const groups = groupChords(notes, loudness).map((group): StrikeGroup => {
    const keys = new Set<number>();
    for (const note of notes.slice(group.first, group.first + group.count)) {
      keys.add(keyOf(note.pitch));
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
  const side = hold.side
    ? buildSideTrack(
        hold.side,
        groups.flatMap((g) =>
          g.targets.length > 0
            ? [
                {
                  start: g.start,
                  place: g.targets.reduce((sum, t) => sum + t.point[0], 0) / g.targets.length,
                },
              ]
            : [],
        ),
      )
    : null;
  // With a gap, a hand waits at its rest target before its first strike, and the other hand keeps
  // the gap from that place.
  const waits = hold.gap > 0;
  const track = (strikes: readonly Strike[], offset: Vec3, rest: StrikeTarget): StrikeTrack =>
    buildStrikeTrack(
      strikes.map((s) => ({ ...s, point: offsetTarget(s, offset).point })),
      strikes[0] && !waits ? offsetTarget(strikes[0], offset) : rest,
      hold.sizes,
      amplitude,
    );
  if (hold.hands === 'alternate' || hold.hands === 'sides') {
    const [left, right] = alternateHands(
      groups,
      hold.hands === 'sides' ? 0 : undefined,
      hold.gap,
      waits ? [rig.restL.point[0], rig.restR.point[0]] : undefined,
    );
    return {
      left: track(left, hold.offsetL, rig.restL),
      right: track(right, hold.offsetR, rig.restR),
      side,
    };
  }
  const strikes = groups.flatMap((g): Strike[] => {
    const target = g.targets[0];
    return target ? [{ ...target, start: g.start, loudness: g.loudness }] : [];
  });
  const one = track(strikes, hold.offsetR, rig.restR);
  return hold.hands === 'pair' ? { left: one, right: one, side } : { left: null, right: one, side };
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
const grip = new Vector3();
const level = new Vector3();
const swing = new Quaternion();
const inverse = new Quaternion();
const UP = new Vector3(0, 1, 0);
const strikeAlong = new Vector3();
const forearm = new Vector3();
const upperArm = new Vector3();
const acrossUp = new Vector3();
const acrossOut = new Vector3();
const elbowBind = new Vector3();
const shoulderBind = new Vector3();
const turnedPole = new Vector3();
const joints = { elbow: new Vector3(), wrist: new Vector3() };

/**
 * Writes the wrist and the world rotation of a hand with a mallet across the forearm between
 * strikes (`PercussionHold.across`, design 5.3). At a strike, the mallet points from the home of
 * the hand to the target, and the grip stays at that place. The paw at rest holds the mallet
 * across the forearm, at its angle in the frame of the elbow, with the top of the grip along the
 * forearm toward the elbow, and the wrist lifts the head by `MalletAcross.lift`. Between the
 * two, the paw turns around the grip by a share of the smallest turn from the rest direction to
 * the strike direction. With `MalletAcross.pitch`, the paw keeps the turn of the strike, and the
 * wrist lifts the head by a share of the pitch around the level axis normal to the forearm, so
 * that the tip stays over its spot. The forearm comes from the
 * two-bone solution to the wrist, two times, because the wrist follows the turn of the paw. The
 * function writes the module vectors `wrist` and `turn`, and it writes the head into `point`.
 *
 * @param side The hand with a mallet across the forearm.
 * @param point The target of the mallet head. The function writes the head into it.
 * @param share The share of the turn toward the rest direction, from 0 at a strike to 1.
 * @param joint The posed shoulder joint of the side.
 * @param pole The direction to which the elbow points, in the model axes.
 */
function acrossHand(
  side: Extract<PercussionSide, { kind: 'mallet' }>,
  point: Vector3,
  share: number,
  joint: Vector3,
  pole: Vector3,
): void {
  const { across, arm } = side;
  if (!across) {
    return;
  }
  strikeAlong.copy(point).sub(offset.fromArray(side.home)).normalize();
  grip.copy(point).addScaledVector(strikeAlong, -side.length);
  shoulderBind.fromArray(arm.bind.shoulder);
  elbowBind.fromArray(arm.bind.elbow);
  const upper = elbowBind.distanceTo(shoulderBind);
  const lower = wristBind.fromArray(arm.bind.wrist).distanceTo(elbowBind);
  wrist.copy(grip);
  for (let pass = 0; pass < 2; pass++) {
    solveTwoBone(joint, wrist, upper, lower, pole, joints);
    forearm.subVectors(joints.wrist, joints.elbow).normalize();
    acrossAxes(forearm, upperArm.subVectors(joints.elbow, joint), arm.side, acrossUp, acrossOut);
    // The rest direction across the forearm, and the paw that holds it with no swing. A mallet
    // that slants toward the wrist in the bind pose keeps that slant.
    along
      .copy(acrossUp)
      .multiplyScalar(Math.cos(across.rest))
      .addScaledVector(acrossOut, Math.sin(across.rest))
      .multiplyScalar(Math.cos(side.tilt))
      .addScaledVector(forearm, Math.sin(side.tilt));
    top.copy(forearm).negate();
    top.addScaledVector(along, -top.dot(along)).normalize();
    setFromBasis(turn, along, top).multiply(inverse.fromArray(side.inverse));
    // The wrist lifts the head: a turn of the paw around the level axis normal to the forearm,
    // with no twist on the forearm.
    level.crossVectors(forearm, UP);
    if (across.lift !== 0 && level.lengthSq() > 1e-8) {
      swing.setFromAxisAngle(level.normalize(), across.lift);
      turn.premultiply(swing);
      along.applyQuaternion(swing);
    }
    // The smallest turn from the rest direction to the strike direction, by the share left.
    swing.setFromUnitVectors(along, strikeAlong).slerp(NO_TURN, across.pitch === null ? share : 0);
    turn.premultiply(swing);
    along.applyQuaternion(swing);
    // With a pitch, the paw keeps the turn of the strike, and the wrist lifts the head over its
    // spot by a share of the pitch.
    level.crossVectors(forearm, UP);
    if (across.pitch !== null && level.lengthSq() > 1e-8) {
      swing.setFromAxisAngle(level.normalize(), across.pitch * share);
      turn.premultiply(swing);
      along.applyQuaternion(swing);
    }
    point.copy(grip).addScaledVector(along, side.length);
    offset.fromArray(side.head).sub(wristBind.fromArray(arm.bind.wrist)).applyQuaternion(turn);
    wrist.copy(point).sub(offset);
  }
}

/**
 * Writes the wrist and the world rotation of a hand with a mallet (design 5.3). The head is at
 * the height of the strike state above its target, and the mallet points from the home of the
 * hand to the head. The top of the mallet points up or toward the shoulder joint
 * (`PercussionHold.top`). The function writes the module vectors `wrist` and `turn`, and it
 * changes `point`.
 *
 * @param side The hand with a mallet.
 * @param point The target of the mallet head. The function writes the head into it.
 * @param hand The strike state of the hand.
 * @param joint The posed shoulder joint of the side.
 */
function malletHand(
  side: Extract<PercussionSide, { kind: 'mallet' }>,
  point: Vector3,
  hand: StrikeState,
  joint: Vector3,
): void {
  point.addScaledVector(offset.fromArray(hand.normal), hand.height);
  along.copy(point).sub(offset.fromArray(side.home)).normalize();
  if (side.top === 'shoulder') {
    top.subVectors(joint, point).normalize();
  } else {
    top.set(0, 1, 0);
  }
  top.addScaledVector(along, -top.dot(along));
  if (top.length() > 1e-6) {
    top.normalize();
  } else {
    top.set(0, 0, 1);
  }
  setFromBasis(turn, along, top).multiply(inverse.fromArray(side.inverse));
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
  const play = side.kind === 'free' ? 0 : rig.hold.ready ? 1 : weight;

  head.fromArray(hand.point);
  if (side.kind === 'mallet' && side.across) {
    const rest = rig.hold.sizes.rest;
    const share = MathUtils.clamp(rest > 0 ? hand.height / rest : 0, 0, 1);
    turnedPole.fromArray(pole).applyQuaternion(chest.rotation);
    acrossHand(side, head, share, shoulder.position, turnedPole);
  } else if (side.kind === 'mallet') {
    malletHand(side, head, hand, shoulder.position);
  } else if (side.kind === 'plate') {
    head.addScaledVector(offset.fromArray(hand.normal), side.sign * hand.height);
    turn.fromArray(side.turn);
    offset.fromArray(side.face).sub(wristBind.fromArray(arm.bind.wrist)).applyQuaternion(turn);
    wrist.subVectors(head, offset);
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
 * to the place of its strike state, and the two-bone IK places each arm. The cymbals keep
 * one turn from the bind pose (`PERCUSSION_PLACES.plateTurn`), and their inner faces meet at the crash point at the note start. In the
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
