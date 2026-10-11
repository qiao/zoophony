import { expect, test } from '@playwright/test';

/** The delay of each skin request in the test, in milliseconds. */
const SKIN_DELAY_MS = 3000;

test('the first piece shows after the skins of the rigged bodies load (design 4.4, 4.5)', async ({
  page,
}) => {
  const released: string[] = [];
  await page.route(/-skin-[^/]*\.webp$/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, SKIN_DELAY_MS));
    released.push(route.request().url());
    await route.continue();
  });

  // The load event of the page waits for the skin images, so the test does not wait for it.
  await page.goto('./', { waitUntil: 'commit' });
  await page.locator('canvas[data-demo]').waitFor();
  // The rabbit of the violins and the bear conductor of the default demo each have a skin.
  expect(released).toHaveLength(2);
});
