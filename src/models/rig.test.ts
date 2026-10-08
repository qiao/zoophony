import { describe, expect, it } from 'vitest';

import { BONE_NAMES, boneIndex, makeSkeleton } from './rig.ts';
import type { BoneName } from './rig.ts';

function skeletonAt(instrumentParent: 'chest' | 'root'): ReturnType<typeof makeSkeleton> {
  // SAFETY: the entries hold each name of BONE_NAMES once.
  const positions = Object.fromEntries(BONE_NAMES.map((name, i) => [name, [i, 0, 0]])) as Record<
    BoneName,
    [number, number, number]
  >;
  return makeSkeleton(positions, instrumentParent);
}

describe('rig', () => {
  it('has the bones of design 4.7 in their order', () => {
    expect(BONE_NAMES).toHaveLength(38);
    expect(BONE_NAMES.slice(0, 6)).toEqual(['root', 'hips', 'spine', 'chest', 'neck', 'head']);
    expect(boneIndex('instrument')).toBe(32);
    expect(BONE_NAMES.at(-1)).toBe('slide');
  });

  it('puts each parent before its children, so a pose can run in one pass', () => {
    const { parents } = skeletonAt('chest');
    expect(parents[0]).toBe(-1);
    for (const [i, parent] of parents.entries()) {
      if (i > 0) {
        expect(parent).toBeGreaterThanOrEqual(0);
        expect(parent).toBeLessThan(i);
      }
    }
  });

  it('binds the mesh at the given frames, and each other bone at its position (design 4.7)', () => {
    // SAFETY: the entries hold each name of BONE_NAMES once.
    const positions = Object.fromEntries(BONE_NAMES.map((name, i) => [name, [i, 0, 0]])) as Record<
      BoneName,
      [number, number, number]
    >;
    const turned = { position: [1, 2, 3], rotation: [0, 0, 1, 0] } as const;

    const plain = makeSkeleton(positions, 'chest');
    const rigged = makeSkeleton(positions, 'chest', { handR: turned });

    expect(plain.meshBind).toBeUndefined();
    expect(rigged.meshBind?.[boneIndex('handR')]).toEqual(turned);
    expect(rigged.meshBind?.[boneIndex('bow')]).toEqual({
      position: [boneIndex('bow'), 0, 0],
      rotation: [0, 0, 0, 1],
    });
    expect(rigged.meshBind).toHaveLength(BONE_NAMES.length);
  });

  it('hangs the instrument on the chest or on the root (design 4.7)', () => {
    expect(skeletonAt('chest').parents[boneIndex('instrument')]).toBe(boneIndex('chest'));
    expect(skeletonAt('root').parents[boneIndex('instrument')]).toBe(boneIndex('root'));
    expect(skeletonAt('chest').parents[boneIndex('bow')]).toBe(boneIndex('handR'));
    expect(skeletonAt('chest').parents[boneIndex('slide')]).toBe(boneIndex('instrument'));
  });
});
