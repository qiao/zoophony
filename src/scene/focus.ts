import type { Vec3 } from '../models/tuples.ts';

/**
 * The lens of the depth of field (design 4.5, post effects). The focus follows the point that the
 * camera looks at. A close camera has the full aperture and a shallow depth of field. The aperture
 * closes between two focus distances, so that the wide views keep the full stage sharp, as in
 * `scene.png`.
 */
export const LENS = {
  /**
   * The diameter of the full aperture, in meters. With 0.07 m, a close shot at 4 m blurs the back
   * of the hall to a disc of about 3% of the image height, as the close shots of `scene.png`.
   */
  aperture: 0.07,
  /**
   * The aperture starts to close at this focus distance, and it is closed at the second one, in
   * stage sides. The close shots stand at 0.4 to 0.6 S from their subject, and the default view
   * at 1.85 S. With a fixed aperture, the default view blurred the near stage corner by 0.4% of
   * the image height.
   */
  closing: [1.0, 1.5],
  /** The largest diameter of the blur disc, as a part of the image height. */
  maxBlur: 0.035,
  /**
   * The largest diameter of the blur disc in front of the focus, as a part of the image height:
   * about 7 px at the height 900 px. The over-the-shoulder conductor shot focuses on the middle of
   * the orchestra, and the full limit blurred the bear in front to a disc of 31 px. In view 02 of
   * `scene.png`, the bear in front is only a little soft.
   */
  maxNearBlur: 0.008,
  /**
   * A blur disc below this part of the image height counts as sharp, and the frame skips the
   * blur passes. 0.0012 is about 1 px at the height 900 px.
   */
  sharpBlur: 0.0012,
} as const;

/**
 * Calculates the blur scale of a thin lens. The diameter of the blur disc at the view depth `d`,
 * as a part of the image height, is `scale × |1 - focus / d|`.
 *
 * The thin lens gives the disc `A × f / (s - f) × |1 - s / d|` on the sensor, for the aperture
 * `A`, the focal length `f`, and the focus distance `s`. The sensor height is
 * `2 × f × tan(fov / 2)`, and `f` is much smaller than `s`.
 *
 * @param focusDistance The distance from the camera to the point in focus, in meters.
 * @param fovDegrees The vertical field of view, in degrees.
 * @param aperture The diameter of the aperture, in meters.
 * @returns The blur scale, as a part of the image height.
 */
export function blurScale(focusDistance: number, fovDegrees: number, aperture: number): number {
  const halfFov = (fovDegrees * Math.PI) / 360;
  return aperture / (2 * focusDistance * Math.tan(halfFov));
}

/**
 * Calculates the signed blur of a point at a view depth (design 4.5). A point nearer than the
 * focus gets a negative value, and a point farther gets a positive value. The size is limited to
 * {@link LENS}.maxNearBlur in front of the focus and to {@link LENS}.maxBlur behind it.
 *
 * @param depth The view depth of the point, in meters. It is more than 0.
 * @param focusDistance The distance of the focus, in meters.
 * @param scale The blur scale of {@link blurScale}.
 * @returns The diameter of the blur disc, as a signed part of the image height.
 */
export function blurAt(depth: number, focusDistance: number, scale: number): number {
  const blur = scale * (1 - focusDistance / depth);
  return Math.max(-LENS.maxNearBlur, Math.min(LENS.maxBlur, blur));
}

/** The focus of one frame (design 4.5, post effects). */
export interface Focus {
  /** The distance from the camera to the point that it looks at, in meters. */
  readonly distance: number;
  /** The blur scale of {@link blurScale}, as a part of the image height. */
  readonly scale: number;
  /**
   * True if a point at the far plane gets a blur disc larger than {@link LENS}.sharpBlur. Else
   * the frame skips the blur passes. The near side does not count, because a far camera has
   * nothing near it.
   */
  readonly active: boolean;
}

/**
 * Calculates the aperture of the lens for a focus distance (design 4.5): the full aperture up to
 * the first distance of {@link LENS}.closing, closed from the second, with a smoothstep between.
 *
 * @param distance The focus distance, in meters.
 * @param stageSide The stage side `S`, in meters.
 * @returns The diameter of the aperture, in meters.
 */
export function apertureAt(distance: number, stageSide: number): number {
  const [open, closed] = LENS.closing;
  const t = Math.min(1, Math.max(0, (distance / stageSide - open) / (closed - open)));
  return LENS.aperture * (1 - t * t * (3 - 2 * t));
}

/**
 * Calculates the focus of a frame from the camera and the point that it looks at (design 4.5).
 *
 * @param position The camera position.
 * @param target The point that the camera looks at.
 * @param fovDegrees The vertical field of view, in degrees.
 * @param far The far plane, in meters.
 * @param stageSide The stage side `S`, in meters.
 * @returns The focus.
 */
export function focusOf(
  position: Vec3,
  target: Vec3,
  fovDegrees: number,
  far: number,
  stageSide: number,
): Focus {
  const distance = Math.max(
    0.1,
    Math.hypot(target[0] - position[0], target[1] - position[1], target[2] - position[2]),
  );
  const scale = blurScale(distance, fovDegrees, apertureAt(distance, stageSide));
  return { distance, scale, active: blurAt(far, distance, scale) > LENS.sharpBlur };
}
