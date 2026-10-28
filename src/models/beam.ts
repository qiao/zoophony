import { MathUtils } from 'three';

import type { Vec3 } from './tuples.ts';

/**
 * The place of the key light (design 4.5), seen from the stage center on the stage top. The key
 * light is the spotlight of the stage, and the visible beam comes from it. It stands far behind
 * the orchestra, a little to the right, and high, so its shadows fall to the front left, parallel
 * and short, as in `orchestra-latest.png`. A key light 1.4 S from the stage center on the stage
 * axis cast shadows that fanned out from the middle, and on the right side they pointed to the
 * front right (user, 2026-10-18).
 */
export const KEY_PLACE = {
  /** The distance from the stage center, in stage sides. */
  distance: 2.45,
  /** The turn from the back of the stage axis toward the right side, in radians. */
  azimuth: 18 * MathUtils.DEG2RAD,
  /** The angle above the stage top, in radians. */
  elevation: 66 * MathUtils.DEG2RAD,
} as const;

/**
 * Gives the position of the key light of a stage ({@link KEY_PLACE}). The stage axes have +x to
 * the right, +y up, and +z to the audience, so the back of the stage is at -z.
 *
 * @param stageSide The stage side `S`, in meters.
 * @returns The position, in meters.
 */
export function keyLightPlace(stageSide: number): Vec3 {
  const { distance, azimuth, elevation } = KEY_PLACE;
  const flat = distance * stageSide * Math.cos(elevation);
  return [
    flat * Math.sin(azimuth),
    distance * stageSide * Math.sin(elevation),
    -flat * Math.cos(azimuth),
  ];
}

/**
 * The place of the rim light (design 4.5), seen from the stage center on the stage top: on the
 * stage axis, far behind the orchestra, and high. The visible beam leans from its foot on the
 * stage toward this place, so the beam stands upright in the frontal default view, as the fan of
 * `orchestra-latest.png` (user, 2026-10-18: "why is the beam not vertical?").
 */
export const RIM_PLACE = {
  /** The distance from the stage center, in stage sides. */
  distance: 2.45,
  /** The angle above the stage top, in radians. */
  elevation: 66 * MathUtils.DEG2RAD,
} as const;

/**
 * Gives the position of a rim light of a stage ({@link RIM_PLACE}). The stage axes have +x to
 * the right, +y up, and +z to the audience, so the back of the stage is at -z.
 *
 * @param stageSide The stage side `S`, in meters.
 * @param x The x of the light, in meters: 0 on the stage axis.
 * @returns The position, in meters.
 */
export function rimLightPlace(stageSide: number, x = 0): Vec3 {
  const { distance, elevation } = RIM_PLACE;
  return [
    x,
    distance * stageSide * Math.sin(elevation),
    -distance * stageSide * Math.cos(elevation),
  ];
}

/**
 * The height of the cone that the shot planner keeps clear of cameras, in stage sides (design
 * 5.6). The cone stands upright on the stage center and holds the haze of the visible beam near
 * the stage, also when the beam leans to the key light.
 */
export const BEAM_HEIGHT_IN_SIDES = 1.2;

/** The radius of the cone of the shot planner on the stage, in stage sides (design 4.5). */
export const BEAM_RADIUS_IN_SIDES = 0.75;

/** The radius of the visible beam at the light, in stage sides. */
export const BEAM_TOP_RADIUS_IN_SIDES = 0.02;

/**
 * Tells if a point is inside the cone of the visible beam that the shot planner keeps clear
 * (design 4.5, 5.6): an upright cone from the light circle on the stage top around the stage
 * center up to {@link BEAM_HEIGHT_IN_SIDES}. The beam draws only its outer faces, so a camera
 * inside the haze sees the beam in another way than a camera outside.
 *
 * @param stageSide The stage side `S`, in meters.
 * @param point The point, in the stage axes.
 * @param margin A distance in meters that makes the cone narrower and lower, or wider and higher
 *   for a negative value. 0 by default.
 * @returns True inside the cone.
 */
export function insideBeam(stageSide: number, point: Vec3, margin = 0): boolean {
  const height = BEAM_HEIGHT_IN_SIDES * stageSide;
  const [x, y, z] = point;
  if (y < 0 || y >= height - margin) {
    return false;
  }
  const bottom = BEAM_RADIUS_IN_SIDES * stageSide;
  const top = BEAM_TOP_RADIUS_IN_SIDES * stageSide;
  return Math.hypot(x, z) < bottom + (top - bottom) * (y / height) - margin;
}
