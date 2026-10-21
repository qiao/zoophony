import { Vector3 } from 'three';
import { toVec3 } from './tuples.ts';
import type { Vec3 } from './tuples.ts';
import { triangleNormal } from './mesh.ts';
import { loft } from './primitives.ts';
import type { LoftRing } from './primitives.ts';

/**
 * The rings of the sculpted head, in head heights `H` from the head center (design 4.5). The head
 * is 1.0 H tall and 1.26 H wide at the cheeks. It is a full round ball with a round crown and
 * full cheeks, as the heads of `mockup.png` and `scene.png`. The face is a little flat, and the
 * cheeks reach forward below the eyes to carry the muzzle. Every second ring turns by half a
 * segment, so that the head has small triangle facets.
 */
const HEAD_RINGS: readonly LoftRing[] = [
  { y: -0.5, halfWidth: 0, front: 0, back: 0, z: -0.12 },
  { y: -0.45, halfWidth: 0.22, front: 0.4, back: 0.2, z: -0.06 },
  { y: -0.36, halfWidth: 0.4, front: 0.56, back: 0.32, turn: 0.5 },
  { y: -0.24, halfWidth: 0.53, front: 0.62, back: 0.42 },
  { y: -0.1, halfWidth: 0.6, front: 0.6, back: 0.48, turn: 0.5 },
  { y: 0.04, halfWidth: 0.63, front: 0.56, back: 0.51 },
  { y: 0.17, halfWidth: 0.59, front: 0.5, back: 0.5, turn: 0.5 },
  { y: 0.29, halfWidth: 0.51, front: 0.42, back: 0.45, z: 0.01 },
  { y: 0.39, halfWidth: 0.41, front: 0.32, back: 0.37, z: 0.02, turn: 0.5 },
  { y: 0.46, halfWidth: 0.27, front: 0.21, back: 0.26, z: 0.03 },
  { y: 0.5, halfWidth: 0, front: 0, back: 0, z: 0.03 },
];

/** The number of corners of each ring of the head. */
const HEAD_SEGMENTS = 16;

/**
 * The height of the lower face from the head center, in H. The triangles below it get the belly
 * color: the cheeks, the jaw, and the face up to the eyes.
 */
export const LOWER_FACE_TOP = 0;

/**
 * The direction of the right eye from the head center. The eyes sit on the faces between the
 * front and the sides, so that the side view shows them too, as in `animals.webp`.
 */
export const EYE_DIRECTION: Vec3 = [0.25, 0.06, -0.45];

/** The corner list of the head, in H, with the head center at the origin. */
export const HEAD_CORNERS: readonly number[] = loft(HEAD_RINGS, HEAD_SEGMENTS);

/** A point on the surface of the head, and the unit normal of the surface there. */
export interface SurfacePoint {
  readonly point: Vec3;
  readonly normal: Vec3;
}

/**
 * Finds the point of the head surface in a direction from the head center: the place where a ray
 * from the center leaves the head.
 *
 * @param h The head height `H`, in meters.
 * @param headCenter The center of the head.
 * @param direction The direction from the head center. It does not need a unit length.
 * @returns The point and the normal of the face that the ray goes through.
 * @throws Error if the ray misses all faces, which cannot happen for a closed head.
 */
export function headSurface(h: number, headCenter: Vec3, direction: Vec3): SurfacePoint {
  const d = new Vector3(...direction).normalize();
  const corners = HEAD_CORNERS;
  for (let t = 0; t < corners.length / 9; t++) {
    const at = (k: number): Vector3 =>
      new Vector3(
        corners[t * 9 + k * 3] ?? 0,
        corners[t * 9 + k * 3 + 1] ?? 0,
        corners[t * 9 + k * 3 + 2] ?? 0,
      );
    const a = at(0);
    const n = new Vector3(...triangleNormal(corners, t));
    const facing = n.dot(d);
    if (facing <= 0) {
      continue;
    }
    // The ray from the origin meets the plane of the face at the distance s.
    const s = n.dot(a) / facing;
    const p = d.clone().multiplyScalar(s);
    const inside = [0, 1, 2].every((k) => {
      const from = at(k);
      const edge = at((k + 1) % 3).sub(from);
      return new Vector3().crossVectors(edge, p.clone().sub(from)).dot(n) >= -1e-12;
    });
    if (inside) {
      return {
        point: toVec3(new Vector3(...headCenter).addScaledVector(p, h)),
        normal: toVec3(n.normalize()),
      };
    }
  }
  throw new Error('The ray misses the head.');
}
