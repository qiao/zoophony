/**
 * The largest pointer motion of a click on the stage, in CSS pixels. A longer motion is a drag of
 * the orbit controls (design 2.5).
 */
export const CLICK_SLOP_PX = 4;

/** A pointer position on the canvas, in CSS pixels. */
export interface PointerPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Tells if a press and a release of the pointer are a click, and not a drag of the view.
 *
 * @param down The position of the press.
 * @param up The position of the release.
 * @returns True if the pointer moved at most {@link CLICK_SLOP_PX}.
 */
export function isClick(down: PointerPoint, up: PointerPoint): boolean {
  return Math.hypot(up.x - down.x, up.y - down.y) <= CLICK_SLOP_PX;
}
