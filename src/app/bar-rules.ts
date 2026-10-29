/** The time with no pointer motion after which the bar hides during play, in seconds (2.3). */
export const BAR_HIDE_SEC = 3;

/** The speeds of the speed menu of the bar (design 2.4, 2.8). */
export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5] as const;

/** One speed of the speed menu. */
export type Speed = (typeof SPEEDS)[number];

/** The speed at start. */
export const DEFAULT_SPEED: Speed = 1;

/** The inputs of the rule that hides the bar (design 2.3, 2.8). */
export interface BarActivity {
  /** True while the transport plays. */
  readonly playing: boolean;
  /** The time since the last pointer motion or tap on the page, in seconds. */
  readonly idleSec: number;
  /** True while the bar holds the keyboard focus. */
  readonly focused: boolean;
  /** True while the pointer is over the bar. */
  readonly hovered: boolean;
  readonly drawerOpen: boolean;
}

/**
 * Tells if the bar shows (design 2.3, 2.8). While the music plays, the bar hides after
 * {@link BAR_HIDE_SEC} with no pointer motion. It stays while it has the focus, while the pointer
 * is over it, and while the drawer is open.
 *
 * @param activity The play state and the activity of the user.
 * @returns True if the bar shows.
 */
export function barShows(activity: BarActivity): boolean {
  return (
    !activity.playing ||
    activity.idleSec < BAR_HIDE_SEC ||
    activity.focused ||
    activity.hovered ||
    activity.drawerOpen
  );
}

/**
 * Gives the text of a speed in the speed menu (design 2.8): the factor with at least one decimal,
 * as the pill "1.0x" of the mockup, and the sign of the multiplication.
 *
 * @param speed The speed.
 * @returns The text, for example "0.75×" or "1.0×".
 */
export function speedText(speed: Speed): string {
  return `${Number.isInteger(speed) ? speed.toFixed(1) : String(speed)}×`;
}

/** The position of the volume slider at start, from 0 to 100. */
export const DEFAULT_VOLUME = 100;

/**
 * Gives the volume gain of the output chain from the volume slider and the mute button (design
 * 6.8). The gain is the square of the slider position, so that the loudness changes evenly along
 * the slider.
 *
 * @param volume The position of the volume slider, from 0 to 100.
 * @param muted True while the mute button is on.
 * @returns The gain, from 0 to 1.
 */
export function volumeGain(volume: number, muted: boolean): number {
  if (muted) {
    return 0;
  }
  const share = Math.min(1, Math.max(0, volume / 100));
  return share * share;
}
