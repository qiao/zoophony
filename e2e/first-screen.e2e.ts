import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { SAMPLES_READY } from '../src/app/dev-hook.ts';
import { LOAD_FAILURE_TEXT } from '../src/app/messages.ts';
import { firstPaintFailures, readFirstPaint } from '../tools/first-paint.ts';

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

/** The window sizes of the tests: a desktop, a laptop, a phone, and two phones in landscape. */
const SIZES = [
  [1440, 900],
  [1280, 720],
  [390, 844],
  [844, 390],
  [667, 375],
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

test('the first paint is dark, with no black load ring, before the script runs', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  expect(firstPaintFailures(await readFirstPaint(page, './'))).toEqual([]);
});

test.describe('a message on the first screen (audit 2026-10-06-ux-design-2, N12)', () => {
  test('stays above the bar when the sheet of a phone covers the first screen', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./');
    await page.waitForSelector('#stage[data-demo]');
    await page.locator('.bar button[aria-expanded]').click();
    await page.locator('.drawer input[type="file"]').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello'),
    });
    await expect(page.locator('.message')).toBeVisible();
    const message = await page.locator('.message').boundingBox();
    const bar = await page.locator('.bar').boundingBox();
    if (!message || !bar) {
      throw new Error('The message or the bar has no box.');
    }
    expect(bar.y - (message.y + message.height)).toBeCloseTo(20, 0);
  });

  for (const [width, height] of SIZES) {
    test(`does not cover the first screen at ${width} × ${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      // The preset files do not load, so the page shows the failure of the instruments.
      await page.context().route('**/sf/**', (route) => route.abort());
      // The message closes after 6 s, so the test does not wait for the load event, which comes
      // late in a busy Firefox.
      await page.goto('./', { waitUntil: 'commit' });
      await expect(page.locator('.message:not([hidden])')).toContainText(LOAD_FAILURE_TEXT);
      // Beside the drawer that a short and wide window opens at start, the drawer holds the demo
      // list, and the first screen has no "Select music" (design 2.8).
      const wayOut = (await page.locator('.drawer').isVisible())
        ? page.locator('.drawer .demo[aria-current="true"]')
        : page.locator('.first-screen .select-piece');
      await expect(wayOut).toBeVisible();
      await expectMessageClear(page);
    });
  }

  test('does not cover the first screen beside the open drawer', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('./');
    await page.waitForSelector('#stage[data-demo]');
    // A wide window opens the drawer at start (design 2.8).
    await expect(page.locator('.drawer')).toBeVisible();
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

/**
 * The largest lamp of the hall in the image of a test, in pixels on each side: the body and the
 * lit middle of its glow (design 4.5, hall). A lit area that is no larger and that does not touch
 * the edge of the box is a lamp.
 */
const LAMP_PIXELS = 24;

/**
 * Counts the lit pixels of the stage in a box: the pixels with a channel above 70. The page
 * background and the dark beam beside the stage stay below it, and the lit floor and the animals
 * are above it. A lamp of the hall and its glow are also above it, so the count leaves out each
 * lit area that fits in {@link LAMP_PIXELS} and does not touch the edge of the box. The stage and
 * the players under the button reach the edge of the box.
 *
 * @param page The page, with the first screen out of view.
 * @param box The box.
 * @returns The share of the lit pixels of the stage, from 0 to 1.
 */
async function litShare(page: Page, box: Box): Promise<number> {
  const png = await page.screenshot({ clip: box });
  return page.evaluate(
    async ({ source, lampPixels }) => {
      const image = new Image();
      image.src = source;
      await image.decode();
      const canvas = document.createElement('canvas');
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('No 2D context.');
      }
      context.drawImage(image, 0, 0);
      const { data } = context.getImageData(0, 0, width, height);
      const lit = new Uint8Array(width * height);
      for (let p = 0; p < lit.length; p++) {
        const i = p * 4;
        lit[p] = Math.max(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0) > 70 ? 1 : 0;
      }

      // Each lit area in turn: a flood fill with its size and its bounds.
      const seen = new Uint8Array(width * height);
      let stage = 0;
      for (let start = 0; start < lit.length; start++) {
        if (!lit[start] || seen[start]) {
          continue;
        }
        const stack = [start];
        seen[start] = 1;
        let count = 0;
        let [x0, y0, x1, y1] = [width, height, 0, 0];
        while (stack.length > 0) {
          const p = stack.pop() ?? 0;
          const x = p % width;
          const y = Math.floor(p / width);
          count++;
          [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
          for (const [nx, ny] of [
            [x - 1, y],
            [x + 1, y],
            [x, y - 1],
            [x, y + 1],
          ] as const) {
            const q = ny * width + nx;
            if (nx >= 0 && ny >= 0 && nx < width && ny < height && lit[q] && !seen[q]) {
              seen[q] = 1;
              stack.push(q);
            }
          }
        }
        const atEdge = x0 === 0 || y0 === 0 || x1 === width - 1 || y1 === height - 1;
        const small = x1 - x0 < lampPixels && y1 - y0 < lampPixels;
        if (atEdge || !small) {
          stage += count;
        }
      }
      return stage / lit.length;
    },
    { source: `data:image/png;base64,${png.toString('base64')}`, lampPixels: LAMP_PIXELS },
  );
}

test.describe('the first screen on a short screen (audit 2026-10-06-ux-design-2, N14)', () => {
  for (const [width, height] of [
    [1440, 900],
    [1280, 720],
    [844, 390],
    [667, 375],
  ] as const) {
    test(`the play button does not cover the stage at ${width} × ${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('./');
      await page.waitForSelector(SAMPLES_READY);
      const ring = await page.locator('.first-screen .play').boundingBox();
      if (!ring) {
        throw new Error('The play button has no box.');
      }
      // The box of the load ring is 6 px larger on each side.
      const box = {
        x: ring.x - 6,
        y: ring.y - 6,
        width: ring.width + 12,
        height: ring.height + 12,
      };
      // The opacity hides the first screen from the screenshot. The app still sees the play
      // button, so the stage keeps its place clear of it (design 2.8).
      await page.addStyleTag({ content: '.first-screen { opacity: 0; }' });
      // Two frames show the stage with no first screen.
      await page.waitForTimeout(100);
      expect(await litShare(page, box)).toBeLessThan(0.01);
    });
  }

  test('beside the open drawer, the play button stands between the stage and the drawer', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('./');
    await page.waitForSelector(SAMPLES_READY);
    // A wide window opens the drawer at start (design 2.8).
    await expect(page.locator('.drawer')).toBeVisible();
    // The stage and the first screen move in 200 ms.
    await page.waitForTimeout(400);
    const play = page.locator('.first-screen .play');
    await expect(play).toBeVisible();
    await expect(page.locator('.first-screen .intro')).toBeHidden();
    const ring = await play.boundingBox();
    const drawer = await page.locator('.drawer').boundingBox();
    if (!ring || !drawer) {
      throw new Error('The play button or the drawer has no box.');
    }
    expect(ring.x + ring.width + 6).toBeLessThan(drawer.x);
    const box = { x: ring.x - 6, y: ring.y - 6, width: ring.width + 12, height: ring.height + 12 };
    await page.addStyleTag({ content: '.first-screen { opacity: 0; }' });
    await page.waitForTimeout(100);
    expect(await litShare(page, box)).toBeLessThan(0.01);
  });

  test('beside the open drawer, a gap that is too narrow shows no play button', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('./');
    await page.waitForSelector(SAMPLES_READY);
    await page.locator('.bar button[aria-expanded]').click();
    await expect(page.locator('.first-screen .play')).toBeHidden();
    await page.locator('.drawer .close-drawer').click();
    await expect(page.locator('.first-screen .play')).toBeVisible();
  });
});
