import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { DEFAULT_DEMO, DEMOS } from '../src/app/demos.ts';
import { FIRST_PLAY, SAMPLES_READY } from '../src/app/dev-hook.ts';
import { INTRO_TEXT, LOADING_TEXT, SELECT_PIECE_TEXT, WAIT_TEXT } from '../src/app/play-control.ts';

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

test.describe('the load state on a slow network (audit 2026-10-05-ux-design, LD2)', () => {
  test('shows the name and a load text before the script runs', async ({ page }) => {
    let release = (): void => undefined;
    const held = new Promise<void>((done) => {
      release = done;
    });
    await page.route('**/*.js', async (route) => {
      await held;
      await route.continue();
    });
    // A module script runs before the event DOMContentLoaded, so the test waits only for the HTML.
    await page.goto('./', { waitUntil: 'commit' });
    await expect(page.locator('.title h1')).toHaveText('Zoophony');
    await expect(page.locator('.first-screen .status')).toHaveText(LOADING_TEXT);
    release();
    await expect(page.locator('.boot')).toHaveCount(0);
  });

  test('names the demo and shows a load text while its file loads', async ({ page }) => {
    await page.route('**/demos/**', () => {
      // The demo file never arrives. The page closes at the end of the test.
    });
    await page.goto('./');
    await expect(page.locator('.title h1')).toHaveText(DEMOS[DEFAULT_DEMO].title);
    await expect(page.locator('.first-screen .status')).toHaveText(LOADING_TEXT);
  });

  test('counts the instruments as soon as their list is known', async ({ page }) => {
    await holdPresets(page);
    await page.goto('./');
    await expect(page.locator('.first-screen .status')).toHaveText(
      /^Loading instruments: 0 of \d+$/u,
    );
  });
});

test.describe('the intro of the first screen (audit 2026-10-05-ux-design, FI2)', () => {
  test('names the app, and its button opens the demo list', async ({ page }) => {
    await page.goto('./');
    await page.waitForSelector(SAMPLES_READY);
    await expect(page.locator('.first-screen .intro p')).toHaveText(INTRO_TEXT);
    await page.getByRole('button', { name: SELECT_PIECE_TEXT }).click();
    await expect(page.locator('.drawer')).toBeVisible();
    await expect(page.locator('.demo[aria-current="true"]')).toBeFocused();
  });

  test('hides after the first play', async ({ page }) => {
    await page.goto('./');
    await page.waitForSelector(SAMPLES_READY);
    await page.click(FIRST_PLAY);
    await expect(page.locator('.first-screen')).toBeHidden();
    await page.locator('.bar button[aria-expanded]').click();
    await page.locator('.demo').last().click();
    await expect(page.locator('.first-screen')).toBeVisible();
    await expect(page.locator('.first-screen .intro')).toBeHidden();
  });
});

test.describe('the drawer after a selection (audit 2026-10-05-ux-design, PH1)', () => {
  /**
   * Opens the drawer with the drawer button of the bar, and selects the demo K. 315.
   *
   * @param page The page.
   */
  async function selectDemo(page: Page): Promise<void> {
    await page.goto('./');
    await page.waitForSelector('#stage[data-demo]');
    await page.locator('.bar button[aria-expanded]').click();
    await expect(page.locator('.drawer')).toBeVisible();
    await page.locator('.demo').last().click();
    await page.waitForSelector('#stage[data-demo="mozart-k315"]');
  }

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('a demo selection closes the sheet', async ({ page }) => {
      await selectDemo(page);
      await expect(page.locator('.drawer')).toBeHidden();
    });
  });

  test('a demo selection keeps the drawer of a desktop open', async ({ page }) => {
    await selectDemo(page);
    await expect(page.locator('.drawer')).toBeVisible();
  });
});

test.describe('the tooltips of the bar (audit 2026-10-05-ux-design, CT1)', () => {
  test('a hover shows the name and the key, and Escape hides it', async ({ page }) => {
    await page.goto('./');
    await page.waitForSelector('#stage[data-demo]');
    await page.hover('.bar .camera');
    await expect(page.locator('.tooltip')).toHaveText('Automatic camera (C)');
    await expect(page.locator('.bar .camera')).toHaveAttribute('aria-keyshortcuts', 'C');
    await page.keyboard.press('Escape');
    await expect(page.locator('.tooltip')).toBeHidden();
  });

  test('a keyboard focus shows the tooltip', async ({ page }) => {
    await page.goto('./');
    await page.waitForSelector('#stage[data-demo]');
    await page.locator('.bar button[aria-label="Mute"]').focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(page.locator('.tooltip')).toHaveText('Mute (M)');
  });
});
