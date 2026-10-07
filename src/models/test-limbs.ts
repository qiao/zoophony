import { Vector3 } from 'three';

import { triangleNormal } from './mesh.ts';
import type { MeshData } from './mesh.ts';
import { boneIndex } from './rig.ts';
import type { BoneName } from './rig.ts';
import type { Vec3 } from './tuples.ts';

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
 * Counts the connected surfaces of a corner list: groups of triangles that share edges. One
 * welded tube is one surface, and a tube with a ball on it is two or more. Only tests use it.
 *
 * @param corners The corner list, 9 numbers for each triangle.
 * @returns The count.
 */
export function surfaceCount(corners: readonly number[]): number {
  const triangleCount = corners.length / 9;
  const group = Array.from({ length: triangleCount }, (_, t) => t);
  const root = (t: number): number => {
    let r = t;
    while (group[r] !== r) {
      r = group[r] ?? r;
    }
    return r;
  };
  for (const triangles of edgeTriangles(corners).values()) {
    const [first, ...others] = triangles;
    for (const other of others) {
      group[root(other)] = root(first ?? other);
    }
  }
  return new Set(group.map((_, t) => root(t))).size;
}

/**
 * Gives the largest angle between the faces of the two triangles of an edge, over the edges near
 * a point on one side of it. A smooth surface has small angles, and a cap or a ball on a tube has
 * large ones. Only tests use it.
 *
 * @param corners The corner list, 9 numbers for each triangle.
 * @param near The point.
 * @param radius The largest distance of the middle of an edge from the point.
 * @param facing The side: an edge counts when the direction from the point to its middle has a
 *   positive part along this direction.
 * @returns The angle, in degrees.
 */
export function largestFold(
  corners: readonly number[],
  near: Vec3,
  radius: number,
  facing: Vec3,
): number {
  const center = new Vector3(...near);
  const side = new Vector3(...facing);
  let largest = 0;
  for (const [edge, triangles] of edgeTriangles(corners)) {
    const [a, b] = triangles;
    if (triangles.length !== 2 || a === undefined || b === undefined) {
      continue;
    }

    const middle = edge
      .split('|')
      .map((key) => new Vector3(...key.split(',').map(Number)))
      .reduce((sum, p) => sum.add(p), new Vector3())
      .multiplyScalar(0.5)
      .sub(center);
    if (middle.length() > radius || middle.dot(side) <= 0) {
      continue;
    }

    const na = new Vector3(...triangleNormal(corners, a)).normalize();
    const nb = new Vector3(...triangleNormal(corners, b)).normalize();
    largest = Math.max(largest, (na.angleTo(nb) * 180) / Math.PI);
  }
  return largest;
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

/**
 * Gives the distances of the corners of a corner list from a point, for the corners in the plane
 * through the point normal to an axis: the corners of a ring of a tube around that point. Only
 * tests use it.
 *
 * @param corners The corner list, 9 numbers for each triangle.
 * @param center The middle of the ring.
 * @param axis The axis of the tube at the ring.
 * @returns The distances, one for each distinct corner, to 1 µm.
 */
export function ringRadii(corners: readonly number[], center: Vec3, axis: Vec3): number[] {
  const middle = new Vector3(...center);
  const unit = new Vector3(...axis).normalize();
  const found = new Map<string, number>();
  for (let c = 0; c < corners.length / 3; c++) {
    const p = new Vector3(corners[c * 3] ?? 0, corners[c * 3 + 1] ?? 0, corners[c * 3 + 2] ?? 0);
    const offset = p.sub(middle);
    if (Math.abs(offset.dot(unit)) < 1e-6 && offset.length() > 1e-6) {
      found.set(cornerKey(corners, c), offset.length());
    }
  }
  return [...found.values()];
}
