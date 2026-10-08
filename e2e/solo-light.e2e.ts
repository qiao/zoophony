import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { SAMPLES_READY } from '../src/app/dev-hook.ts';

/** The style that hides the parts of the page over the canvas, so that a screenshot shows the scene. */
const SCENE_ONLY = `
  .title, .bar, .drawer, .message, .first-screen { visibility: hidden !important; }`;

/** The frame of the camera on the canvas, from the attribute `data-frame` of the canvas. */
interface FrameOnPage {
  /** The middle of the frame, from the left edge of the canvas, in CSS pixels. */
  readonly x: number;
  /** The middle of the frame, from the top edge of the canvas, in CSS pixels. */
  readonly y: number;
  /** The size of the frame divided by the size of the canvas. */
  readonly scale: number;
}

/** A box of the scene, in parts of the size of the frame, from the middle of the frame. */
interface FrameBox {
  /** The middle of the box, right of the middle of the frame. */
  readonly x: number;
  /** The middle of the box, below the middle of the frame. */
  readonly y: number;
  /** The width of the box. */
  readonly width: number;
  /** The height of the box. */
  readonly height: number;
}

/** The size of the window of the test. The drawer with the seat list is open at this size. */
const WINDOW = { width: 1440, height: 900 } as const;

/** The box of the conductor in the default view of the default demo (Boulanger). */
const CONDUCTOR: FrameBox = { x: 0, y: 0.43, width: 0.12, height: 0.23 };

/** The box of the three cellos at the front right in the default view of Boulanger. */
const CELLOS: FrameBox = { x: 0.33, y: 0.4, width: 0.23, height: 0.34 };

/**
 * Reads the frame of the camera that `App` writes into the canvas (design 9.3).
 *
 * @param page The page.
 * @returns The frame.
 */
async function frameOf(page: Page): Promise<FrameOnPage> {
  const text = (await page.getAttribute('#stage', 'data-frame')) ?? '';
  const [x = NaN, y = NaN, scale = NaN] = text.split(' ').map(Number);
  return { x, y, scale };
}

/**
 * Waits until the frame of the camera stays the same for 500 ms, after the glide of the first
 * screen (design 2.8).
 *
 * @param page The page.
 * @returns The frame.
 */
async function stillFrame(page: Page): Promise<FrameOnPage> {
  let last = await frameOf(page);
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(500);
    const now = await frameOf(page);
    if (now.x === last.x && now.y === last.y && now.scale === last.scale) {
      return now;
    }
    last = now;
  }
  return last;
}

/**
 * Measures the mean value (0.2126 R + 0.7152 G + 0.0722 B) of a box of the scene, with the parts
 * of the page over the canvas hidden.
 *
 * @param page The page.
 * @param frame The frame of the camera.
 * @param box The box.
 * @returns The mean value, from 0 to 255.
 */
async function meanValue(page: Page, frame: FrameOnPage, box: FrameBox): Promise<number> {
  const frameWidth = frame.scale * WINDOW.width;
  const frameHeight = frame.scale * WINDOW.height;
  const width = Math.round(box.width * frameWidth);
  const height = Math.round(box.height * frameHeight);
  const png = await page.screenshot({
    clip: {
      x: frame.x + box.x * frameWidth - width / 2,
      y: frame.y + box.y * frameHeight - height / 2,
      width,
      height,
    },
  });
  return page.evaluate(
    async ({ source, w, h }) => {
      const image = new Image();
      image.src = source;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('No 2D context.');
      }
      context.drawImage(image, 0, 0, w, h);
      const { data } = context.getImageData(0, 0, w, h);

      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        sum += 0.2126 * (data[i] ?? 0) + 0.7152 * (data[i + 1] ?? 0) + 0.0722 * (data[i + 2] ?? 0);
      }
      return sum / (w * h);
    },
    { source: `data:image/png;base64,${png.toString('base64')}`, w: width, h: height },
  );
}

/**
 * Measures the boxes of the conductor and the cellos with the parts of the page over the canvas
 * hidden, then shows the parts again.
 *
 * @param page The page.
 * @param frame The frame of the camera.
 * @returns The mean value of the conductor box and of the cello box.
 */
async function measureStage(page: Page, frame: FrameOnPage): Promise<[number, number]> {
  const style = await page.addStyleTag({ content: SCENE_ONLY });
  await page.waitForTimeout(300);
  const values: [number, number] = [
    await meanValue(page, frame, CONDUCTOR),
    await meanValue(page, frame, CELLOS),
  ];
  await style.evaluate((node) => {
    node.parentNode?.removeChild(node);
  });
  return values;
}

test.describe('the spotlight of a solo (design 2.4, 4.5)', () => {
  // With reduced motion, the page starts in Free mode at the default view, and the lights move to
  // a new aim at once.
  test.use({ reducedMotion: 'reduce', viewport: WINDOW });

  test('moves to the soloed cellos, and back when the solo ends', async ({ page }) => {
    await page.goto('./');
    await page.waitForSelector(SAMPLES_READY, { timeout: 60_000 });
    const frame = await stillFrame(page);
    const solo = page.locator('button[aria-label="Solo Cellos"]');
    const [conductor, cellos] = await measureStage(page, frame);

    await solo.click();
    await expect(solo).toHaveAttribute('aria-pressed', 'true');
    const [conductorSolo, cellosSolo] = await measureStage(page, frame);

    await solo.click();
    await expect(solo).toHaveAttribute('aria-pressed', 'false');
    const [conductorBack, cellosBack] = await measureStage(page, frame);

    // In Chromium on the development Mac, the conductor box fell from 106 to 55, and the cello
    // box rose from 106 to 116.
    expect(conductorSolo).toBeLessThan(0.75 * conductor);
    expect(cellosSolo).toBeGreaterThan(1.04 * cellos);
    expect(Math.abs(conductorBack - conductor)).toBeLessThan(0.03 * conductor);
    expect(Math.abs(cellosBack - cellos)).toBeLessThan(0.03 * cellos);
  });
});
