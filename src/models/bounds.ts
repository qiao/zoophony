import type { Vec3 } from './math.ts';
import type { MeshData } from './mesh.ts';

/** An axis-aligned box: the smallest and the largest x, y, and z. */
export interface Bounds {
  readonly min: Vec3;
  readonly max: Vec3;
}

/**
 * Makes the box of a given size around a center.
 *
 * @param center The center of the box.
 * @param size The extent on each axis.
 * @returns The box.
 */
export function centeredBox(center: Vec3, size: Vec3): Bounds {
  return {
    min: [center[0] - size[0] / 2, center[1] - size[1] / 2, center[2] - size[2] / 2],
    max: [center[0] + size[0] / 2, center[1] + size[1] / 2, center[2] + size[2] / 2],
  };
}

/**
 * Cuts a polygon on one side of a plane x = value, y = value, or z = value.
 *
 * @param polygon The corners of a flat convex polygon.
 * @param axis 0 for x, 1 for y, or 2 for z.
 * @param value The place of the plane on the axis.
 * @param keepAbove True keeps the part at or above the value, false the part at or below it.
 * @returns The corners of the part that stays.
 */
function clip(
  polygon: readonly Vec3[],
  axis: 0 | 1 | 2,
  value: number,
  keepAbove: boolean,
): Vec3[] {
  const out: Vec3[] = [];
  const inside = (p: Vec3): boolean => (keepAbove ? p[axis] >= value : p[axis] <= value);
  polygon.forEach((p, i) => {
    const q = polygon[(i + 1) % polygon.length] ?? p;
    if (inside(p)) {
      out.push(p);
    }
    if (inside(p) !== inside(q)) {
      const t = (value - p[axis]) / (q[axis] - p[axis]);
      out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1]), p[2] + t * (q[2] - p[2])]);
    }
  });
  return out;
}

/**
 * Finds how far back (+z) a mesh reaches inside the x and y range of a box. Only the parts of the
 * triangles inside that range count, so a triangle that crosses the box counts with its part
 * inside the box.
 *
 * @param mesh The mesh.
 * @param region The box. Its z range has no effect.
 * @param counts Finds if the triangles of a bone count.
 * @returns The largest z, or -Infinity if no triangle reaches into the range.
 */
export function backmostIn(
  mesh: MeshData,
  region: Bounds,
  counts: (bone: number) => boolean,
): number {
  let back = -Infinity;
  const p = mesh.positions;
  for (let t = 0; t < mesh.bones.length / 3; t++) {
    if (!counts(mesh.bones[t * 3] ?? 0)) {
      continue;
    }
    let polygon: Vec3[] = [0, 1, 2].map((k): Vec3 => {
      const i = t * 9 + k * 3;
      return [p[i] ?? 0, p[i + 1] ?? 0, p[i + 2] ?? 0];
    });
    for (const axis of [0, 1] as const) {
      polygon = clip(polygon, axis, region.min[axis], true);
      polygon = clip(polygon, axis, region.max[axis], false);
    }
    for (const corner of polygon) {
      back = Math.max(back, corner[2]);
    }
  }
  return back;
}
