import { describe, expect, it } from 'vitest';

import { MathUtils, Quaternion, Vector3 } from 'three';

import { buildPlayer } from '../models/player.ts';
import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import { BIND_ROTATIONS } from './frames.ts';
import { armGaps, clearanceRig } from './test-arm-clearance.ts';
import { poseSkeleton } from './test-kinematics.ts';
import type { AnimalPose } from './types.ts';

/**
 * Gives the rabbit with the violin the skin of four bones of a rigged body, from its main bones
 * and second bones. Its largest closed shell, the trunk grid, then counts as the body.
 *
 * @returns The model.
 */
function riggedRabbit(): PlayerModel {
  const model = buildPlayer('rabbit', 'violin');
  const { mesh } = model;
  const indices = new Uint8Array(mesh.bones.length * 4);
  const weights = new Float32Array(mesh.bones.length * 4);
  for (let c = 0; c < mesh.bones.length; c++) {
    const w = mesh.blendWeights[c] ?? 0;
    indices.set([mesh.bones[c] ?? 0, mesh.blendBones[c] ?? 0, 0, 0], c * 4);
    weights.set([1 - w, w, 0, 0], c * 4);
  }
  return { ...model, mesh: { ...mesh, skin: { indices, weights } } };
}

/**
 * Makes a pose that swings each upper arm out to its side, or in across the body.
 *
 * @param left The swing of the left arm out to the left, in degrees.
 * @param right The swing of the right arm out to the right, in degrees. A negative swing goes in.
 * @returns The pose, with open eyes.
 */
function armsOut(left: number, right: number): AnimalPose {
  const rotations = Float32Array.from(BIND_ROTATIONS);
  for (const [bone, degrees] of [
    ['upperArmL', -left],
    ['upperArmR', right],
  ] as const) {
    new Quaternion()
      .setFromAxisAngle(new Vector3(0, 0, 1), degrees * MathUtils.DEG2RAD)
      .toArray(rotations, boneIndex(bone) * 4);
  }
  return { rotations, rootOffset: [0, 0, 0], slideOffset: [0, 0, 0], blink: 0 };
}

describe('armGaps of a rigged body (design 4.4)', () => {
  const model = riggedRabbit();
  const rig = clearanceRig(model);

  it('finds the arm points of the forearms and the hands, and none of the upper arms', () => {
    expect(rig.fused).not.toBeNull();
    expect(rig.armR.upperArm).toEqual([]);
    expect(rig.armR.forearm.length).toBeGreaterThan(10);
    expect(rig.armR.hand.length).toBeGreaterThan(10);
  });

  it('finds no arm in the body when the arms swing out', () => {
    const gaps = armGaps(rig, poseSkeleton(model, armsOut(45, 45)), 0.1);

    expect(gaps.filter((gap) => gap.gap < 0)).toEqual([]);
  });

  it('finds the depth of a forearm that swings into the trunk', () => {
    const gaps = armGaps(rig, poseSkeleton(model, armsOut(45, -70)), 0.1);
    const forearm = gaps.find(
      (gap) => gap.side === 'R' && gap.part === 'forearm' && gap.group === 'trunk',
    );

    expect(forearm?.gap).toBeLessThan(-0.1);
    expect(gaps.filter((gap) => gap.side === 'L' && gap.gap < 0)).toEqual([]);
  });
});
