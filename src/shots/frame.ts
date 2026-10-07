import { VIEW_OFFSET_Y } from './view.ts';

/**
 * The part of the canvas that shows the frame of the camera, in CSS pixels (design 4.5, camera).
 * The frame is the image of the field of view at the aspect of the canvas. The canvas always
 * fills the window, and the camera also renders the area outside the frame, so the scene
 * continues under the bar and the drawer.
 */
export interface ViewFrame {
  /** The size of the frame divided by the size of the canvas: 1, or less to fit a free area. */
  readonly scale: number;
  /** The middle of the frame, from the left edge of the canvas. */
  readonly x: number;
  /** The middle of the frame, from the top edge of the canvas. */
  readonly y: number;
}

/** The parts of the page over the canvas that move the frame (design 2.8, 4.5). */
export interface FrameCover {
  /** The width that the open drawer of a wide window covers at the right, or 0. */
  readonly right: number;
  /** The move of the frame up above the sheet of a phone, or 0. */
  readonly lift: number;
}

/** The height that the bar covers at the bottom of the canvas, in CSS pixels (design 2.8). */
export const BAR_COVER = 2 * VIEW_OFFSET_Y;

/**
 * The width that the open drawer of a wide window covers at the right, in CSS pixels: the panel of
 * 340 px and its gap of 12 px (design 2.8).
 */
export const DRAWER_COVER = 352;

/**
 * The share of the height of the window that the sheet of a phone moves the frame up, less
 * {@link SHEET_LIFT.below} (design 2.8).
 */
export const SHEET_LIFT = { share: 0.3, below: 20 } as const;

/**
 * Calculates the frame of the camera on the canvas (design 4.5, camera). The middle of the frame
 * is the middle of the free area: above the bar, and left of the open drawer of a wide window.
 * The sheet of a phone moves it up.
 *
 * @param width The width of the canvas, in CSS pixels.
 * @param height The height of the canvas, in CSS pixels.
 * @param cover The parts of the page over the canvas.
 * @returns The frame.
 */
export function viewFrame(width: number, height: number, cover: FrameCover): ViewFrame {
  return {
    scale: 1,
    x: (width - cover.right) / 2,
    y: (height - BAR_COVER) / 2 - cover.lift,
  };
}

/**
 * Gives the move of the frame above the sheet of a phone (design 2.8): 30% of the height less
 * 20 px, so that the stage shows between the title and the sheet.
 *
 * @param height The height of the window, in CSS pixels.
 * @returns The move up, in CSS pixels.
 */
export function sheetLift(height: number): number {
  return SHEET_LIFT.share * height - SHEET_LIFT.below;
}

/**
 * Gives the arguments of `PerspectiveCamera.setViewOffset()` that show a frame on the canvas.
 * The full image of the camera is the frame, and the sub-view is the canvas.
 *
 * @param width The width of the canvas, in CSS pixels.
 * @param height The height of the canvas, in CSS pixels.
 * @param frame The frame.
 * @returns The full width, the full height, the x and the y of the sub-view, its width, and its
 *   height.
 */
export function viewOffset(
  width: number,
  height: number,
  frame: ViewFrame,
): [number, number, number, number, number, number] {
  const fullWidth = width * frame.scale;
  const fullHeight = height * frame.scale;
  return [fullWidth, fullHeight, fullWidth / 2 - frame.x, fullHeight / 2 - frame.y, width, height];
}
