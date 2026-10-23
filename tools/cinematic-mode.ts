import type { Page } from '@playwright/test';

/** The "Automatic camera" toggle when it is on: the page is in Cinematic mode (design 2.5). */
const CINEMATIC_TOGGLE = '.bar .camera[aria-pressed="true"]';

/**
 * Turns on the automatic camera of a page with the key C, before the click on play (design 2.5).
 * A site of a commit before 2026-10-22 starts in Cinematic mode, so the key comes only when the
 * toggle is off. Thus a compare of two commits renders the same mode.
 *
 * @param page The page, after its samples are ready.
 * @throws Error when the toggle is not on 2 s after the key.
 */
export async function startCinematic(page: Page): Promise<void> {
  if ((await page.locator(CINEMATIC_TOGGLE).count()) > 0) {
    return;
  }
  await page.keyboard.press('c');
  await page.waitForSelector(CINEMATIC_TOGGLE, { state: 'attached', timeout: 2000 });
}
