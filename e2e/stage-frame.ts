import type { Page } from '@playwright/test';

/** The style that hides the parts of the page over the canvas, so that a screenshot shows the scene. */
export const SCENE_ONLY = `
  .title, .bar, .drawer, .message, .first-screen { visibility: hidden !important; }`;

/** The frame of the camera on the canvas, from the attribute `data-frame` of the canvas. */
export interface FrameOnPage {
  /** The middle of the frame, from the left edge of the canvas, in CSS pixels. */
  readonly x: number;
  /** The middle of the frame, from the top edge of the canvas, in CSS pixels. */
  readonly y: number;
  /** The size of the frame divided by the size of the canvas. */
  readonly scale: number;
}

/**
 * Reads the frame of the camera that `App` writes into the canvas (design 9.3).
 *
 * @param page The page.
 * @returns The frame.
 */
export async function frameOf(page: Page): Promise<FrameOnPage> {
  const text = (await page.getAttribute('#stage', 'data-frame')) ?? '';
  const [x = NaN, y = NaN, scale = NaN] = text.split(' ').map(Number);
  return { x, y, scale };
}

/**
 * Waits until the frame of the camera stays the same for 500 ms, after the glide of the first
 * screen (design 2.8).
 *
 * @param page The page.
 * @returns The frame.
 */
export async function stillFrame(page: Page): Promise<FrameOnPage> {
  let last = await frameOf(page);
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(500);
    const now = await frameOf(page);
    if (now.x === last.x && now.y === last.y && now.scale === last.scale) {
      return now;
    }
    last = now;
  }
  return last;
}
