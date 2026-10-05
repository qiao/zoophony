import { Light, Mesh, SkinnedMesh } from 'three';
import type { BufferGeometry, Material, Object3D } from 'three';

/**
 * Frees the GPU resources of an object and of all its children: each geometry and each material
 * one time, each skeleton texture, and each shadow map of a light. Players of one kind share one
 * geometry. The object stays usable as a JavaScript object, but it must not render again.
 *
 * @param root The object, for example a scene.
 */
export function disposeTree(root: Object3D): void {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  root.traverse((object) => {
    if (object instanceof Mesh) {
      geometries.add(object.geometry);
      const own: readonly Material[] = Array.isArray(object.material)
        ? object.material
        : [object.material];
      for (const material of own) {
        materials.add(material);
      }
    }
    if (object instanceof SkinnedMesh) {
      object.skeleton.dispose();
    }
    if (object instanceof Light) {
      object.dispose();
    }
  });
  for (const geometry of geometries) {
    geometry.dispose();
  }
  for (const material of materials) {
    material.dispose();
  }
}
