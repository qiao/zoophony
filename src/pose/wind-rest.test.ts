import { MathUtils, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { buildPlayer } from '../models/player.ts';
import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import type { Vec3 } from '../models/tuples.ts';
import { BIND_ROTATIONS, setBoneRotation } from './frames.ts';
import type { TorsoFrames } from './frames.ts';
import { hangingArm, hangingWrist } from './hang.ts';
import { poseShoulder } from './ik.ts';
import { lapPoint } from './lap.ts';
import { poseSkeleton, posedPiecePoint, posedPoint } from './test-kinematics.ts';
import type { PosedSkeleton } from './test-kinematics.ts';
import { createWindState } from './wind-notes.ts';
import { WIND_HOLDS, poseWind, windRig } from './winds.ts';
import type { AnimalPose } from './types.ts';
import type { WindHold, WindPoseOut, WindRig } from './winds.ts';

/** A flute hold whose left paw rests on the left thigh in the rest pose. */
const FREE: WindHold = {
  ...WIND_HOLDS.flute,
  restFreeL: {
    lap: { along: 0.6, offset: [0, 0.03, 0] },
    palm: [0, -1, 0.2],
    fingers: [0.2, 0, -1],
    arc: [0.1, 0.2, 0.3],
  },
};

/** The flute hold with the left palm on its grip in the rest pose. */
const HELD: WindHold = WIND_HOLDS.flute;

/** A turn and a move of the root, as the sway gives them. */
const SWAY = new Quaternion()
  .setFromAxisAngle(new Vector3(0, 0, 1), 4 * MathUtils.DEG2RAD)
  .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 9 * MathUtils.DEG2RAD));
const SWAY_OFFSET: Vec3 = [0.02, -0.01, 0.015];

/**
 * Poses a wind player at a weight of the playing pose, with a swayed root.
 *
 * @param model The player model.
 * @param rig The rig of the player.
 * @param weight The weight of the playing pose.
 * @returns The posed skeleton.
 */
function poseAtWeight(model: PlayerModel, rig: WindRig, weight: number): PosedSkeleton {
  const rotations = new Float32Array(BIND_ROTATIONS);
  setBoneRotation(rotations, boneIndex('root'), SWAY);
  const pose: WindPoseOut & AnimalPose = {
    rotations,
    rootOffset: SWAY_OFFSET,
    slideOffset: [0, 0, 0],
    instrumentOffset: [0, 0, 0],
    blink: 0,
  };
  const torso = poseSkeleton(model, pose).frames;
  const frame = (bone: 'root' | 'chest'): TorsoFrames['root'] => {
    const f = torso[boneIndex(bone)];
    if (!f) {
      throw new Error(`The skeleton has no ${bone}.`);
    }
    return f;
  };
  const frames = { root: frame('root'), chest: frame('chest') };
  const state = createWindState();
  state.fingersL = -1;
  state.fingersR = -1;
  poseWind(rig, frames, state, weight, pose);
  return poseSkeleton(model, pose);
}

/**
 * Gives the posed place of a bone.
 *
 * @param posed The posed skeleton.
 * @param bone The bone.
 * @returns The place.
 */
function boneAt(posed: PosedSkeleton, bone: 'handL' | 'root'): Vector3 {
  return posed.frames[boneIndex(bone)]?.position.clone() ?? new Vector3(NaN, NaN, NaN);
}

/**
 * Gives the distance of the left palm from its grip.
 *
 * @param posed The posed skeleton.
 * @returns The distance, in meters.
 */
function gripGap(posed: PosedSkeleton): number {
  const grip = posed.model.instrument.grips.palmL;
  if (!grip) {
    throw new Error('The flute has a grip of the left palm.');
  }
  return new Vector3(...posedPoint(posed, 'handL', posed.model.body.palmL)).distanceTo(
    new Vector3(...posedPiecePoint(posed, grip)),
  );
}

describe('the free left paw of a wind hold in the rest pose (design 5.3)', () => {
  const seated = buildPlayer('wolf', 'flute');
  const free = windRig(seated, 'flute', FREE);
  const held = windRig(seated, 'flute', HELD);

  it('puts the left palm on the left thigh in the rest pose of a seated player', () => {
    const rest = FREE.restFreeL;
    if (!rest) {
      throw new Error('The hold has a free left paw.');
    }
    const posed = poseAtWeight(seated, free, 0);
    const root = posed.frames[boneIndex('root')];
    const lap = new Vector3(...lapPoint(seated, 'L', rest.lap))
      .applyQuaternion(root?.rotation ?? new Quaternion())
      .add(boneAt(posed, 'root'));
    const palm = new Vector3(...posedPoint(posed, 'handL', seated.body.palmL));

    expect(palm.distanceTo(lap)).toBeLessThan(1e-4);
    // The bind palm of the left paw faces +x. It faces the side of the rest, turned by the root.
    const face = new Vector3(1, 0, 0).applyQuaternion(
      posed.frames[boneIndex('handL')]?.rotation ?? new Quaternion(),
    );
    const side = new Vector3(...rest.palm).normalize().applyQuaternion(SWAY);
    expect(face.distanceTo(side)).toBeLessThan(1e-4);
  });

  it('hangs the left arm of a standing player in the rest pose', () => {
    const standing = buildPlayer('wolf', 'flute', 4, 'stand');
    const rig = windRig(standing, 'flute', FREE);
    const posed = poseAtWeight(standing, rig, 0);
    const chest = posed.frames[boneIndex('chest')];
    if (!chest) {
      throw new Error('The skeleton has a chest.');
    }
    const shoulder = poseShoulder(rig.left.arm, chest, rig.chestBind, new Quaternion());
    const wrist = hangingWrist(hangingArm(standing, rig.left.arm), shoulder, new Vector3());

    expect(boneAt(posed, 'handL').distanceTo(wrist)).toBeLessThan(1e-4);
  });

  it('puts the left palm on its grip in the playing pose', () => {
    const posed = poseAtWeight(seated, free, 1);

    expect(gripGap(posed)).toBeLessThan(1e-4);
    expect(posed.pose.rotations).toEqual(poseAtWeight(seated, held, 1).pose.rotations);
  });

  it('moves the left wrist from its rest place to its grip by the weight of the instrument', () => {
    const rest = boneAt(poseAtWeight(seated, free, 0), 'handL');
    const h = seated.body.headHeight;
    // The arc goes out to the left (-x), up, and forward (-z), turned by the root.
    const arc = new Vector3(-0.1 * h, 0.2 * h, -0.3 * h).applyQuaternion(SWAY);
    for (const weight of [0.25, 0.5, 0.75]) {
      const posed = poseAtWeight(seated, free, weight);
      const onGrip = poseAtWeight(seated, held, weight);
      const expected = rest
        .clone()
        .lerp(boneAt(onGrip, 'handL'), weight)
        .addScaledVector(arc, 4 * weight * (1 - weight));

      expect(boneAt(posed, 'handL').distanceTo(expected), `weight ${weight}`).toBeLessThan(1e-4);
      // The instrument and the right arm do not change.
      for (const bone of ['instrument', 'upperArmR', 'forearmR', 'handR'] as const) {
        const at = boneIndex(bone) * 4;
        expect(posed.pose.rotations.slice(at, at + 4), bone).toEqual(
          onGrip.pose.rotations.slice(at, at + 4),
        );
      }
      expect(posed.pose.instrumentOffset).toEqual(onGrip.pose.instrumentOffset);
    }
  });

  it('keeps the left palm on its grip in the rest pose with no free paw', () => {
    expect(held.freeL).toBeNull();
    expect(gripGap(poseAtWeight(seated, held, 0))).toBeLessThan(1e-4);
  });
});
