/**
 * The media query of the phone layout (design 2.8): a screen narrower than 700 px. `ui.css` uses
 * the same width.
 */
export const PHONE_LAYOUT_QUERY = '(max-width: 699px)';

/** A drag of the handle down by more than this share of the sheet height closes the sheet. */
export const SHEET_CLOSE_SHARE = 0.25;

/** A drag of the handle down by more than this many CSS pixels always closes the sheet. */
export const SHEET_CLOSE_PX = 80;

/**
 * Gives the move of the sheet during a drag of its handle (design 2.8). The sheet follows the
 * finger down, and it does not go up past its place above the bar.
 *
 * @param dragPx The move of the pointer since the press, in CSS pixels, down positive.
 * @returns The move of the sheet, in CSS pixels, 0 or more.
 */
export function sheetOffset(dragPx: number): number {
  return Math.max(0, dragPx);
}

/**
 * Tells if a drag of the handle closes the sheet (design 2.8): a drag down by more than a quarter
 * of the sheet height, or by more than 80 px. A shorter drag puts the sheet back.
 *
 * @param dragPx The move of the pointer from the press to the release, in CSS pixels.
 * @param sheetPx The height of the sheet, in CSS pixels.
 * @returns True if the sheet closes.
 */
export function sheetCloses(dragPx: number, sheetPx: number): boolean {
  return dragPx > Math.min(SHEET_CLOSE_PX, sheetPx * SHEET_CLOSE_SHARE);
}
