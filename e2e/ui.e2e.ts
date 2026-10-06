import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { FIRST_PLAY } from '../src/app/dev-hook.ts';
import { WAIT_TEXT } from '../src/app/play-control.ts';

/**
 * Holds each request of a preset file, so that the samples stay in the load. The preset index
 * goes through, so that the app knows the list of the presets.
 *
 * @param page The page.
 */
async function holdPresets(page: Page): Promise<void> {
  await page.context().route('**/sf/**', async (route) => {
    if (route.request().url().endsWith('/index.json')) {
      await route.continue();
    }
    // The other requests never get an answer. The page closes at the end of the test.
  });
}

test.describe('the first screen during the load (audit 2026-10-05-ux-design, LD1)', () => {
  test('a click waits for the samples, and a second click cancels the wait', async ({ page }) => {
    await holdPresets(page);
    await page.goto('./');
    const play = page.locator(FIRST_PLAY);
    await expect(play).toHaveAttribute('aria-label', 'Play');
    await page.waitForSelector('#stage[data-demo]');
    await play.click();
    await expect(play).toHaveAttribute('aria-label', 'Pause');
    await expect(page.locator('.first-screen .status')).toContainText(WAIT_TEXT);
    await expect(page.locator('.bar button').first()).toHaveAttribute('aria-label', 'Pause');
    await play.click();
    await expect(play).toHaveAttribute('aria-label', 'Play');
    await expect(page.locator('.first-screen .status')).not.toContainText(WAIT_TEXT);
    await expect(page.locator('.bar button').first()).toHaveAttribute('aria-label', 'Play');
  });
});
