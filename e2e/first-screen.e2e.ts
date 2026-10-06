import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { LOAD_FAILURE_TEXT } from '../src/app/messages.ts';

/** A box on the page, in CSS pixels. */
interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The parts of the first screen that a message must not cover (design 2.8). */
const FIRST_SCREEN_PARTS = [
  '.first-screen .play',
  '.first-screen .status',
  '.first-screen .intro p',
  '.first-screen .select-piece',
] as const;

/** The window sizes of the tests: a desktop, a laptop, and a phone. */
const SIZES = [
  [1440, 900],
  [1280, 720],
  [390, 844],
] as const;

/**
 * Tells if two boxes overlap.
 *
 * @param a The first box.
 * @param b The second box.
 * @returns True if they share an area.
 */
function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/**
 * Gives the boxes of the visible parts of the first screen.
 *
 * @param page The page.
 * @returns The selector and the box of each visible part.
 */
async function firstScreenBoxes(page: Page): Promise<[string, Box][]> {
  const boxes: [string, Box][] = [];
  for (const selector of FIRST_SCREEN_PARTS) {
    const part = page.locator(selector);
    if (!(await part.isVisible())) {
      continue;
    }
    const box = await part.boundingBox();
    if (box) {
      boxes.push([selector, box]);
    }
  }
  return boxes;
}

/**
 * Expects that the message box covers no visible part of the first screen.
 *
 * @param page The page, with a message.
 */
async function expectMessageClear(page: Page): Promise<void> {
  const message = await page.locator('.message').boundingBox();
  if (!message) {
    throw new Error('The message has no box.');
  }
  const covered = (await firstScreenBoxes(page)).filter(([, box]) => overlaps(box, message));
  expect(covered.map(([selector]) => selector)).toEqual([]);
}

test.describe('a message on the first screen (audit 2026-10-06-ux-design-2, N12)', () => {
  for (const [width, height] of SIZES) {
    test(`does not cover the first screen at ${width} × ${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      // The preset files do not load, so the page shows the failure of the instruments.
      await page.context().route('**/sf/**', (route) => route.abort());
      await page.goto('./');
      await expect(page.locator('.message')).toContainText(LOAD_FAILURE_TEXT);
      await expect(page.locator('.first-screen .select-piece')).toBeVisible();
      await expectMessageClear(page);
    });
  }

  test('does not cover the first screen beside the open drawer', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('./');
    await page.waitForSelector('#stage[data-demo]');
    await page.locator('.bar button[aria-expanded]').click();
    await page.locator('.drawer input[type="file"]').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello'),
    });
    await expect(page.locator('.message')).toContainText('This file is not a valid MIDI file.');
    // The stage and the first screen move beside the drawer in 200 ms.
    await page.waitForTimeout(400);
    await expectMessageClear(page);
  });
});
