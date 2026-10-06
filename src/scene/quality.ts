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
  /** The number of levels of the bloom, from half size down. 0 turns the bloom off. */
  readonly bloomLevels: number;
  /** The number of samples of the depth of field for each pixel. 0 turns it off. */
  readonly blurSamples: number;
}

/**
 * The values of each tier (design 2.6). The low tier keeps the final pass of the post effects
 * (the tone mapping, the color grade, the vignette, and the grain), because it costs one sample
 * for each pixel. It drops the bloom and the depth of field.
 */
export const TIER_SETTINGS = {
  high: {
    shadowMapSize: 2048,
    shadowRadius: 3,
    maxPixelRatio: 2,
    bloomLevels: 6,
    blurSamples: 32,
  },
  medium: {
    shadowMapSize: 1024,
    shadowRadius: 1,
    maxPixelRatio: 1.5,
    bloomLevels: 5,
    blurSamples: 16,
  },
  low: {
    shadowMapSize: 512,
    shadowRadius: 1,
    maxPixelRatio: 1,
    bloomLevels: 0,
    blurSamples: 0,
  },
} as const satisfies Readonly<Record<QualityTier, TierSettings>>;

/** A viewport with a shorter side below this value, in CSS pixels, is a small screen (2.6). */
export const SMALL_SCREEN_SIDE = 600;

/**
 * Selects the tier at start from the device (design 2.6).
 *
 * @param coarsePointer True if the primary pointer is a finger, as on a phone or a tablet.
 * @param viewportWidth The width of the viewport, in CSS pixels.
 * @param viewportHeight The height of the viewport, in CSS pixels.
 * @returns `low` for a coarse pointer or a small screen, else `high`.
 */
export function startTier(
  coarsePointer: boolean,
  viewportWidth: number,
  viewportHeight: number,
): QualityTier {
  if (coarsePointer || Math.min(viewportWidth, viewportHeight) < SMALL_SCREEN_SIDE) {
    return 'low';
  }
  return 'high';
}

/** The part of a window that {@link startTierOf} reads. */
export interface DeviceSource {
  readonly innerWidth: number;
  readonly innerHeight: number;
  matchMedia(query: string): { readonly matches: boolean };
}

/**
 * Selects the tier at start from a window (design 2.6). The media query `(pointer: coarse)` is
 * the touch signal. A laptop with a touch screen has a fine primary pointer, so it starts at the
 * high tier.
 *
 * @param source The window.
 * @returns The start tier.
 */
export function startTierOf(source: DeviceSource): QualityTier {
  const coarse = source.matchMedia('(pointer: coarse)').matches;
  return startTier(coarse, source.innerWidth, source.innerHeight);
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
