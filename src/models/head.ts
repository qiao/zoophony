import { add, cross, dot, normalize, scale, sub } from './math.ts';
import type { Vec3 } from './math.ts';
import { triangleNormal } from './mesh.ts';
import { loft } from './primitives.ts';
import type { LoftRing } from './primitives.ts';

/**
 * The rings of the sculpted head, in head heights `H` from the head center (design 4.5). The head
 * is 1.0 H tall. It has a round crown, it is widest at the eyes (1.26 H), and its face comes to a
 * point at the muzzle, as the heads of `animals.webp`. The forehead slopes forward to the muzzle,
 * so that the side view points forward. Every second ring turns by half a segment, so that the
 * head has small triangle facets. The other rings have a corner at the front and at the sides.
 */
export const HEAD_RINGS: readonly LoftRing[] = [
  { y: -0.5, halfWidth: 0, front: 0, back: 0, z: -0.16 },
  { y: -0.4, halfWidth: 0.14, front: 0.52, back: 0.2, turn: 0.5 },
  { y: -0.28, halfWidth: 0.3, front: 0.68, back: 0.34 },
  { y: -0.13, halfWidth: 0.52, front: 0.6, back: 0.44, turn: 0.5 },
  { y: 0.02, halfWidth: 0.63, front: 0.52, back: 0.48 },
  { y: 0.2, halfWidth: 0.59, front: 0.44, back: 0.47, turn: 0.5 },
  { y: 0.36, halfWidth: 0.47, front: 0.34, back: 0.39, z: 0.02 },
  { y: 0.46, halfWidth: 0.28, front: 0.2, back: 0.25, z: 0.03, turn: 0.5 },
  { y: 0.5, halfWidth: 0, front: 0, back: 0, z: 0.03 },
];

/** The number of corners of each ring of the head. */
const HEAD_SEGMENTS = 12;

/**
 * The height of the lower face from the head center, in H. The triangles below it get the belly
 * color: the cheeks, the jaw, and the face up to the eyes.
 */
export const LOWER_FACE_TOP = 0;

/**
 * The direction of the right eye from the head center. The eyes sit on the faces between the
 * front and the sides, so that the side view shows them too, as in `animals.webp`.
 */
export const EYE_DIRECTION: Vec3 = [0.3, 0.06, -0.4];

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
  const d = normalize(direction);
  const corners = HEAD_CORNERS;
  for (let t = 0; t < corners.length / 9; t++) {
    const at = (k: number): Vec3 => [
      corners[t * 9 + k * 3] ?? 0,
      corners[t * 9 + k * 3 + 1] ?? 0,
      corners[t * 9 + k * 3 + 2] ?? 0,
    ];
    const a = at(0);
    const n = triangleNormal(corners, t);
    const facing = dot(n, d);
    if (facing <= 0) {
      continue;
    }
    // The ray from the origin meets the plane of the face at the distance s.
    const s = dot(n, a) / facing;
    const p = scale(d, s);
    const inside = [0, 1, 2].every((k) => {
      const from = at(k);
      const to = at((k + 1) % 3);
      return dot(cross(sub(to, from), sub(p, from)), n) >= -1e-12;
    });
    if (inside) {
      return { point: add(headCenter, scale(p, h)), normal: normalize(n) };
    }
  }
  throw new Error('The ray misses the head.');
}
