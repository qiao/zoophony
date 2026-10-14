import { describe, expect, it } from 'vitest';

import { PerspectiveCamera } from 'three';

import { ModelCache } from '../models/model-cache.ts';
import { createMaterials } from './geometry.ts';
import { POSE_MARGIN, pickPlayer } from './pick.ts';
import { createPlayers } from './player.ts';

/**
 * Makes a camera 4 m in front of a point at the height of a seated player.
 *
 * @param x The x of the point, in meters.
 * @returns The camera, with its matrices up to date.
 */
function cameraAt(x: number): PerspectiveCamera {
  const camera = new PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(x, 0.7, 4);
  camera.lookAt(x, 0.7, 0);
  camera.updateMatrixWorld();
  return camera;
}

describe('pickPlayer (design 2.3)', () => {
  const meshes = createPlayers(
    [
      {
        species: 'fox-tan',
        instrument: 'violin',
        kettles: 4,
        support: 'chair',
        position: [0, 0, 0],
        facing: 0,
      },
      {
        species: 'cat',
        instrument: 'viola',
        kettles: 4,
        support: 'chair',
        position: [3, 0, 0],
        facing: 0,
      },
    ],
    createMaterials(),
    new ModelCache(),
  );

  it('finds the player under the point, and no player on an empty point', () => {
    expect(pickPlayer(meshes, cameraAt(0), 0, 0)).toBe(0);
    expect(pickPlayer(meshes, cameraAt(3), 0, 0)).toBe(1);
    expect(pickPlayer(meshes, cameraAt(8), 0, 0)).toBe(-1);
  });

  it('tests the posed triangles, also outside the bind pose of the mesh', () => {
    // The red fox with its violin reaches 0.26 m to the right of its seat in the bind pose.
    const camera = new PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0.45, 0.6, 4);
    camera.lookAt(0.45, 0.6, 0);
    camera.updateMatrixWorld();
    expect(pickPlayer(meshes, camera, 0, 0)).toBe(-1);
    const root = meshes[0]?.skeleton.bones[0];
    root?.position.setX(root.position.x + 0.3);
    expect(pickPlayer(meshes, camera, 0, 0)).toBe(0);
  });

  it('gives each mesh the bounds of its bind pose with a margin for the poses', () => {
    const [mesh] = meshes;
    const bind = mesh?.geometry.boundingSphere?.radius ?? Number.NaN;
    expect(mesh?.boundingSphere?.radius).toBeCloseTo(bind + POSE_MARGIN);
    expect(mesh?.boundingBox).toBeNull();
  });
});
