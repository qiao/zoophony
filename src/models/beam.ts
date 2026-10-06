import type { Vec3 } from './tuples.ts';

/** The height of the spotlight above the stage center, in stage sides (design 4.5). */
export const SPOT_HEIGHT_IN_SIDES = 1.2;

/** The radius of the visible beam on the stage, in stage sides (design 4.5). */
export const BEAM_RADIUS_IN_SIDES = 0.75;

/** The radius of the visible beam at the light, in stage sides. */
export const BEAM_TOP_RADIUS_IN_SIDES = 0.02;

/**
 * Tells if a point is inside the cone of the visible beam (design 4.5): from the light circle on
 * the stage top to the light, around the stage center. The beam draws only its outer faces, so a
 * camera inside the cone sees no beam, and a camera outside sees it (design 5.6).
 *
 * @param stageSide The stage side `S`, in meters.
 * @param point The point, in the stage axes.
 * @returns True inside the cone.
 */
export function insideBeam(stageSide: number, point: Vec3): boolean {
  const height = SPOT_HEIGHT_IN_SIDES * stageSide;
  const [x, y, z] = point;
  if (y < 0 || y >= height) {
    return false;
  }
  const bottom = BEAM_RADIUS_IN_SIDES * stageSide;
  const top = BEAM_TOP_RADIUS_IN_SIDES * stageSide;
  return Math.hypot(x, z) < bottom + (top - bottom) * (y / height);
}
