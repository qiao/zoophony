/** A quality tier of the renderer (design 2.6). */
export type QualityTier = 'high' | 'medium' | 'low';

/** The render values of one quality tier. MSAA is on in all tiers. */
export interface TierSettings {
  /** The width and the height of the shadow map, in texels. */
  readonly shadowMapSize: number;
  /**
   * The blur radius of the `PCFShadowMap` filter, in texels. three.js r186 replaces
   * `PCFSoftShadowMap` with `PCFShadowMap`, so a larger radius makes the soft shadows of the high
   * tier.
   */
  readonly shadowRadius: number;
  /** The largest pixel ratio of the canvas. */
  readonly maxPixelRatio: number;
}

/** The values of each tier (design 2.6). */
export const TIER_SETTINGS = {
  high: { shadowMapSize: 2048, shadowRadius: 3, maxPixelRatio: 2 },
  medium: { shadowMapSize: 1024, shadowRadius: 1, maxPixelRatio: 1.5 },
  low: { shadowMapSize: 512, shadowRadius: 1, maxPixelRatio: 1 },
} as const satisfies Readonly<Record<QualityTier, TierSettings>>;

/** A viewport with a shorter side below this value, in CSS pixels, is a small screen (2.6). */
export const SMALL_SCREEN_SIDE = 600;

/**
 * Selects the tier at start from the device (design 2.6).
 *
 * @param touch True if the device has a touch screen.
 * @param viewportWidth The width of the viewport, in CSS pixels.
 * @param viewportHeight The height of the viewport, in CSS pixels.
 * @returns `low` for a touch screen or a small screen, else `high`.
 */
export function startTier(
  touch: boolean,
  viewportWidth: number,
  viewportHeight: number,
): QualityTier {
  if (touch || Math.min(viewportWidth, viewportHeight) < SMALL_SCREEN_SIDE) {
    return 'low';
  }
  return 'high';
}

/**
 * Calculates the pixel ratio of the canvas. A tier never renders more pixels than the display has.
 *
 * @param tier The quality tier.
 * @param devicePixelRatio The `devicePixelRatio` of the window.
 * @returns The smaller of the device ratio and the limit of the tier.
 */
export function tierPixelRatio(tier: QualityTier, devicePixelRatio: number): number {
  return Math.min(devicePixelRatio, TIER_SETTINGS[tier].maxPixelRatio);
}
