import { MathUtils } from 'three';
import type { Vec3 } from '../models/tuples.ts';

/** The vertical field of view of the camera, in degrees (design 4.5, camera). */
export const FIELD_OF_VIEW = 30;

/** The near plane of the camera, in meters. */
export const NEAR = 0.1;

/**
 * The elevation of the default view (design 4.5, camera): 24°, the lowest whole degree at which
 * no large animal hides 10% or more of the head of a smaller animal
 * (`scene/hidden-heads.test.ts`). `mockup.png` looks at the stage from a lower camera.
 */
export const DEFAULT_ELEVATION = 24 * MathUtils.DEG2RAD;

/**
 * The azimuth of the default view: 0, on the audience axis, as view 01 of `scene.png` (design
 * 4.5, camera).
 */
export const DEFAULT_AZIMUTH = 0;

/**
 * The default distance for a viewport that is as wide as it is tall, in stage sides. It is the
 * unit of the wide and high shots, of the planner, and of the beam fade of Free mode. The default
 * view stands nearer: see {@link LANDSCAPE_RULE}.
 */
export const DEFAULT_DISTANCE_IN_SIDES = 3.3;

/**
 * The landscape rule of the wide views (design 4.5, camera). The user asked on 2026-10-06 for the
 * view of `mockup.png`: the stage fills the free area left of the open drawer. Thus the default
 * view stands at a part of the default distance. On a narrower landscape viewport, the camera
 * moves back with the width, so that the orchestra keeps its part of the width.
 */
export const LANDSCAPE_RULE = {
  /** The part of the default distance at this aspect and wider. */
  zoom: 0.56,
  /** The aspect from which the zoom is constant: a desktop of 1440 × 900. */
  fullAspect: 1.6,
} as const;

/**
 * Calculates the zoom of the landscape rule at an aspect (design 4.5, camera).
 *
 * @param aspect The width of the viewport divided by its height.
 * @returns The part of the default distance: 0.56 at the aspect 1.6 and wider, and more for a
 *   narrower viewport, up to 0.896 at the aspect 1 and below.
 */
export function landscapeZoom(aspect: number): number {
  const rule = LANDSCAPE_RULE;
  return Math.min(1, rule.zoom * Math.max(1, rule.fullAspect / Math.max(1, aspect)));
}

/** The view offset: half of the bar height, in CSS pixels (design 4.5, camera; 2.8). */
export const VIEW_OFFSET_Y = 34;

/** The orbit limits of the elevation, in radians (design 4.5, camera). */
export const ELEVATION_LIMITS = [10 * MathUtils.DEG2RAD, 80 * MathUtils.DEG2RAD] as const;

/**
 * The near orbit limit of the distance in Free mode, in meters (design 2.5, 4.5). A close shot is
 * about 4 m from its target, so a limit of half the default distance pulled the camera back at
 * the first update of the controls.
 */
export const MIN_DISTANCE = 2;

/** The far orbit limit of the distance in Free mode, as a factor of the default distance. */
export const MAX_DISTANCE_FACTOR = 2;

/** The default view of the camera for one stage and one viewport. */
export interface DefaultView {
  /** The stage center on the top of the stage. */
  readonly target: Vec3;
  readonly position: Vec3;
  readonly distance: number;
}

/**
 * Calculates the default distance (design 4.5, camera): the distance of the default view before
 * the portrait rule. The wide and high shots, the beam fade of Free mode, and the planner use it
 * as their unit.
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
 * The portrait rule of the wide views (design 4.5, camera). The user chose on 2026-10-06 a lower
 * and more frontal camera in a portrait viewport, so that the orchestra fills more of a tall
 * screen, and the stage corners can leave the frame (UX audit 2026-10-05, SC8).
 */
export const PORTRAIT_RULE = {
  /** The rule applies in full at this aspect and below, and not at all at the aspect 1. */
  fullAspect: 0.6,
  /** The part of the azimuth that the full rule removes. */
  frontal: 0.8,
  /** The elevation that the full rule removes, in radians: 4°. */
  lower: 4 * MathUtils.DEG2RAD,
  /** The factor of the distance of the full rule. */
  nearer: 0.68,
} as const;

/**
 * Calculates the share of the portrait rule at an aspect: a smoothstep from 0 at the aspect 1 to
 * 1 at the aspect 0.6. Thus a turn of the screen or a resize changes the view with no jump.
 *
 * @param aspect The width of the viewport divided by its height.
 * @returns The share, from 0 to 1.
 */
export function portraitShare(aspect: number): number {
  const x = Math.min(1, Math.max(0, (1 - aspect) / (1 - PORTRAIT_RULE.fullAspect)));
  return x * x * (3 - 2 * x);
}

/** The camera of a wide view after the portrait rule. */
export interface WideAngles {
  /** Radians around y, from +z (the audience) to +x. */
  readonly azimuth: number;
  /** Radians above the stage plane. */
  readonly elevation: number;
  /** A factor of the default distance. */
  readonly zoom: number;
}

/**
 * Applies the landscape rule and the portrait rule to the camera of a wide view (design 4.5,
 * camera; 5.6). The landscape rule moves the camera to its part of the default distance. The
 * portrait rule turns the camera to the front, lowers it by 4°, and moves it nearer, by the share
 * of the aspect. The zoom of a wide variant fits the players of its angle in a landscape view,
 * so the portrait rule removes it, and keeps the move of the shot.
 *
 * @param azimuth The azimuth of the key, in radians.
 * @param elevation The elevation of the key, in radians.
 * @param zoom The zoom of the key: 1 for the default view.
 * @param variantZoom The zoom of the variant of the shot, at rest: 1 for the default view.
 * @param aspect The width of the viewport divided by its height.
 * @returns The camera of the view. Its zoom is a factor of the default distance.
 */
export function wideView(
  azimuth: number,
  elevation: number,
  zoom: number,
  variantZoom: number,
  aspect: number,
): WideAngles {
  const p = portraitShare(aspect);
  const rule = PORTRAIT_RULE;
  const landscape = landscapeZoom(aspect);
  const portrait = rule.nearer / variantZoom;
  return {
    azimuth: azimuth * (1 - rule.frontal * p),
    elevation: elevation - rule.lower * p,
    zoom: zoom * (landscape + (portrait - landscape) * p),
  };
}

/**
 * Calculates the default view (design 4.5, camera): the camera of view 01 of `scene.png`, after
 * the landscape rule and the portrait rule.
 *
 * @param stageSide The stage side `S`, in meters.
 * @param width The width of the viewport.
 * @param height The height of the viewport.
 * @returns The camera on the audience axis at 0.56 of the default distance on a desktop, and
 *   farther on a narrower viewport. A portrait viewport gets a lower and nearer camera.
 */
export function defaultView(stageSide: number, width: number, height: number): DefaultView {
  const aspect = width / height;
  const angles = wideView(DEFAULT_AZIMUTH, DEFAULT_ELEVATION, 1, 1, aspect);
  const distance = defaultDistance(stageSide, aspect) * angles.zoom;
  const flat = Math.cos(angles.elevation) * distance;
  return {
    target: [0, 0, 0],
    position: [
      Math.sin(angles.azimuth) * flat,
      Math.sin(angles.elevation) * distance,
      Math.cos(angles.azimuth) * flat,
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
