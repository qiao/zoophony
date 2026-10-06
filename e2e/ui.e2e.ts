import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { DEFAULT_DEMO, DEMOS } from '../src/app/demos.ts';
import { FIRST_PLAY, SAMPLES_READY } from '../src/app/dev-hook.ts';
import { CAMERA_OFF_TEXTS } from '../src/app/messages.ts';
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

test.describe('the place of the first screen (audit 2026-10-05-ux-design, FI3)', () => {
  for (const [width, height, share] of [
    [1440, 900, 0.72],
    [390, 844, 0.7],
  ] as const) {
    test(`puts the play button below the stage at ${width} × ${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('./');
      await page.waitForSelector(SAMPLES_READY);
      const play = await page.locator(FIRST_PLAY).boundingBox();
      const intro = await page.locator('.first-screen .intro').boundingBox();
      const bar = await page.locator('.bar').boundingBox();
      if (!play || !intro || !bar) {
        throw new Error('The first screen or the bar has no box.');
      }
      expect(play.y + play.height / 2).toBeCloseTo(height * share, 0);
      expect(intro.y + intro.height).toBeLessThan(bar.y);
    });
  }
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

test.describe('the note of the camera (audit 2026-10-05-ux-design, CT2)', () => {
  test('a drag that turns off the automatic camera shows a note', async ({ page }) => {
    await page.goto('./');
    await page.waitForSelector(SAMPLES_READY);
    await expect(page.locator('.bar .camera')).toHaveAttribute('aria-pressed', 'true');
    await page.mouse.move(300, 200);
    await page.mouse.down();
    await page.mouse.move(340, 220, { steps: 4 });
    await page.mouse.up();
    await expect(page.locator('.bar .camera')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('.message.is-note')).toContainText(CAMERA_OFF_TEXTS.keyboard);
    // The toggle turns the camera on with no note.
    await page.locator('.bar .camera').click();
    await page.waitForTimeout(3200);
    await expect(page.locator('.message')).toBeHidden();
  });
});

test.describe('the motion and the close button of the drawer (audit 2026-10-05-ux-design, DR3)', () => {
  /**
   * Gives the CSS transitions of the drawer that run.
   *
   * @param page The page.
   * @returns The names of the properties.
   */
  async function drawerTransitions(page: Page): Promise<string[]> {
    return page.evaluate(() =>
      (document.querySelector('.drawer')?.getAnimations() ?? []).flatMap((animation) =>
        animation instanceof CSSTransition ? [animation.transitionProperty] : [],
      ),
    );
  }

  test('the drawer fades in and out, and its close button closes it', async ({ page }) => {
    await page.goto('./');
    await page.waitForSelector('#stage[data-demo]');
    await page.locator('.bar button[aria-expanded]').click();
    expect(await drawerTransitions(page)).toContain('opacity');
    // The open ends before the close starts.
    await page.waitForTimeout(400);
    await page.locator('.drawer .close-drawer').click();
    expect(await drawerTransitions(page)).toContain('opacity');
    await expect(page.locator('.drawer')).toBeHidden();
    await expect(page.locator('.bar button[aria-expanded]')).toBeFocused();
  });

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('the drawer opens with no transition', async ({ page }) => {
      await page.goto('./');
      await page.waitForSelector('#stage[data-demo]');
      await page.locator('.bar button[aria-expanded]').click();
      expect(await drawerTransitions(page)).toEqual([]);
    });
  });
});

test.describe('the drop hint on a touch screen (audit 2026-10-05-ux-design, PH2)', () => {
  // Firefox has no mobile emulation.
  test.skip(({ browserName }) => browserName === 'firefox', 'No mobile emulation in Firefox.');
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('a phone does not show "Or drop a MIDI file on the page."', async ({ page }) => {
    await page.goto('./');
    await page.waitForSelector('#stage[data-demo]');
    await page.locator('.bar button[aria-expanded]').tap();
    await expect(page.getByRole('button', { name: 'Select a MIDI file' })).toBeVisible();
    await expect(page.getByText('Or drop a MIDI file on the page.')).toBeHidden();
  });
});

test('a desktop shows the drop hint (audit 2026-10-05-ux-design, PH2)', async ({ page }) => {
  await page.goto('./');
  await page.waitForSelector('#stage[data-demo]');
  await page.locator('.bar button[aria-expanded]').click();
  await expect(page.getByText('Or drop a MIDI file on the page.')).toBeVisible();
});

test.describe('the labels of the "Playback" group (audit 2026-10-05-ux-design, PH3)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('names each control of the group', async ({ page }) => {
    await page.goto('./');
    await page.waitForSelector('#stage[data-demo]');
    await page.locator('.bar button[aria-expanded]').click();
    const group = page.getByRole('group', { name: 'Playback' });
    await group.scrollIntoViewIfNeeded();
    for (const label of ['Speed', 'Volume', 'Reset view']) {
      await expect(group.getByText(label, { exact: true })).toBeVisible();
    }
    // The full screen button shows only where the browser has a full screen for the page.
    if (await page.evaluate(() => document.fullscreenEnabled)) {
      await expect(group.getByText('Full screen', { exact: true })).toBeVisible();
    }
  });
});

test.describe('the stage beside the open drawer (audit 2026-10-05-ux-design, PH4)', () => {
  /**
   * Opens the drawer and gives the box of the stage canvas after its move.
   *
   * @param page The page.
   * @returns The box of the canvas.
   */
  async function stageWithDrawer(page: Page): Promise<{ x: number; y: number }> {
    await page.goto('./');
    await page.waitForSelector('#stage[data-demo]');
    await page.locator('.bar button[aria-expanded]').click();
    await page.waitForTimeout(400);
    const box = await page.locator('#stage').boundingBox();
    if (!box) {
      throw new Error('The stage has no box.');
    }
    return box;
  }

  test('the stage moves left beside the drawer of a desktop', async ({ page }) => {
    const box = await stageWithDrawer(page);
    expect(box.x).toBeCloseTo(-176, 0);
    expect(box.y).toBe(0);
  });

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('the stage moves up above the sheet', async ({ page }) => {
      const box = await stageWithDrawer(page);
      expect(box.x).toBe(0);
      expect(box.y).toBeCloseTo(20 - 0.3 * 844, 0);
    });
  });
});
