import { SkinnedMesh } from 'three';
import { describe, expect, it } from 'vitest';

import { buildPlayer } from '../models/player.ts';
import { createMaterials } from './geometry.ts';
import { createPlayers, staticPose } from './player.ts';
import type { PlayerSpot } from './player.ts';

/** Makes a player spot at a place. */
function spot(species: PlayerSpot['species'], instrument: PlayerSpot['instrument']): PlayerSpot {
  return { species, instrument, kettles: 4, position: [1, 0, 2], facing: 0.5 };
}

describe('createPlayers', () => {
  it('shares one geometry for each kind of player, and the two materials', () => {
    const materials = createMaterials();
    const group = createPlayers(
      [spot('rabbit', 'violin'), spot('cat', 'viola'), spot('rabbit', 'violin')],
      materials,
    );
    const meshes = group.children.filter((child) => child instanceof SkinnedMesh);
    expect(meshes).toHaveLength(3);
    const [a, b, c] = meshes;
    expect(a?.geometry).toBe(c?.geometry);
    expect(a?.geometry).not.toBe(b?.geometry);
    expect(a?.skeleton).not.toBe(c?.skeleton);
    for (const mesh of meshes) {
      expect(mesh.material).toEqual(materials);
      expect(mesh.position.toArray()).toEqual([1, 0, 2]);
      expect(mesh.rotation.y).toBe(0.5);
    }
  });
});

describe('staticPose', () => {
  it('gives the violin pose to the violin and the viola, and the bind pose to the others', () => {
    expect(staticPose(buildPlayer('rabbit', 'violin'))).not.toBeNull();
    expect(staticPose(buildPlayer('cat', 'viola'))).not.toBeNull();
    expect(staticPose(buildPlayer('elephant', 'cello'))).toBeNull();
    expect(staticPose(buildPlayer('bear', 'baton'))).toBeNull();
  });
});
