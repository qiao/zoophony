import { MathUtils } from 'three';
import type { Vec3 } from '../models/tuples.ts';

/** The vertical field of view of the camera, in degrees (design 4.5, camera). */
export const FIELD_OF_VIEW = 30;

/** The near plane of the camera, in meters. */
export const NEAR = 0.1;

/** The elevation of the default view (design 4.5, camera). */
export const DEFAULT_ELEVATION = 28 * MathUtils.DEG2RAD;

/** The azimuth of the default view, to the right of the audience axis (design 4.5, camera). */
export const DEFAULT_AZIMUTH = 30 * MathUtils.DEG2RAD;

/** The default distance for a viewport that is as wide as it is tall, in stage sides. */
export const DEFAULT_DISTANCE_IN_SIDES = 3.3;

/** The view offset: half of the bar height, in CSS pixels (design 4.5, camera; 2.8). */
export const VIEW_OFFSET_Y = 34;

/** The orbit limits of the elevation, in radians (design 4.5, camera). */
export const ELEVATION_LIMITS = [10 * MathUtils.DEG2RAD, 80 * MathUtils.DEG2RAD] as const;

/** The orbit limits of the distance, as factors of the default distance. */
export const DISTANCE_LIMITS = [0.5, 2] as const;

/** The default view of the camera for one stage and one viewport. */
export interface DefaultView {
  /** The stage center on the top of the stage. */
  readonly target: Vec3;
  readonly position: Vec3;
  readonly distance: number;
}

/**
 * Calculates the distance of the default view (design 4.5, camera).
 *
 * @param stageSide The stage side `S`, in meters.
 * @param aspect The width of the viewport divided by its height.
 * @returns `3.3 × S`, multiplied by the height divided by the width when the viewport is taller
 *   than wide.
 */
export function defaultDistance(stageSide: number, aspect: number): number {
  return DEFAULT_DISTANCE_IN_SIDES * stageSide * Math.max(1, 1 / aspect);
}

/**
 * Calculates the default view (design 4.5, camera).
 *
 * @param stageSide The stage side `S`, in meters.
 * @param width The width of the viewport.
 * @param height The height of the viewport.
 * @returns The camera position at the distance `3.3 × S`, or more when the viewport is taller
 *   than wide.
 */
export function defaultView(stageSide: number, width: number, height: number): DefaultView {
  const distance = defaultDistance(stageSide, width / height);
  const flat = Math.cos(DEFAULT_ELEVATION) * distance;
  return {
    target: [0, 0, 0],
    position: [
      Math.sin(DEFAULT_AZIMUTH) * flat,
      Math.sin(DEFAULT_ELEVATION) * distance,
      Math.cos(DEFAULT_AZIMUTH) * flat,
    ],
    distance,
  };
}

/**
 * Calculates the far plane of the camera (design 4.5, camera).
 *
 * @param distance The current distance from the camera to the target.
 * @param stageSide The stage side `S`, in meters.
 * @returns The distance plus `3 × S`, so that a full zoom-out still shows the stage.
 */
export function farPlane(distance: number, stageSide: number): number {
  return distance + 3 * stageSide;
}
