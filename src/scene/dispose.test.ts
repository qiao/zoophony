import {
  Bone,
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Skeleton,
  SkinnedMesh,
  SpotLight,
} from 'three';
import type { EventDispatcher } from 'three';
import { describe, expect, it, vi } from 'vitest';

import { disposeTree } from './dispose.ts';

/** Counts the dispose events of a geometry or a material. */
function countDisposes(target: EventDispatcher<{ dispose: object }>): () => number {
  let count = 0;
  target.addEventListener('dispose', () => {
    count++;
  });
  return () => count;
}

describe('disposeTree', () => {
  it('frees each geometry, each shared material one time, skeletons, and shadows', () => {
    const shared = new MeshStandardMaterial();
    const own = new MeshStandardMaterial();
    const geometries = [new BoxGeometry(), new BoxGeometry(), new BoxGeometry()];
    const bone = new Bone();
    const skinned = new SkinnedMesh(geometries[2], [shared, own]);
    skinned.add(bone);
    skinned.bind(new Skeleton([bone]));
    const spot = new SpotLight();
    const root = new Group();
    const inner = new Group();
    inner.add(new Mesh(geometries[1], shared), skinned);
    root.add(new Mesh(geometries[0], shared), inner, spot);

    const geometryCounts = geometries.map(countDisposes);
    const sharedCount = countDisposes(shared);
    const ownCount = countDisposes(own);
    const skeleton = vi.spyOn(skinned.skeleton, 'dispose');
    const shadow = vi.spyOn(spot.shadow, 'dispose');

    disposeTree(root);

    expect(geometryCounts.map((count) => count())).toEqual([1, 1, 1]);
    expect(sharedCount()).toBe(1);
    expect(ownCount()).toBe(1);
    expect(skeleton).toHaveBeenCalledOnce();
    expect(shadow).toHaveBeenCalledOnce();
  });
});
