import { describe, expect, it } from 'vitest';

import { ModelCache } from '../models/model-cache.ts';
import { buildPlayer } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import { BIND_ROTATIONS } from '../pose/frames.ts';
import type { AnimalPose } from '../pose/types.ts';
import { createMaterials } from './geometry.ts';
import {
  applyPose,
  applyScenePose,
  createPlayerGeometry,
  createPlayerMesh,
  createPlayers,
} from './player.ts';
import type { PlayerSpot } from './player.ts';

/** Makes a player spot at a place. */
function spot(species: PlayerSpot['species'], instrument: PlayerSpot['instrument']): PlayerSpot {
  return { species, instrument, kettles: 4, position: [1, 0, 2], facing: 0.5 };
}

describe('createPlayers', () => {
  it('shares one geometry for each kind of player, and the two materials', () => {
    const materials = createMaterials();
    const asked: string[] = [];
    /** A cache that records each kind of player that the scene asks for. */
    class RecordingCache extends ModelCache {
      override get(...[species, instrument, kettles = 4]: Parameters<ModelCache['get']>) {
        asked.push(`${species} ${instrument} ${kettles}`);
        return super.get(species, instrument, kettles);
      }
    }
    const meshes = createPlayers(
      [spot('rabbit', 'violin'), spot('cat', 'viola'), spot('rabbit', 'violin')],
      materials,
      new RecordingCache(),
    );
    // The models come from the cache of the score (audit 2026-10-05-pose-scene, finding 8).
    expect(asked).toEqual(['rabbit violin 4', 'cat viola 4', 'rabbit violin 4']);
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

describe('applyScenePose', () => {
  it('gives each player its pose, and the last mesh the pose of the conductor', () => {
    const meshes = createPlayers(
      [spot('rabbit', 'violin'), spot('cat', 'viola'), spot('bear', 'baton')],
      createMaterials(),
      new ModelCache(),
    );
    const head = boneIndex('head');
    /** Makes a pose that turns the head about x by an angle. */
    const turned = (angle: number): AnimalPose => {
      const rotations = Float32Array.from(BIND_ROTATIONS);
      rotations.set([Math.sin(angle / 2), 0, 0, Math.cos(angle / 2)], head * 4);
      return { rotations, rootOffset: [0, 0, 0], slideOffset: [0, 0, 0], blink: 0 };
    };
    applyScenePose(meshes, { players: [turned(0.1), turned(0.2)], conductor: turned(0.3) });
    const angles = meshes.map(
      (mesh) => 2 * Math.asin(mesh.skeleton.bones[head]?.quaternion.x ?? 0),
    );
    expect(angles[0]).toBeCloseTo(0.1, 6);
    expect(angles[1]).toBeCloseTo(0.2, 6);
    expect(angles[2]).toBeCloseTo(0.3, 6);
  });
});

describe('applyPose', () => {
  it('moves the trombone slide along its axis from its bind place (design 5.1)', () => {
    const model = buildPlayer('pig', 'trombone');
    const mesh = createPlayerMesh(model, createPlayerGeometry(model), createMaterials());
    const slide = mesh.skeleton.bones[boneIndex('slide')];
    const bind = slide?.position.toArray();
    const pose = {
      rotations: BIND_ROTATIONS,
      rootOffset: [0, 0, 0] as const,
      slideOffset: [0.1, -0.02, 0.05] as const,
      blink: 0,
    };
    applyPose(mesh, pose);
    expect(slide?.position.x).toBeCloseTo((bind?.[0] ?? 0) + 0.1, 9);
    expect(slide?.position.y).toBeCloseTo((bind?.[1] ?? 0) - 0.02, 9);
    expect(slide?.position.z).toBeCloseTo((bind?.[2] ?? 0) + 0.05, 9);
    // A later pose starts from the bind place again.
    applyPose(mesh, { ...pose, slideOffset: [0, 0, 0] });
    expect(slide?.position.toArray()).toEqual(bind);
  });
});
