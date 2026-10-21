import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Reads the middle of the frame of the camera on the canvas (design 4.5): the attribute
 * `data-frame` of the canvas.
 *
 * @param page The page.
 * @returns The x of the middle of the frame, in CSS pixels.
 */
async function frameX(page: Page): Promise<number> {
  const frame = (await page.getAttribute('#stage', 'data-frame')) ?? '';
  return Number(frame.split(' ')[0]);
}

test.describe('the open drawer (design 2.8)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('keeps the canvas over the full window beside the open drawer (review of step 8, M3)', async ({
    page,
  }) => {
    await page.goto('./');
    await page.waitForSelector('#stage[data-demo]');
    // A wide window opens the drawer at start (design 2.8).
    await expect(page.locator('.drawer')).toBeVisible();
    await page.waitForTimeout(400);
    // The canvas does not move, so the scene continues under the drawer and the bar with no
    // edge. The frame of the camera moves to the middle of the free area.
    expect(await page.locator('#stage').boundingBox()).toEqual({
      x: 0,
      y: 0,
      width: 1440,
      height: 900,
    });
    expect(Math.abs((await frameX(page)) - 544)).toBeLessThanOrEqual(1);
  });
});
