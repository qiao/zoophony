import { BufferAttribute, BufferGeometry, MeshStandardMaterial } from 'three';

import type { MeshData } from '../models/mesh.ts';

/**
 * Creates the two materials of design 4.5: the matte group and the metal group. Both use flat
 * shading and the vertex colors.
 *
 * @returns The matte material, then the metal material, in the order of the geometry groups.
 */
export function createMaterials(): [MeshStandardMaterial, MeshStandardMaterial] {
  const matte = new MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 0.85,
    metalness: 0,
  });
  const metal = new MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 0.4,
    metalness: 0.3,
  });
  return [matte, metal];
}

/**
 * Creates a geometry from mesh data. Group 0 holds the matte triangles and group 1 holds the
 * metal triangles, for the materials of {@link createMaterials}.
 *
 * @param data The mesh data of `models/`.
 * @returns The geometry, with positions, colors, and face normals.
 */
export function createGeometry(data: MeshData): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(data.positions, 3));
  geometry.setAttribute('color', new BufferAttribute(data.colors, 3));
  // With no index, each vertex gets the normal of its own triangle.
  geometry.computeVertexNormals();
  const vertexCount = data.positions.length / 3;
  const matteVertices = data.matteTriangles * 3;
  geometry.addGroup(0, matteVertices, 0);
  if (vertexCount > matteVertices) {
    geometry.addGroup(matteVertices, vertexCount - matteVertices, 1);
  }
  return geometry;
}
