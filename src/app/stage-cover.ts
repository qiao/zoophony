import { DRAWER_COVER, sheetLift } from '../shots/frame.ts';
import type { FrameCover } from '../shots/frame.ts';

/** The state of the page that moves the frame of the camera (design 2.8). */
export interface CoverState {
  /** True in the phone layout (`PHONE_LAYOUT_QUERY`): the drawer is a sheet above the bar. */
  readonly phone: boolean;
  readonly drawerOpen: boolean;
  /** True while the open drawer moves the stage: it did not open from a click on an animal. */
  readonly drawerMovesStage: boolean;
  /** The height of the canvas, in CSS pixels. */
  readonly height: number;
}

/**
 * Gives the parts of the page over the canvas that move the frame (design 2.8). The open drawer
 * of a wider screen covers 352 px at the right, so the frame moves 176 px to the left. Above the
 * sheet of a phone, the frame moves up by 30% of the height less 20 px. A drawer that a click on
 * an animal opened keeps the frame in place, so that the next click hits the animal under the
 * pointer. On a phone, the frame still moves up above the sheet.
 *
 * @param state The state of the page.
 * @returns The cover.
 */
export function stageCover(state: CoverState): FrameCover {
  if (state.phone) {
    return { right: 0, lift: state.drawerOpen ? sheetLift(state.height) : 0 };
  }
  return { right: state.drawerMovesStage ? DRAWER_COVER : 0, lift: 0 };
}
