import {
  DEG,
  add,
  axisAngle,
  invert,
  length,
  multiply,
  rotate,
  rotationBetween,
  sub,
} from '../models/math.ts';
import { IDENTITY } from '../models/tuples.ts';
import type { Quat, Vec3 } from '../models/tuples.ts';
import type { PlayerModel } from '../models/player.ts';
import { BONE_NAMES, boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import type { SceneLayout } from '../models/layout.ts';
import type { SpeciesId } from '../models/species.ts';
import { placePoint } from '../models/instruments/hold.ts';
import type { InstrumentId } from '../models/instruments/types.ts';
import { solveTwoBone } from '../pose/ik.ts';
import { preparePoses } from '../pose/plan.ts';
import { poseAt } from '../pose/pose-at.ts';
import type { AnimalPose, Transport } from '../pose/types.ts';
import type { Score } from '../score/types.ts';

/** The target of one hand of a static pose, in the axes of the model. */
export interface HandTarget {
  /** The place of the wrist: the `hand` bone. */
  readonly wrist: Vec3;
  /** The world rotation of the hand. */
  readonly hand: Quat;
  /** The direction to which the elbow points. */
  readonly pole: Vec3;
}

/** The bones that `poseAt()` turns to look at the conductor or for the idle motion. */
const LOOK_BONES: readonly BoneName[] = ['neck', 'head', 'earL', 'earR', 'tail1', 'tail2'];

/** A transport that plays since long before the time of the pose. */
const PLAYING: Transport = { playing: true, changedAtWall: -100, previousChangeAtWall: null };

/** The share of a note at which the views page takes the pose of a player. */
const NOTE_SHARE = 0.4;

/**
 * Makes a pose from world rotations of some bones. Each other bone keeps no turn of its own.
 *
 * @param model The player model.
 * @param world The world rotation of each posed bone.
 * @returns The pose, with one rotation for each bone relative to its parent.
 */
function poseOfWorld(model: PlayerModel, world: ReadonlyMap<BoneName, Quat>): AnimalPose {
  const rotations = new Float32Array(BONE_NAMES.length * 4);
  const worldOf: Quat[] = [];
  for (const [i, name] of BONE_NAMES.entries()) {
    const parent = model.skeleton.parents[i] ?? -1;
    const parentWorld = parent >= 0 ? (worldOf[parent] ?? IDENTITY) : IDENTITY;
    const target = world.get(name);
    const turn = target ? multiply(invert(parentWorld), target) : IDENTITY;
    worldOf.push(target ?? parentWorld);
    rotations.set(turn, i * 4);
  }
  return { rotations, rootOffset: [0, 0, 0], slideOffset: [0, 0, 0], blink: 0 };
}

/**
 * Calculates a static pose that puts each wrist on its target with the two-bone IK (design 4.7).
 *
 * @param model The player model.
 * @param hands The target of the left and of the right hand. `null` keeps the arm down.
 * @returns The pose.
 */
export function armsPose(
  model: PlayerModel,
  hands: { readonly L: HandTarget | null; readonly R: HandTarget | null },
): AnimalPose {
  const at = (name: BoneName): Vec3 => model.skeleton.positions[boneIndex(name)] ?? [0, 0, 0];
  const world = new Map<BoneName, Quat>();
  for (const side of ['L', 'R'] as const) {
    const target = hands[side];
    if (!target) {
      continue;
    }
    const shoulder = at(`upperArm${side}`);
    const elbow = at(`forearm${side}`);
    const wrist = at(`hand${side}`);
    const joints = solveTwoBone(
      shoulder,
      target.wrist,
      length(sub(elbow, shoulder)),
      length(sub(wrist, elbow)),
      target.pole,
    );
    world.set(
      `upperArm${side}`,
      rotationBetween(sub(elbow, shoulder), sub(joints.elbow, shoulder)),
    );
    world.set(
      `forearm${side}`,
      rotationBetween(sub(wrist, elbow), sub(joints.wrist, joints.elbow)),
    );
    world.set(`hand${side}`, target.hand);
  }
  return poseOfWorld(model, world);
}

/**
 * Calculates the pose of a wind player that holds the grips of its instrument with bent elbows
 * near the body. The pose of the winds in step 5 replaces it.
 *
 * @param model The player model.
 * @returns The pose, or `null` if the instrument has no grip for a palm.
 */
export function gripPose(model: PlayerModel): AnimalPose | null {
  const { grips } = model.instrument;
  if (!grips.palmL && !grips.palmR) {
    return null;
  }
  const target = (
    grip: typeof grips.palmL,
    palm: Vec3,
    wristBone: BoneName,
    out: number,
  ): HandTarget | null => {
    if (!grip) {
      return null;
    }
    const wrist = model.skeleton.positions[boneIndex(wristBone)] ?? [0, 0, 0];
    // The palm turns to the instrument, and the elbow points down and a little out and back.
    const hand = axisAngle([0, 0, 1], -out * 60 * DEG);
    return {
      wrist: sub(placePoint(model.pieces, grip), rotate(hand, sub(palm, wrist))),
      hand,
      pole: [out * 0.35, -1, 0.5],
    };
  };
  return armsPose(model, {
    L: target(grips.palmL, model.body.palmL, 'handL', -1),
    R: target(grips.palmR, model.body.palmR, 'handR', 1),
  });
}

/**
 * Calculates the pose of the conductor with the baton raised in the right hand and the left hand
 * low in front of the body, as the bear of `animals.webp`.
 *
 * @param model The model of the conductor.
 * @returns The pose.
 */
export function conductorPose(model: PlayerModel): AnimalPose {
  const h = model.body.headHeight;
  const at = (name: BoneName): Vec3 => model.skeleton.positions[boneIndex(name)] ?? [0, 0, 0];
  return armsPose(model, {
    // The right wrist is beside the head, and the baton points up and a little out.
    R: {
      wrist: add(at('upperArmR'), [0.45 * h, 0.45 * h, -0.45 * h]),
      hand: multiply(axisAngle([0, 0, 1], -15 * DEG), axisAngle([1, 0, 0], 100 * DEG)),
      pole: [1, -0.6, 0.4],
    },
    L: {
      wrist: add(at('upperArmL'), [-0.05 * h, -0.75 * h, -0.55 * h]),
      hand: axisAngle([1, 0, 0], 50 * DEG),
      pole: [-0.6, -1, 0.4],
    },
  });
}

/**
 * Calculates the playing pose of each bowed string player of a score at a moment of play, with
 * the pose function of step 5 (design 5.1). The head looks to the front, and the idle motion
 * rests.
 *
 * @param score The score of a demo.
 * @param layout The layout of the score.
 * @returns The pose of the first player of each species and instrument that plays a note.
 */
export function playingPoses(
  score: Score,
  layout: SceneLayout,
): Map<`${SpeciesId} ${InstrumentId}`, AnimalPose> {
  const plan = preparePoses(score, layout, 1);
  const poses = new Map<`${SpeciesId} ${InstrumentId}`, AnimalPose>();
  for (const [i, place] of layout.players.entries()) {
    const key = `${place.cast.species} ${place.cast.instrument}` as const;
    if (poses.has(key)) {
      continue;
    }
    const note = score.notes.find(
      (n) => n.seatIndex === place.cast.seatIndex && n.player === place.cast.player,
    );
    if (!note) {
      continue;
    }
    const time = note.startSec + NOTE_SHARE * (note.endSec - note.startSec);
    const pose = poseAt(plan, time, 0, PLAYING, []).players[i];
    if (!pose) {
      continue;
    }
    const rotations = Float32Array.from(pose.rotations);
    for (const bone of LOOK_BONES) {
      rotations.set(IDENTITY, boneIndex(bone) * 4);
    }
    poses.set(key, {
      rotations,
      rootOffset: pose.rootOffset,
      slideOffset: pose.slideOffset,
      blink: 0,
    });
  }
  return poses;
}
