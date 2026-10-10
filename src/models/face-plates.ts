import { Vector3 } from 'three';
import { triangleNormal } from './mesh.ts';
import { ringLoft } from './primitives.ts';
import type { Vec3 } from './tuples.ts';

/**
 * Finds the point where a ray from the head center leaves the skull, and the normal of that
 * face.
 *
 * @param skull The corner list of the skull, in the axes of the model.
 * @param center The head center.
 * @param direction The direction of the ray, in the axes of the model.
 * @returns The point and the unit normal.
 * @throws Error if the ray misses the skull, which cannot happen for a closed skull.
 */
export function skullSurface(
  skull: readonly number[],
  center: Vec3,
  direction: Vector3,
): { point: Vector3; normal: Vector3 } {
  const origin = new Vector3(...center);
  const d = direction.clone().normalize();
  let best: { point: Vector3; normal: Vector3; distance: number } | null = null;
  for (let t = 0; t < skull.length / 9; t++) {
    const corner = (k: number): Vector3 => new Vector3().fromArray(skull, t * 9 + k * 3);
    const a = corner(0);
    const b = corner(1);
    const c = corner(2);
    const n = new Vector3(...triangleNormal(skull, t)).normalize();
    const facing = n.dot(d);
    if (facing <= 1e-9) {
      continue;
    }
    const distance = n.dot(a.clone().sub(origin)) / facing;
    const hit = origin.clone().addScaledVector(d, distance);
    // The hit is inside the triangle when it is on the inner side of each edge.
    const inside = [
      [a, b],
      [b, c],
      [c, a],
    ].every(
      ([p, q]) =>
        p !== undefined &&
        q !== undefined &&
        new Vector3().crossVectors(q.clone().sub(p), hit.clone().sub(p)).dot(n) >= -1e-12,
    );
    if (inside && distance > 0 && (!best || distance < best.distance)) {
      best = { point: hit, normal: n, distance };
    }
  }
  if (!best) {
    throw new Error('The ray from the head center misses the skull.');
  }
  return best;
}

/**
 * Makes a thin plate: an outline in the plane of an eye, with a front face and a back face.
 *
 * @param outline The outline, as (across, up) points from the middle of the eye, in H.
 * @param back The distance of the back face in front of the eye plane, in H.
 * @param front The distance of the front face in front of the eye plane, in H.
 * @param place The change from the axes of the eye to the axes of the model.
 * @returns The corner list.
 */
export function plate(
  outline: readonly (readonly [number, number])[],
  back: number,
  front: number,
  place: (across: number, up: number, out: number) => Vec3,
): number[] {
  return ringLoft([
    outline.map(([a, b]) => place(a, b, back)),
    outline.map(([a, b]) => place(a, b, front)),
  ]);
}

/**
 * Gives the outline of an oval in the plane of an eye.
 *
 * @param middle The middle of the oval, as (across, up), in H.
 * @param halfWidth The half width.
 * @param up The height above the middle.
 * @param down The depth below the middle.
 * @param count The number of corners.
 * @returns The outline.
 */
export function oval(
  middle: readonly [number, number],
  halfWidth: number,
  up: number,
  down: number,
  count: number,
): [number, number][] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI;
    const sin = Math.sin(angle);
    return [middle[0] + Math.cos(angle) * halfWidth, middle[1] + sin * (sin >= 0 ? up : down)];
  });
}
