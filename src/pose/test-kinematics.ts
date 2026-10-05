import { add, rotate, sub } from '../models/math.ts';
import type { Vec3 } from '../models/math.ts';
import type { PlayerModel } from '../models/player.ts';
import { BONE_NAMES, boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import { placePoint } from '../models/instruments/hold.ts';
import type { PiecePoint } from '../models/instruments/types.ts';
import { chainFrames, posePoint } from './frames.ts';
import type { Frame } from './frames.ts';
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
