import { Vector3 } from 'three';

import type { MeshData } from './mesh.ts';
import { boneIndex } from './rig.ts';
import type { BoneName } from './rig.ts';

/**
 * Gives the key of a corner of a corner list, to 1 µm.
 *
 * @param corners The corner list.
 * @param corner The index of the corner.
 * @returns The key.
 */
function cornerKey(corners: readonly number[], corner: number): string {
  return [0, 1, 2].map((k) => (corners[corner * 3 + k] ?? 0).toFixed(6)).join(',');
}

/**
 * Gives the triangles of each edge of a corner list.
 *
 * @param corners The corner list, 9 numbers for each triangle.
 * @returns The triangles of each edge, by the keys of its two corners.
 */
function edgeTriangles(corners: readonly number[]): Map<string, number[]> {
  const edges = new Map<string, number[]>();
  for (let t = 0; t < corners.length / 9; t++) {
    for (let k = 0; k < 3; k++) {
      const a = cornerKey(corners, t * 3 + k);
      const b = cornerKey(corners, t * 3 + ((k + 1) % 3));
      const edge = a < b ? `${a}|${b}` : `${b}|${a}`;
      edges.set(edge, [...(edges.get(edge) ?? []), t]);
    }
  }
  return edges;
}

/**
 * Counts the edges of a corner list that do not have exactly two triangles. A closed solid has
 * none. Only tests use it.
 *
 * @param corners The corner list, 9 numbers for each triangle.
 * @returns The count of open edges and of edges with more than two triangles.
 */
export function openEdges(corners: readonly number[]): number {
  return [...edgeTriangles(corners).values()].filter((triangles) => triangles.length !== 2).length;
}

/**
 * Gives the corner list of the triangles of some bones of a mesh: the triangles whose first
 * corner follows one of the bones. Only tests use it.
 *
 * @param mesh The mesh.
 * @param bones The bones.
 * @returns The corner list, 9 numbers for each triangle.
 */
export function cornersOn(mesh: MeshData, bones: readonly BoneName[]): number[] {
  const wanted = new Set(bones.map(boneIndex));
  const out: number[] = [];
  for (let t = 0; t < mesh.bones.length / 3; t++) {
    if (wanted.has(mesh.bones[t * 3] ?? -1)) {
      out.push(...mesh.positions.subarray(t * 9, t * 9 + 9));
    }
  }
  return out;
}

/**
 * Calculates the signed volume of a closed corner list. It is larger than 0 when the corners go
 * counterclockwise when seen from outside. Only tests use it.
 *
 * @param corners The corner list, 9 numbers for each triangle.
 * @returns The volume.
 */
export function volumeOf(corners: readonly number[]): number {
  let volume = 0;
  for (let t = 0; t < corners.length / 9; t++) {
    const at = (k: number): Vector3 =>
      new Vector3(
        corners[t * 9 + k * 3] ?? 0,
        corners[t * 9 + k * 3 + 1] ?? 0,
        corners[t * 9 + k * 3 + 2] ?? 0,
      );
    volume += at(0).dot(new Vector3().crossVectors(at(1), at(2))) / 6;
  }
  return volume;
}
