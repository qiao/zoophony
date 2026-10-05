import { Raycaster, Vector2 } from 'three';
import type { Camera, SkinnedMesh } from 'three';

/**
 * The margin of the bounds of a player around its bind pose, in meters. A pose moves the body,
 * the arms, and the instrument less than this from the bind pose (design 4.7, 5.1).
 */
export const POSE_MARGIN = 0.5;

const raycaster = new Raycaster();
const pointer = new Vector2();

/**
 * Gives a mesh the bounding sphere of its bind pose plus {@link POSE_MARGIN}, so that the sphere
 * holds each pose. three.js calculates the sphere of a skinned mesh from the posed vertices, and
 * that took about 110 ms for the 43 players of the default demo.
 *
 * @param mesh The player mesh.
 */
function setPoseBounds(mesh: SkinnedMesh): void {
  if (mesh.boundingSphere) {
    return;
  }
  const { geometry } = mesh;
  if (!geometry.boundingSphere) {
    geometry.computeBoundingSphere();
  }
  const sphere = geometry.boundingSphere?.clone();
  if (sphere) {
    sphere.radius += POSE_MARGIN;
    mesh.boundingSphere = sphere;
  }
}

/**
 * Finds the player mesh under a point of the view (design 2.3). The ray tests the posed
 * triangles of each skinned mesh, with its instrument, inside a bounding sphere that holds each
 * pose. A lifted instrument is thus also a target.
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
    setPoseBounds(mesh);
  }
  raycaster.setFromCamera(pointer.set(x, y), camera);
  const [hit] = raycaster.intersectObjects([...meshes], false);
  return hit ? meshes.findIndex((mesh) => mesh === hit.object) : -1;
}
