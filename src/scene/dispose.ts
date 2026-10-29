import { Light, Mesh, Points, ShaderMaterial, SkinnedMesh, Texture } from 'three';
import type { BufferGeometry, Material, Object3D } from 'three';

/**
 * Frees the GPU resources of an object and of all its children: each geometry and each material
 * one time, each texture of a shader material, each skeleton texture, and each shadow map of a
 * light. The dust motes of the beam are points, and the beam has a noise texture. Players of one kind share one
 * geometry. A pianist has a geometry of its own that shares all attributes except the positions
 * with the other pianists of its model: the dispose of the first such geometry frees the shared
 * buffers, and each later dispose frees its positions and its morph texture. The object stays
 * usable as a JavaScript object, but it must not render again.
 *
 * @param root The object, for example a scene.
 * @param keep The materials to keep, for example the materials that the next scene shares.
 */
export function disposeTree(root: Object3D, keep: ReadonlySet<Material> = new Set()): void {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  root.traverse((object) => {
    if (object instanceof Mesh || object instanceof Points) {
      geometries.add(object.geometry);
      const own: readonly Material[] = Array.isArray(object.material)
        ? object.material
        : [object.material];
      for (const material of own) {
        if (!keep.has(material)) {
          materials.add(material);
        }
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
    if (material instanceof ShaderMaterial) {
      for (const uniform of Object.values(material.uniforms)) {
        if (uniform.value instanceof Texture) {
          uniform.value.dispose();
        }
      }
    }
    material.dispose();
  }
}
