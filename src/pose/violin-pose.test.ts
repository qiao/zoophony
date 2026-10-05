import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { IDENTITY } from '../models/tuples.ts';
import type { Vec3 } from '../models/tuples.ts';
import { buildPlayer } from '../models/player.ts';
import type { PlayerModel } from '../models/player.ts';
import { BONE_NAMES, boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import type { AnimalPose } from './types.ts';
import { violinPlayingPose, violinPoints } from './violin-pose.ts';

interface WorldBone {
  readonly position: Vector3;
  readonly rotation: Quaternion;
}

/** Calculates the world position and rotation of each bone of a posed skeleton. */
function forward(model: PlayerModel, pose: AnimalPose): WorldBone[] {
  const out: WorldBone[] = [];
  const { positions, parents } = model.skeleton;
  for (let i = 0; i < BONE_NAMES.length; i++) {
    const local = new Quaternion().fromArray(pose.rotations, i * 4);
    const parent = out[parents[i] ?? -1];
    const bind = new Vector3(...(positions[i] ?? [0, 0, 0]));
    if (!parent) {
      out.push({ position: bind, rotation: local });
      continue;
    }
    const offset = bind.sub(new Vector3(...(positions[parents[i] ?? 0] ?? [0, 0, 0])));
    out.push({
      position: offset.applyQuaternion(parent.rotation).add(parent.position),
      rotation: new Quaternion().multiplyQuaternions(parent.rotation, local),
    });
  }
  return out;
}

/** Moves a bind point of a bone to its posed position. */
function posed(model: PlayerModel, world: WorldBone[], bone: BoneName, point: Vec3): Vector3 {
  const i = boneIndex(bone);
  const bind = new Vector3(...(model.skeleton.positions[i] ?? [0, 0, 0]));
  const w = world[i] ?? { position: bind, rotation: new Quaternion() };
  return new Vector3(...point).sub(bind).applyQuaternion(w.rotation).add(w.position);
}

describe('violinPlayingPose', () => {
  const model = buildPlayer('rabbit', 'violin');
  const pose = violinPlayingPose(model);
  const world = forward(model, pose);
  const violin = violinPoints(model);

  it('gives one unit quaternion for each bone (design 5.1)', () => {
    expect(pose.rotations).toHaveLength(BONE_NAMES.length * 4);
    for (let i = 0; i < BONE_NAMES.length; i++) {
      const q = [...pose.rotations.subarray(i * 4, i * 4 + 4)];
      expect(Math.hypot(...q)).toBeCloseTo(1, 5);
    }
  });

  it('keeps the violin in its bind place under the chin', () => {
    const placed = world[boneIndex('instrument')];
    expect(placed?.position.toArray()).toEqual(model.skeleton.positions[boneIndex('instrument')]);
    expect(placed?.rotation.toArray()).toEqual(IDENTITY);
  });

  it('puts the bow hair on the strings at the contact point, across the strings', () => {
    const grip = posed(model, world, 'bow', violin.bowGrip);
    const bow = world[boneIndex('bow')]?.rotation ?? new Quaternion();
    const axis = new Vector3(...violin.bowAxis).applyQuaternion(bow);
    const hairSide = new Vector3(...violin.hairSide).applyQuaternion(bow);
    const contact = new Vector3(...violin.bowContact);
    // The point of the hair line nearest to the contact point.
    const hairPoint = grip.addScaledVector(hairSide, violin.hairGap);
    const along = new Vector3().subVectors(contact, hairPoint).dot(axis);
    const nearest = hairPoint.addScaledVector(axis, along);
    expect(nearest.distanceTo(contact)).toBeLessThan(0.005);
    expect(Math.abs(axis.dot(new Vector3(...violin.axis)))).toBeLessThan(1e-6);
    // The hair faces the strings.
    expect(hairSide.dot(new Vector3(...violin.top))).toBeCloseTo(-1, 6);
  });

  it('puts the left palm under the neck of the violin', () => {
    const palm = posed(model, world, 'handL', model.body.palmL);
    expect(palm.distanceTo(new Vector3(...violin.palmL))).toBeLessThan(0.005);
  });

  it('keeps the bones of the arms at their bind lengths', () => {
    for (const [a, b] of [
      ['upperArmR', 'forearmR'],
      ['forearmR', 'handR'],
      ['upperArmL', 'forearmL'],
      ['forearmL', 'handL'],
    ] as const) {
      const bindLength = new Vector3(
        ...(model.skeleton.positions[boneIndex(a)] ?? [0, 0, 0]),
      ).distanceTo(new Vector3(...(model.skeleton.positions[boneIndex(b)] ?? [0, 0, 0])));
      const posedLength = (world[boneIndex(a)]?.position ?? new Vector3()).distanceTo(
        world[boneIndex(b)]?.position ?? new Vector3(),
      );
      // The pose holds 32-bit floats.
      expect(posedLength).toBeCloseTo(bindLength, 6);
    }
  });
});
