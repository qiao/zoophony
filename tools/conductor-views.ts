import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { chromium } from '@playwright/test';
import type { Browser } from '@playwright/test';

import { chromiumArgs } from './chromium-args.ts';
import { openShot, startSite, toWebp } from './screenshots.ts';

/** One view of the conductor: the turn of the gallery camera around the bear. */
export interface ConductorView {
  readonly name: 'front' | 'side' | 'back';
  /** The turn of the gallery camera to the right side of the bear, in degrees. */
  readonly azimuth: number;
}

/**
 * The views of the close view: the front, the right side of the bear, and the back, which the
 * default view of the stage shows (design 2.5).
 */
export const CONDUCTOR_VIEWS: readonly ConductorView[] = [
  { name: 'front', azimuth: 0 },
  { name: 'side', azimuth: 90 },
  { name: 'back', azimuth: 180 },
];

/**
 * One moment of the close view: a time of the gallery time slider in the test notes of the
 * gallery (4/4 at 120 BPM), or the rest pose of design 5.2.
 */
export interface ConductorMoment {
  /** The name of the moment in the file names and the labels. */
  readonly name: string;
  /** The time of the slider, in seconds. The rest pose ignores it. */
  readonly time: number;
  /** True for the rest pose: the arms hang. */
  readonly rest: boolean;
}

/** The moments: the four beats of the first bar, a moment between two beats, and the rest pose. */
export const CONDUCTOR_MOMENTS: readonly ConductorMoment[] = [
  { name: 'beat-1', time: 0, rest: false },
  { name: 'between', time: 0.25, rest: false },
  { name: 'beat-2', time: 0.5, rest: false },
  { name: 'beat-3', time: 1, rest: false },
  { name: 'beat-4', time: 1.5, rest: false },
  { name: 'rest', time: 0, rest: true },
];

/** The size of one cell of the close view, in CSS pixels. */
export const CELL = { width: 360, height: 450 } as const;

/** The close view of the gallery on the bear: the zoom, the height of the target, the elevation. */
const CLOSE = { zoom: 1.4, target: 0.9, elevation: 8 } as const;

/**
 * Gives the path of the gallery page of a view and a moment: the bear alone, close, at the camera
 * of the view.
 *
 * @param view The view.
 * @param moment The moment.
 * @returns The path and the query, from the root of the site.
 */
export function conductorPath(view: ConductorView, moment: ConductorMoment): string {
  const query = new URLSearchParams({
    page: 'species',
    only: 'bear',
    zoom: String(CLOSE.zoom),
    target: String(CLOSE.target),
    azimuth: String(view.azimuth),
    elevation: String(CLOSE.elevation),
  });
  if (moment.rest) {
    query.set('rest', '');
  }
  return `/gallery.html?${query.toString()}`;
}

/**
 * Renders one cell: the gallery page of a view at the time of a moment, with no panel and no
 * labels.
 *
 * @param browser The browser.
 * @param base The URL of the site.
 * @param view The view.
 * @param moment The moment.
 * @returns The PNG image.
 */
async function render(
  browser: Browser,
  base: string,
  view: ConductorView,
  moment: ConductorMoment,
): Promise<Buffer> {
  const path = conductorPath(view, moment);
  const page = await openShot(browser, new URL(path.slice(1), base).href, {
    file: '',
    path,
    ...CELL,
    ready: 'canvas[data-ready="species"]',
  });
  try {
    await page.addStyleTag({ content: '#controls, #labels { display: none; }' });
    await page.evaluate((time) => {
      const slider = document.querySelector('#time');
      if (slider instanceof HTMLInputElement) {
        slider.value = String(time);
        slider.dispatchEvent(new Event('input'));
      }
    }, moment.time);
    // The idle motion needs a few frames at the new time.
    await page.waitForTimeout(300);
    return await page.screenshot({ type: 'png' });
  } finally {
    await page.close();
  }
}

/**
 * Puts the cells in a grid: one row for each moment, one column for each view, with the name of
 * the moment and of the view in each cell.
 *
 * @param browser The browser.
 * @param cells The image of each cell, row by row.
 * @param labels The label of each cell.
 * @param columns The number of columns.
 * @returns The PNG image.
 */
async function grid(
  browser: Browser,
  cells: readonly Buffer[],
  labels: readonly string[],
  columns: number,
): Promise<Buffer> {
  const page = await browser.newPage();
  try {
    const dataUrl = await page.evaluate(
      async ({ images, names, size, across }) => {
        const loaded = await Promise.all(
          images.map(async (source) => {
            const image = new Image();
            image.src = source;
            await image.decode();
            return image;
          }),
        );
        const canvas = document.createElement('canvas');
        canvas.width = size.width * across;
        canvas.height = size.height * Math.ceil(images.length / across);
        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('The canvas has no 2D context.');
        }
        context.font = '16px sans-serif';
        for (const [i, image] of loaded.entries()) {
          const x = (i % across) * size.width;
          const y = Math.floor(i / across) * size.height;
          context.drawImage(image, x, y, size.width, size.height);
          context.fillStyle = '#ffffff';
          context.fillText(names[i] ?? '', x + 10, y + 24);
        }
        return canvas.toDataURL('image/png');
      },
      {
        images: cells.map((cell) => `data:image/png;base64,${cell.toString('base64')}`),
        names: [...labels],
        size: CELL,
        across: columns,
      },
    );
    return Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
  } finally {
    await page.close();
  }
}

/**
 * Renders the close view of the conductor: `node tools/conductor-views.ts <dir> [--base <url>]`
 * (design 7.1). It writes the bear at each moment from each view into `<dir>`, and the grid of
 * all cells as `conductor-views.png` and `conductor-views.webp`. With `--base`, it uses a
 * running site, such as the dev server, in place of the built site.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const out = args[0];
  const baseAt = args.indexOf('--base');
  const given = baseAt >= 0 ? args[baseAt + 1] : undefined;
  if (!out || out.startsWith('--')) {
    console.error('Usage: pnpm conductor-views <output directory> [--base <url>]');
    process.exit(1);
  }

  await mkdir(out, { recursive: true });
  const site = given
    ? {
        base: given,
        browser: await chromium.launch({ args: chromiumArgs(process.platform) }),
        close: async (): Promise<void> => undefined,
      }
    : await startSite(join(import.meta.dirname, '..'));
  try {
    const cells: Buffer[] = [];
    const labels: string[] = [];
    for (const moment of CONDUCTOR_MOMENTS) {
      for (const view of CONDUCTOR_VIEWS) {
        const cell = await render(site.browser, site.base, view, moment);
        await writeFile(join(out, `conductor-${moment.name}-${view.name}.png`), cell);
        cells.push(cell);
        labels.push(`${moment.name}, ${view.name}`);
      }
    }
    const sheet = await grid(site.browser, cells, labels, CONDUCTOR_VIEWS.length);
    await writeFile(join(out, 'conductor-views.png'), sheet);
    await writeFile(join(out, 'conductor-views.webp'), await toWebp(site.browser, sheet));
    console.log(join(out, 'conductor-views.png'));
  } finally {
    if (given) {
      await site.browser.close();
    }
    await site.close();
  }
}

if (import.meta.main) {
  await main();
}
