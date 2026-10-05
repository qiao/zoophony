import { describe, expect, it } from 'vitest';

import { IDENTITY, add, dot, length, multiply, rotate, scale, sub } from '../models/math.ts';
import type { Quat, Vec3 } from '../models/math.ts';
import { buildPlayer } from '../models/player.ts';
import type { PlayerModel } from '../models/player.ts';
import { BONE_NAMES, boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import type { AnimalPose } from './types.ts';
import { violinPlayingPose } from './violin-pose.ts';

interface WorldBone {
  readonly position: Vec3;
  readonly rotation: Quat;
}

/** Calculates the world position and rotation of each bone of a posed skeleton. */
function forward(model: PlayerModel, pose: AnimalPose): WorldBone[] {
  const out: WorldBone[] = [];
  const { positions, parents } = model.skeleton;
  for (let i = 0; i < BONE_NAMES.length; i++) {
    const r = pose.rotations;
    const local: Quat = [r[i * 4] ?? 0, r[i * 4 + 1] ?? 0, r[i * 4 + 2] ?? 0, r[i * 4 + 3] ?? 1];
    const parent = out[parents[i] ?? -1];
    const bind = positions[i] ?? [0, 0, 0];
    if (!parent) {
      out.push({ position: bind, rotation: local });
      continue;
    }
    const offset = sub(bind, positions[parents[i] ?? 0] ?? [0, 0, 0]);
    out.push({
      position: add(parent.position, rotate(parent.rotation, offset)),
      rotation: multiply(parent.rotation, local),
    });
  }
  return out;
}

/** Moves a bind point of a bone to its posed position. */
function posed(model: PlayerModel, world: WorldBone[], bone: BoneName, point: Vec3): Vec3 {
  const i = boneIndex(bone);
  const bind = model.skeleton.positions[i] ?? [0, 0, 0];
  const w = world[i] ?? { position: bind, rotation: IDENTITY };
  return add(w.position, rotate(w.rotation, sub(point, bind)));
}

describe('violinPlayingPose', () => {
  const model = buildPlayer('rabbit', 'violin');
  const pose = violinPlayingPose(model);
  const world = forward(model, pose);

  it('gives one unit quaternion for each bone (design 5.1)', () => {
    expect(pose.rotations).toHaveLength(BONE_NAMES.length * 4);
    for (let i = 0; i < BONE_NAMES.length; i++) {
      const q = [...pose.rotations.subarray(i * 4, i * 4 + 4)];
      expect(Math.hypot(...q)).toBeCloseTo(1, 5);
    }
  });

  it('keeps the violin in its bind place under the chin', () => {
    const violin = world[boneIndex('instrument')];
    expect(violin?.position).toEqual(model.skeleton.positions[boneIndex('instrument')]);
    expect(violin?.rotation).toEqual(IDENTITY);
  });

  it('puts the bow hair on the strings at the contact point, across the strings', () => {
    const grip = posed(model, world, 'bow', model.bow.grip);
    const axis = rotate(world[boneIndex('bow')]?.rotation ?? IDENTITY, model.bow.axis);
    const hairSide = rotate(world[boneIndex('bow')]?.rotation ?? IDENTITY, model.bow.hairSide);
    // The point of the hair line nearest to the contact point.
    const hairPoint = add(grip, scale(hairSide, model.bow.hairGap));
    const along = dot(sub(model.violin.bowContact, hairPoint), axis);
    const nearest = add(hairPoint, scale(axis, along));
    expect(length(sub(nearest, model.violin.bowContact))).toBeLessThan(0.005);
    expect(Math.abs(dot(axis, model.violin.axis))).toBeLessThan(1e-6);
    // The hair faces the strings.
    expect(dot(hairSide, model.violin.top)).toBeCloseTo(-1, 6);
  });

  it('puts the left palm under the neck of the violin', () => {
    const palm = posed(model, world, 'handL', model.body.palmL);
    expect(length(sub(palm, model.violin.neckGrip))).toBeLessThan(0.04);
  });

  it('keeps the bones of the arms at their bind lengths', () => {
    for (const [a, b] of [
      ['upperArmR', 'forearmR'],
      ['forearmR', 'handR'],
      ['upperArmL', 'forearmL'],
      ['forearmL', 'handL'],
    ] as const) {
      const bindLength = length(
        sub(
          model.skeleton.positions[boneIndex(a)] ?? [0, 0, 0],
          model.skeleton.positions[boneIndex(b)] ?? [0, 0, 0],
        ),
      );
      const posedLength = length(
        sub(world[boneIndex(a)]?.position ?? [0, 0, 0], world[boneIndex(b)]?.position ?? [0, 0, 0]),
      );
      // The pose holds 32-bit floats.
      expect(posedLength).toBeCloseTo(bindLength, 6);
    }
  });
});
