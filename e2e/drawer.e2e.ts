import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Clicks the points of a grid over the stage of the default view until a click hits an animal
 * and opens the drawer.
 *
 * @param page The page at 1440 × 900, with the first piece on the stage.
 */
async function clickAnimal(page: Page): Promise<void> {
  for (let y = 360; y <= 520; y += 40) {
    for (let x = 520; x <= 940; x += 30) {
      await page.mouse.click(x, y);
      if (await page.locator('.drawer').isVisible()) {
        return;
      }
    }
  }
  throw new Error('No click hit an animal.');
}

test.describe('a click on an animal (audit 2026-10-06-ux-design-2, N18)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('opens the drawer and keeps the stage in place', async ({ page }) => {
    await page.goto('./');
    await page.waitForSelector('#stage[data-demo]');
    // A wide window opens the drawer at start (design 2.8). The stage moves back in 200 ms.
    await page.locator('.drawer .close-drawer').click();
    await page.waitForTimeout(400);
    await clickAnimal(page);
    await expect(page.locator('.seat.is-open')).toHaveCount(1);
    // The stage would move in 200 ms.
    await page.waitForTimeout(400);
    await expect(page.locator('#stage')).toHaveAttribute('data-frame', '720 416 1.000');
    // The drawer button opens the drawer with the stage beside it.
    await page.locator('.drawer .close-drawer').click();
    await page.locator('.bar button[aria-expanded]').click();
    await page.waitForTimeout(400);
    await expect(page.locator('#stage')).toHaveAttribute('data-frame', '544 416 1.000');
  });

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
    await expect(page.locator('#stage')).toHaveAttribute('data-frame', '544 416 1.000');
  });
});
