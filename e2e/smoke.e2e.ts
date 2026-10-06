import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { FIRST_PLAY, SAMPLES_READY } from '../src/app/dev-hook.ts';
import { SMOKE, playFailures } from '../tools/smoke.ts';
import type { PlaySample } from '../tools/smoke.ts';

/**
 * Reads the song time that `App` writes into the stage canvas in all builds.
 *
 * @param page The page.
 * @returns The song time, in seconds, or NaN with no attribute.
 */
async function songTimeOf(page: Page): Promise<number> {
  return Number((await page.getAttribute('#stage', 'data-song-time')) ?? Number.NaN);
}

/**
 * Collects the console errors, the uncaught errors, and the failed requests of a page. A failed
 * request shows an absolute path that the base path of the site does not hold (design 9.2).
 *
 * @param page The page.
 * @returns The list, which grows while the page runs.
 */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      errors.push(`HTTP ${response.status()}: ${response.url()}`);
    }
  });
  page.on('requestfailed', (request) => {
    errors.push(`Request failed: ${request.url()} (${request.failure()?.errorText ?? ''})`);
  });
  return errors;
}

test('plays the default demo after its count-in (design 9.3)', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('./');
  // The first play waits until the Player has loaded the samples of the default demo.
  await page.waitForSelector(SAMPLES_READY, { timeout: 60_000 });
  await page.click(FIRST_PLAY);
  const clickMs = Date.now();
  const samples: PlaySample[] = [];
  while (Date.now() < clickMs + SMOKE.playSec * 1000) {
    await page.waitForTimeout(SMOKE.sampleMs);
    const elapsedSec = (Date.now() - clickMs) / 1000;
    samples.push({ elapsedSec, songTime: await songTimeOf(page) });
  }
  const shown = await page.screenshot({ type: 'png' });
  await page.addStyleTag({ content: '#stage { visibility: hidden; }' });
  const hidden = await page.screenshot({ type: 'png' });
  const run = { samples, canvasDrawn: !shown.equals(hidden), errors };
  expect(playFailures(run)).toEqual([]);
});
