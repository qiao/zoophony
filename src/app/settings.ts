import type { QualityTier } from '../scene/quality.ts';
import type { SectionSize } from '../score/types.ts';

/** The value of the setting "Quality": the automatic tier, or a tier of the user (design 2.6). */
export type QualitySetting = 'auto' | QualityTier;

/** One button of a segmented control of the settings. */
export interface SettingOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

/** The buttons of the setting "Section size", in order (design 2.8, 3.8). */
export const SECTION_SIZE_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'one-per-part', label: 'One per part' },
  { value: 'full', label: 'Full' },
] as const satisfies readonly SettingOption<SectionSize>[];

/** The buttons of the setting "Quality", in order (design 2.6, 2.8). */
export const QUALITY_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
] as const satisfies readonly SettingOption<QualitySetting>[];

/** A frame interval above this value is slow, in seconds (design 2.6). */
export const SLOW_FRAME_SEC = 0.018;

/** The time of the frames that the automatic tier measures before a decision, in seconds. */
export const TIER_WINDOW_SEC = 2;

/** The state of the automatic tier: the tier, and the frames of the current window. */
export interface TierWatch {
  readonly tier: QualityTier;
  /** The wall time of the first frame of the window, in seconds, or `null` for no window. */
  readonly windowStart: number | null;
  /** The frames after the first frame of the window. */
  readonly frames: number;
}

/**
 * Starts the automatic tier at the tier of the device (design 2.6).
 *
 * @param tier The start tier, from `startTier()` of `scene/quality.ts`.
 * @returns The watch with no window.
 */
export function watchTier(tier: QualityTier): TierWatch {
  return { tier, windowStart: null, frames: 0 };
}

/** The next lower tier of each tier. The low tier stays low. */
const LOWER_TIER = {
  high: 'medium',
  medium: 'low',
  low: 'low',
} as const satisfies Readonly<Record<QualityTier, QualityTier>>;

/**
 * Follows the frames of the page for the automatic tier (design 2.6). The tier drops one step
 * when the frames of a window of 2 s take more than 18 ms on average. It only goes down, so the
 * quality does not go down and up many times. A frame that does not measure ends the window, so
 * that the time of a pause or of a hidden tab does not count.
 *
 * @param watch The watch before the frame.
 * @param wallTime The wall time of the frame, in seconds.
 * @param measuring True while the music plays, the tab is visible, and the setting is "Auto".
 * @returns The watch after the frame.
 */
export function followFrame(watch: TierWatch, wallTime: number, measuring: boolean): TierWatch {
  if (!measuring) {
    return watch.windowStart === null ? watch : watchTier(watch.tier);
  }
  if (watch.windowStart === null) {
    return { tier: watch.tier, windowStart: wallTime, frames: 0 };
  }
  const frames = watch.frames + 1;
  const elapsed = wallTime - watch.windowStart;
  if (elapsed < TIER_WINDOW_SEC) {
    return { tier: watch.tier, windowStart: watch.windowStart, frames };
  }
  const tier = elapsed / frames > SLOW_FRAME_SEC ? LOWER_TIER[watch.tier] : watch.tier;
  return { tier, windowStart: wallTime, frames: 0 };
}

/**
 * Gives the tier of the renderer (design 2.6). A manual setting overrides the automatic tier.
 *
 * @param setting The setting "Quality".
 * @param watch The automatic tier.
 * @returns The tier.
 */
export function renderTier(setting: QualitySetting, watch: TierWatch): QualityTier {
  return setting === 'auto' ? watch.tier : setting;
}
