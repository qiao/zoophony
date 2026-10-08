import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/** The frame of the camera on the canvas, from the attribute `data-frame` of the canvas. */
interface FrameOnPage {
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
async function frameOf(page: Page): Promise<FrameOnPage> {
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
async function stillFrame(page: Page): Promise<FrameOnPage> {
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

for (const [width, height] of [
  [1440, 900],
  [1000, 486],
] as const) {
  test(`a wheel on the first screen keeps the view at ${width} × ${height} (design 2.5)`, async ({
    page,
  }) => {
    // A zoom on the first screen shrank the frame from 0.92 to 0.18 of the window, and the view
    // looked steeply down at a corner of the stage (bug report of 2026-10-07).
    await page.setViewportSize({ width, height });
    await page.goto('./');
    await page.waitForSelector('#stage[data-frame]');
    const before = await stillFrame(page);
    expect(before.scale).toBeGreaterThan(0.5);

    await page.mouse.move(before.x, before.y - 0.2 * height);
    for (let i = 0; i < 12; i++) {
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(50);
    }
    const after = await stillFrame(page);

    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.scale - before.scale)).toBeLessThanOrEqual(0.005);
    // The automatic camera stays on, so the click on Play shows the film.
    await expect(page.locator('.bar .camera')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.message')).toBeHidden();
  });
}
