import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/** The window sizes of the check: a desktop, a laptop, and a phone (design 2.8). */
const SIZES = [
  [1440, 900],
  [1280, 720],
  [390, 844],
] as const;

/**
 * The largest change of the gray value between two neighbor pixels along a line of the shade.
 * The soft fade of the shade changes by 1 to 3 per pixel. The hard edge of a box changes by
 * about 190 over a white background.
 */
const MOST_STEP = 12;

/**
 * Reads the gray values of the pixels of the top left corner of the page.
 *
 * @param page The page, with the shade over a white background and no text.
 * @param width The width of the corner, in CSS pixels.
 * @param height The height of the corner, in CSS pixels.
 * @returns The gray value of each pixel, row by row.
 */
async function cornerGrays(page: Page, width: number, height: number): Promise<number[][]> {
  const png = await page.screenshot({ clip: { x: 0, y: 0, width, height } });
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
      const rows: number[][] = [];
      for (let y = 0; y < h; y++) {
        const row: number[] = [];
        for (let x = 0; x < w; x++) {
          const i = 4 * (y * w + x);
          row.push(((data[i] ?? 0) + (data[i + 1] ?? 0) + (data[i + 2] ?? 0)) / 3);
        }
        rows.push(row);
      }
      return rows;
    },
    { source: `data:image/png;base64,${png.toString('base64')}`, w: width, h: height },
  );
}

/**
 * Gives the largest change between two neighbor values.
 *
 * @param values The values along a line.
 * @returns The largest step.
 */
function largestStep(values: readonly number[]): number {
  let most = 0;
  for (let i = 1; i < values.length; i++) {
    most = Math.max(most, Math.abs((values[i] ?? 0) - (values[i - 1] ?? 0)));
  }
  return most;
}

test.describe('the shade behind the title (design 2.8, audit 2026-10-06-ux-design-2, N21)', () => {
  for (const [width, height] of SIZES) {
    test(`starts at the window corner and has no straight edge at ${width} × ${height}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.goto('./');
      await page.waitForSelector('#stage[data-demo]');
      // A white page with no canvas and no text shows the full shade alone, as over a light
      // floor. The probe of the backdrop reads the hidden canvas, so the test sets the level.
      await page.addStyleTag({
        content: `
          body { background: #fff !important; }
          .title::before { opacity: 1 !important; transition: none !important; }
          #stage, .drawer, .first-screen, .bar { visibility: hidden !important; }
          .title, .title * { color: transparent !important; text-shadow: none !important; }
          .title svg { visibility: hidden !important; }`,
      });
      await page.waitForTimeout(100);
      const box = await page.locator('.title').boundingBox();
      if (!box) {
        throw new Error('The title has no box.');
      }
      const w = Math.min(width, Math.ceil(box.x + 2 * box.width));
      const h = Math.min(height, Math.ceil(box.y + 3 * box.height));
      const grays = await cornerGrays(page, w, h);
      // The shade is dark at the window corner: its opaque part starts there.
      expect(grays[2]?.[2] ?? 255).toBeLessThan(100);
      // Along the top row, the left column, and the rows and the columns through the title, the
      // shade fades with no hard step.
      const middle = Math.round(box.y + box.height / 2);
      const center = Math.round(box.x + box.width / 2);
      const lines = [
        grays[1] ?? [],
        grays[middle] ?? [],
        grays.map((row) => row[1] ?? 0),
        grays.map((row) => row[center] ?? 0),
      ];
      for (const line of lines) {
        expect(largestStep(line)).toBeLessThanOrEqual(MOST_STEP);
      }
    });
  }
});

/**
 * Reads the opacity of the title shade: its level from 0 to 1.
 *
 * @param page The page.
 * @returns The opacity of the shade.
 */
async function shadeOpacity(page: Page): Promise<number> {
  return page.evaluate(() => {
    const title = document.querySelector('.title');
    return title ? Number(getComputedStyle(title, '::before').opacity) : Number.NaN;
  });
}

test.describe('the level of the title shade (design 2.8)', () => {
  test('shows no shade over the dark hall of the default view at 1440 × 900', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('./');
    await page.waitForSelector('#stage[data-demo]');
    // The mockup shows the title over the dark hall, and the beam right next to it.
    await expect.poll(() => shadeOpacity(page), { timeout: 5000 }).toBe(0);
  });

  test('darkens the backdrop of the text over a white frame', async ({ page }) => {
    // With the attribute `data-white-frame` on the root, each read of the frame behind the title
    // gives white pixels, as white fur in a close shot.
    await page.addInitScript(() => {
      // oxlint-disable-next-line typescript/unbound-method -- the wrapper gives it its context.
      const read = WebGL2RenderingContext.prototype.getBufferSubData;
      WebGL2RenderingContext.prototype.getBufferSubData = function white(
        this: WebGL2RenderingContext,
        ...args: Parameters<WebGL2RenderingContext['getBufferSubData']>
      ): void {
        read.apply(this, args);
        if (document.documentElement.dataset['whiteFrame'] !== 'on') {
          return;
        }
        const [, , destination] = args;
        new Uint8Array(destination.buffer, destination.byteOffset, destination.byteLength).fill(
          255,
        );
      };
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('./');
    await page.waitForSelector('#stage[data-demo]');
    await expect.poll(() => shadeOpacity(page), { timeout: 5000 }).toBe(0);
    await page.evaluate(() => {
      document.documentElement.dataset['whiteFrame'] = 'on';
    });
    // The gold of the logo needs the level 0.88 over white (ui/title-shade.ts).
    await expect.poll(() => shadeOpacity(page), { timeout: 5000 }).toBeGreaterThan(0.85);
  });
});
