import { describe, expect, it } from 'vitest';

import { dot, length, sub } from './math.ts';
import { buildPlayer } from './player.ts';
import { boneIndex } from './rig.ts';
import { VIOLIN } from './violin.ts';

function trianglesOn(bones: Uint8Array, wanted: readonly number[]): number {
  let count = 0;
  for (let t = 0; t < bones.length / 3; t++) {
    if (wanted.includes(bones[t * 3] ?? -1)) {
      count++;
    }
  }
  return count;
}

describe('buildPlayer', () => {
  const player = buildPlayer('rabbit', 'violin');
  const instrumentBones = [boneIndex('instrument'), boneIndex('bow')];

  it('keeps the violin and the bow within 500 triangles (design 4.5)', () => {
    const instrument = trianglesOn(player.mesh.bones, instrumentBones);
    expect(instrument).toBeGreaterThan(0);
    expect(instrument).toBeLessThanOrEqual(500);
  });

  it('keeps the body within 1,200 triangles (design 4.5)', () => {
    const total = player.mesh.positions.length / 9;
    const body = total - trianglesOn(player.mesh.bones, instrumentBones);
    expect(body).toBeLessThanOrEqual(1200);
  });

  it('merges the body, the violin, and the bow into one mesh of rigid parts (design 4.4)', () => {
    const { bones } = player.mesh;
    for (let t = 0; t < bones.length / 3; t++) {
      expect(bones[t * 3 + 1]).toBe(bones[t * 3]);
      expect(bones[t * 3 + 2]).toBe(bones[t * 3]);
    }
    expect(trianglesOn(bones, [boneIndex('bow')])).toBeGreaterThan(0);
    expect(trianglesOn(bones, [boneIndex('instrument')])).toBeGreaterThan(0);
    // All triangles are matte: the violin and the bow have no metal (design 4.5).
    expect(player.mesh.matteTriangles).toBe(bones.length / 3);
  });

  it('hangs the violin on the chest and puts its bone at the tail end (design 4.7)', () => {
    const { parents, positions } = player.skeleton;
    expect(parents[boneIndex('instrument')]).toBe(boneIndex('chest'));
    const tail = positions[boneIndex('instrument')] ?? [0, 0, 0];
    const contact = player.violin.bowContact;
    expect(length(sub(contact, tail))).toBeCloseTo(
      Math.hypot(VIOLIN.bowContact, VIOLIN.stringHeight),
      6,
    );
  });

  it('holds the violin to the left, with the strings up (design 4.6)', () => {
    expect(player.violin.axis[0]).toBeLessThan(-0.5);
    expect(player.violin.top[1]).toBeGreaterThan(0);
    expect(dot(player.violin.axis, player.violin.top)).toBeCloseTo(0, 9);
  });

  it('puts the bow in the right hand in the bind pose', () => {
    const grip = player.bow.grip;
    const hand = player.skeleton.positions[boneIndex('handR')] ?? [0, 0, 0];
    expect(length(sub(grip, hand))).toBeLessThan(0.1);
    expect(player.skeleton.parents[boneIndex('bow')]).toBe(boneIndex('handR'));
  });
});
