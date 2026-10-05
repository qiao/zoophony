import { add, rotate, sub } from '../models/math.ts';
import type { Vec3 } from '../models/math.ts';
import type { PlayerModel } from '../models/player.ts';
import { BONE_NAMES, boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import { placePoint } from '../models/instruments/hold.ts';
import type { PiecePoint } from '../models/instruments/types.ts';
import { chainFrames, posePoint } from './frames.ts';
import type { Frame } from './frames.ts';
import type { PosePlan } from './plan.ts';
import { createScenePose, poseAt } from './pose-at.ts';
import { PLAYING } from './test-scene.ts';
import type { AnimalPose } from './types.ts';

/** A posed skeleton: the frame of each bone. Only tests use it. */
export interface PosedSkeleton {
  readonly model: PlayerModel;
  readonly frames: readonly Frame[];
}

/**
 * Calculates the frames of all bones of a posed player, with the move of the trombone slide.
 * Only tests use this function, so it does not enter the first download.
 *
 * @param model The player model.
 * @param pose The pose.
 * @returns The posed skeleton.
 */
export function poseSkeleton(model: PlayerModel, pose: AnimalPose): PosedSkeleton {
  const frames = chainFrames(model.skeleton, pose.rotations, BONE_NAMES.length, pose.rootOffset);
  // The scene adds the slide offset to the bind position of the slide bone, in the axes of its
  // parent, the instrument bone (design 5.1).
  const slide = boneIndex('slide');
  const instrument = frames[boneIndex('instrument')];
  const own = frames[slide];
  const positions = model.skeleton.positions;
  if (instrument && own) {
    const bind = sub(
      positions[slide] ?? [0, 0, 0],
      positions[boneIndex('instrument')] ?? [0, 0, 0],
    );
    frames[slide] = {
      rotation: own.rotation,
      position: add(instrument.position, rotate(instrument.rotation, add(bind, pose.slideOffset))),
    };
  }
  return { model, frames };
}

/**
 * Moves a bind point of a bone to its posed place.
 *
 * @param posed The posed skeleton.
 * @param bone The bone that the point follows.
 * @param point The bind point, in the model axes.
 * @returns The posed point.
 * @throws Error if the bone has no frame.
 */
export function posedPoint(posed: PosedSkeleton, bone: BoneName, point: Vec3): Vec3 {
  const i = boneIndex(bone);
  const frame = posed.frames[i];
  if (!frame) {
    throw new Error(`The bone "${bone}" has no frame.`);
  }
  return posePoint(frame, posed.model.skeleton.positions[i] ?? [0, 0, 0], point);
}

/**
 * Moves a point of an instrument piece to its posed place.
 *
 * @param posed The posed skeleton.
 * @param point The point on its piece.
 * @returns The posed point.
 */
export function posedPiecePoint(posed: PosedSkeleton, point: PiecePoint): Vec3 {
  return posedPoint(posed, point.bone, placePoint(posed.model.pieces, point));
}

/** The step of the samples of the pose timing tests: 0.5 ms (design 9.7). */
export const SAMPLE_STEP = 0.0005;

/** A measure of one posed player at one song time. */
export interface PoseSample {
  readonly time: number;
  readonly value: Vec3;
}

/**
 * Samples a measure of one player every {@link SAMPLE_STEP} of song time, while it plays at the
 * wall time 10 s. `poseAt()` reads the seat from the player plan, so a plan with only this player
 * gives the same pose, and each sample poses one player.
 *
 * @param plan The plan of the score.
 * @param index The index of the player in the plan.
 * @param from The first song time.
 * @param to The last song time.
 * @param measure Gives the measure of a pose.
 * @returns The samples, sorted by time.
 * @throws Error if the plan has no player at the index.
 */
export function sampleAround(
  plan: PosePlan,
  index: number,
  from: number,
  to: number,
  measure: (pose: AnimalPose) => Vec3,
): PoseSample[] {
  const player = plan.players[index];
  if (!player) {
    throw new Error(`The plan has no player ${index}.`);
  }
  const one: PosePlan = { ...plan, players: [player] };
  const buffer = createScenePose(one);
  const samples: PoseSample[] = [];
  for (let time = from; time <= to; time += SAMPLE_STEP) {
    const pose = poseAt(one, time, 10, PLAYING, [], buffer).players[0];
    if (!pose) {
      throw new Error('The player has no pose.');
    }
    samples.push({ time, value: measure(pose) });
  }
  return samples;
}

/**
 * Finds the first sample at which a motion starts or stops: the first sample after which the
 * motion has the given state, while it did not have that state before the sample.
 *
 * @param samples The samples, sorted by time.
 * @param moves Tells whether the measure moves from one sample to the next.
 * @param starts `true` to find a start of the motion, `false` to find a stop.
 * @returns The time of the sample, or `null` if the motion does not change in the samples.
 */
export function firstChange(
  samples: readonly PoseSample[],
  moves: (from: Vec3, to: Vec3) => boolean,
  starts: boolean,
): number | null {
  const moving = (k: number): boolean => {
    const a = samples[k];
    const b = samples[k + 1];
    return a && b ? moves(a.value, b.value) : false;
  };
  for (let k = 1; k + 1 < samples.length; k++) {
    if (moving(k) === starts && moving(k - 1) !== starts) {
      return samples[k]?.time ?? null;
    }
  }
  return null;
}
