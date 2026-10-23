import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { FIRST_PLAY, SAMPLES_READY } from '../src/app/dev-hook.ts';
import { SCENE_ONLY, frameOf, stillFrame } from './stage-frame.ts';
import type { FrameOnPage } from './stage-frame.ts';

/** The half width and the half height of the middle of the frame that the sharpness test reads. */
const MIDDLE = { halfWidth: 144, halfHeight: 108 } as const;

/** The side of the blocks of the local contrast, in pixels. A block averages the film grain. */
const BLOCK = 4;

for (const [width, height] of [
  [1440, 900],
  [1000, 486],
] as const) {
  test(`a wheel on the first screen keeps the view at ${width} × ${height} (design 2.5)`, async ({
    page,
  }) => {
    // A zoom on the first screen shrank the frame from 0.92 to 0.18 of the window, and the view
    // looked steeply down at a corner of the stage (bug report of 2026-10-07).
    await page.setViewportSize({ width, height });
    await page.goto('./');
    await page.waitForSelector('#stage[data-frame]');
    const before = await stillFrame(page);
    expect(before.scale).toBeGreaterThan(0.5);

    await page.mouse.move(before.x, before.y - 0.2 * height);
    for (let i = 0; i < 12; i++) {
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(50);
    }
    const after = await stillFrame(page);

    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.scale - before.scale)).toBeLessThanOrEqual(0.005);
  });
}

/**
 * Measures the local contrast of a box of the page: the root mean square of the difference
 * between neighbor blocks of 4 × 4 pixels, in values from 0 to 255. A blur makes the steps of the
 * edges wider and lower, so the value falls. The blocks average the film grain.
 *
 * @param page The page.
 * @param middle The middle of the box, in CSS pixels.
 * @returns The local contrast.
 */
async function localContrast(page: Page, middle: FrameOnPage): Promise<number> {
  const width = 2 * MIDDLE.halfWidth;
  const height = 2 * MIDDLE.halfHeight;
  const png = await page.screenshot({
    clip: {
      x: middle.x - MIDDLE.halfWidth,
      y: middle.y - MIDDLE.halfHeight,
      width,
      height,
    },
  });
  return page.evaluate(
    async ({ source, w, h, block }) => {
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

      const columns = Math.floor(w / block);
      const rows = Math.floor(h / block);
      const means: number[] = [];
      for (let by = 0; by < rows; by++) {
        for (let bx = 0; bx < columns; bx++) {
          let sum = 0;
          for (let y = 0; y < block; y++) {
            for (let x = 0; x < block; x++) {
              const i = 4 * ((by * block + y) * w + bx * block + x);
              sum +=
                0.2126 * (data[i] ?? 0) + 0.7152 * (data[i + 1] ?? 0) + 0.0722 * (data[i + 2] ?? 0);
            }
          }
          means.push(sum / (block * block));
        }
      }

      let squares = 0;
      let count = 0;
      for (let by = 0; by < rows; by++) {
        for (let bx = 0; bx < columns; bx++) {
          const mean = means[by * columns + bx] ?? 0;
          if (bx + 1 < columns) {
            squares += (mean - (means[by * columns + bx + 1] ?? 0)) ** 2;
            count++;
          }
          if (by + 1 < rows) {
            squares += (mean - (means[(by + 1) * columns + bx] ?? 0)) ** 2;
            count++;
          }
        }
      }
      return Math.sqrt(squares / count);
    },
    {
      source: `data:image/png;base64,${png.toString('base64')}`,
      w: width,
      h: height,
      block: BLOCK,
    },
  );
}

test.describe('a deep zoom in Free mode', () => {
  test.use({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });

  test('keeps the middle of the frame sharp (design 2.5, 4.5)', async ({ page }) => {
    // A zoom put the camera among the players, and the depth of field blurred all of them (bug
    // report of 2026-10-07). With reduced motion, the page starts in Free mode at the default
    // view, and the orbit controls have no inertia.
    await page.goto('./');
    await page.waitForSelector(SAMPLES_READY, { timeout: 60_000 });
    await page.click(FIRST_PLAY);
    await page.waitForTimeout(2000);
    const frame = await frameOf(page);
    await page.mouse.move(frame.x, frame.y);
    for (let i = 0; i < 40; i++) {
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(25);
    }
    await page.keyboard.press('Space');
    await page.waitForTimeout(800);

    await page.addStyleTag({ content: SCENE_ONLY });
    await page.waitForTimeout(300);
    const sharp = await localContrast(page, frame);
    // The low tier has no depth of field (design 2.6).
    await page.locator('button', { hasText: /^Low$/u }).dispatchEvent('click');
    await page.waitForTimeout(1000);
    const reference = await localContrast(page, frame);

    // At the near limit of 2 m, the middle of the frame showed the floor between the players:
    // a contrast of about 2.
    expect(sharp).toBeGreaterThan(6);
    expect(sharp / reference).toBeGreaterThan(0.8);
  });
});
