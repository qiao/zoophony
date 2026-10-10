import { describe, expect, it } from 'vitest';

import { buildPlayer } from '../models/player.ts';
import { layoutScene } from '../models/layout-scene.ts';
import { chainFrames, createFrames, posePoint } from '../pose/frames.ts';
import { scoreOf } from '../score/test-score.ts';
import { patchedDemos } from '../../tools/patch-demos.ts';
import { boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import type { PlayerModel } from '../models/player.ts';
import type { AnimalPose } from '../pose/types.ts';
import { conductorPose, playingPoses } from './view-poses.ts';

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
    // The violin moves forward while the player plays (design 5.3), as on the stage.
    const [x, y, z] = poses.get('fox-red violin')?.instrumentOffset ?? [0, 0, 0];
    expect(Math.hypot(x, y, z)).toBeGreaterThan(0.01);
    // The wolf plays the clarinet on the stage. The rabbit and the red fox keep the grip pose.
    expect(poses.has('wolf clarinet')).toBe(true);
    expect(poses.has('rabbit clarinet')).toBe(false);
    expect(poses.has('fox-red clarinet')).toBe(false);
  });
});
