import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { buildPlayer } from '../models/player.ts';
import { layoutScene } from '../models/layout-scene.ts';
import { placePoint } from '../models/instruments/hold.ts';
import { chainFrames, createFrames, posePoint } from '../pose/frames.ts';
import { scoreOf } from '../score/test-score.ts';
import { patchedDemos } from '../../tools/patch-demos.ts';
import { boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import type { PlayerModel } from '../models/player.ts';
import type { AnimalPose } from '../pose/types.ts';
import { conductorPose, gripPose, playingPoses } from './view-poses.ts';

/** Finds the posed place of the bind position of a bone, with the frames of the pose. */
function posed(model: PlayerModel, pose: AnimalPose, bone: BoneName) {
  const frames = chainFrames(
    model.skeleton,
    pose.rotations,
    createFrames(model.skeleton.positions.length),
  );
  const frame = frames[boneIndex(bone)];
  const bind = model.skeleton.positions[boneIndex(bone)] ?? [0, 0, 0];
  if (!frame) {
    throw new Error(`No frame for ${bone}.`);
  }
  return posePoint(frame, bind, bind);
}

describe('gripPose', () => {
  it('puts the palms of a clarinet player on the grips, with the elbows bent', () => {
    const model = buildPlayer('rabbit', 'clarinet');
    const pose = gripPose(model);
    expect(pose).not.toBeNull();
    if (!pose) {
      return;
    }
    for (const [side, grip] of [
      ['R', model.instrument.grips.palmR],
      ['L', model.instrument.grips.palmL],
    ] as const) {
      if (!grip) {
        continue;
      }
      const shoulder = posed(model, pose, `upperArm${side}`);
      const wrist = posed(model, pose, `hand${side}`);
      // The wrist is near the grip: within the length of the hand.
      const target = new Vector3(...placePoint(model.pieces, grip));
      expect(wrist.distanceTo(target)).toBeLessThan(0.2 * model.body.headHeight);
      // The elbow bends: the wrist is nearer to the shoulder than the straight arm.
      expect(wrist.distanceTo(shoulder)).toBeLessThan(1.3 * model.body.headHeight);
    }
  });
});

describe('conductorPose', () => {
  it('raises the right wrist to the height of the head', () => {
    const model = buildPlayer('bear', 'baton');
    const pose = conductorPose(model);
    const wrist = posed(model, pose, 'handR');
    expect(wrist.y).toBeGreaterThan(model.body.positions.neck[1]);
    expect(wrist.x).toBeGreaterThan(model.body.positions.upperArmR[0]);
  });
});

describe('playingPoses', () => {
  it('gives the bowed string players of the Beethoven 9 demo their playing pose', async () => {
    const demo = (await patchedDemos()).find((d) => d.file === 'beethoven-9.mid');
    expect(demo).toBeDefined();
    if (!demo) {
      return;
    }
    const score = scoreOf(demo.bytes, 'auto');
    const poses = playingPoses(score, layoutScene(score));
    for (const key of ['rabbit violin', 'fox-red violin', 'dog cello'] as const) {
      const pose = poses.get(key);
      expect(pose, key).toBeDefined();
      // The bow arm is not in the bind pose.
      const arm = boneIndex('upperArmR') * 4;
      expect(pose?.rotations[arm + 3]).toBeLessThan(0.999);
    }
    // The wolf plays the clarinet on the stage. The rabbit and the red fox keep the grip pose.
    expect(poses.has('wolf clarinet')).toBe(true);
    expect(poses.has('rabbit clarinet')).toBe(false);
    expect(poses.has('fox-red clarinet')).toBe(false);
  });
});
