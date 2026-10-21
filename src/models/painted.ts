import { Vector3 } from 'three';
import type { Finish, MeshBuilder, Rgb } from './mesh.ts';
import { triangleNormal } from './mesh.ts';
import { boneIndex } from './rig.ts';
import type { BoneName } from './rig.ts';
import type { Vec3 } from './tuples.ts';

/**
 * Gives the color of one triangle of a part from its centroid and its unit normal, both in the
 * axes of the model.
 */
type Paint = (centroid: Vec3, normal: Vec3) => Rgb;

/**
 * Adds a part whose triangles get their colors one by one, so that a color border follows the
 * edges of the triangles, as on the cut facets of the model sheets (design 4.5).
 *
 * @param builder The mesh that gets the part.
 * @param corners The corner list of the part in the axes of the model, 9 numbers for each
 *   triangle.
 * @param bone The bone that the part follows.
 * @param paint The color of each triangle.
 * @param finish The finish of the part. Default `matte`.
 */
export function addPainted(
  builder: MeshBuilder,
  corners: readonly number[],
  bone: BoneName,
  paint: Paint,
  finish: Finish = 'matte',
): void {
  const groups = new Map<Rgb, number[]>();
  for (let t = 0; t < corners.length / 9; t++) {
    const triangle = corners.slice(t * 9, t * 9 + 9);
    const mean = (axis: number): number =>
      ((triangle[axis] ?? 0) + (triangle[3 + axis] ?? 0) + (triangle[6 + axis] ?? 0)) / 3;
    const n = new Vector3(...triangleNormal(triangle, 0)).normalize();
    const color = paint([mean(0), mean(1), mean(2)], [n.x, n.y, n.z]);
    const group = groups.get(color);
    if (group) {
      group.push(...triangle);
    } else {
      groups.set(color, triangle);
    }
  }
  for (const [color, group] of groups) {
    builder.add(group, { color, bone: boneIndex(bone), finish });
  }
}

/**
 * Gives a small fixed offset for a corner of a part, from -1 to 1, from the indices of the
 * corner. The offsets break the even rows of the facets, as the cut facets of the model sheets.
 * The same indices give the same offset on each call.
 *
 * @param a The first index.
 * @param b The second index.
 * @returns The offset.
 */
export function jitter(a: number, b: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43_758.5453;
  return 2 * (s - Math.floor(s)) - 1;
}
