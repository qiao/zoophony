import type { Vec3 } from '../models/tuples.ts';
import { smoothstep } from '../pose/rest.ts';
import type { ShotKind } from './types.ts';
import { defaultDistance } from './view.ts';

/**
 * The factor of the opacity of the visible beam in a close view (design 4.5, 5.6). A close camera
 * outside the cone sees the additive beam over the full image, and at the factor 1 it washed out
 * the image. The factor keeps a hint of the light.
 */
export const CLOSE_BEAM_OPACITY = 0.15;

/** The factor of the opacity of the visible beam for each kind of shot (design 5.6). */
export const SHOT_BEAM_OPACITY = {
  wide: 1,
  high: 1,
  conductor: CLOSE_BEAM_OPACITY,
  section: CLOSE_BEAM_OPACITY,
  solo: CLOSE_BEAM_OPACITY,
} as const satisfies Record<ShotKind, number>;

/**
 * The range of the fade of the beam in Free mode (design 2.5, 4.5): the distance from the camera
 * to the stage center, as a factor of the default distance. At the first value and nearer, the
 * beam has {@link CLOSE_BEAM_OPACITY}. At the second value and farther, it has the full opacity.
 * The close shots of the demos are at 0.43 or less (a section of Eine kleine Nachtmusik), the
 * high shots at 0.59, and the wide shots at 0.72 or more, so a change from Cinematic to Free mode
 * keeps the opacity.
 */
export const FREE_BEAM_FADE = [0.45, 0.55] as const;

/**
 * Calculates the factor of the opacity of the visible beam for a camera in Free mode (design
 * 2.5, 4.5). The factor follows the distance to the stage center with a smoothstep, so an orbit
 * or a zoom changes it with no jump.
 *
 * @param stageSide The stage side `S`, in meters.
 * @param aspect The width of the viewport divided by its height.
 * @param position The camera position, in the stage axes.
 * @returns The factor, from {@link CLOSE_BEAM_OPACITY} to 1.
 */
export function freeBeamOpacity(stageSide: number, aspect: number, position: Vec3): number {
  const ratio = Math.hypot(...position) / defaultDistance(stageSide, aspect);
  const [near, far] = FREE_BEAM_FADE;
  const w = smoothstep((ratio - near) / (far - near));
  return CLOSE_BEAM_OPACITY + (1 - CLOSE_BEAM_OPACITY) * w;
}
