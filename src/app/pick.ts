/**
 * The largest pointer motion of a click on an animal, in CSS pixels. A longer motion is a drag of
 * the orbit controls, so it does not open a seat row (design 2.3, 2.5).
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

/**
 * Gives the seat of a player of the scene (design 2.3). The scene puts the conductor after the
 * players, and the conductor has no seat.
 *
 * @param players The players of the pose plan, in the order of the scene.
 * @param index The index of the player mesh in the scene.
 * @returns The seat index, or `null` for the conductor or no player.
 */
export function seatOfPlayer(
  players: readonly { readonly seatIndex: number }[],
  index: number,
): number | null {
  return players[index]?.seatIndex ?? null;
}
