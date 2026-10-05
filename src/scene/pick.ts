import { Raycaster, Vector2 } from 'three';
import type { Camera, SkinnedMesh } from 'three';

const raycaster = new Raycaster();
const pointer = new Vector2();

/**
 * Finds the player mesh under a point of the view (design 2.3). The ray tests the posed
 * triangles of each skinned mesh, with its instrument. The bounds of each mesh follow the pose of
 * the last frame, so that a lifted instrument is also a target.
 *
 * @param meshes The player meshes of the scene.
 * @param camera The camera of the view, with its matrices up to date.
 * @param x The x of the point in normalized device coordinates, from -1 (left) to 1 (right).
 * @param y The y of the point in normalized device coordinates, from -1 (bottom) to 1 (top).
 * @returns The index of the nearest mesh under the point, or -1 for none.
 */
export function pickPlayer(
  meshes: readonly SkinnedMesh[],
  camera: Camera,
  x: number,
  y: number,
): number {
  for (const mesh of meshes) {
    mesh.updateMatrixWorld(true);
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
  }
  raycaster.setFromCamera(pointer.set(x, y), camera);
  const [hit] = raycaster.intersectObjects([...meshes], false);
  return hit ? meshes.findIndex((mesh) => mesh === hit.object) : -1;
}
