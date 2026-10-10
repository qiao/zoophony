import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Browser } from '@playwright/test';

import { VIEW_SHEETS } from '../src/gallery/sheets.ts';
import type { SheetId, ViewSheet } from '../src/gallery/sheets.ts';
import { openShot, startSite } from './screenshots.ts';

/** The match of the silhouette of one view with the matte of the sheet. */
export interface ViewMatch {
  /** The name of the view. */
  readonly view: 'front' | 'side' | 'back';
  /** The intersection over the union of the two silhouettes, from 0 to 1. */
  readonly iou: number;
  /** The pixels that only the sheet has, as a part of the pixels of the sheet. */
  readonly sheetOnly: number;
  /** The pixels that only the model has, as a part of the pixels of the sheet. */
  readonly modelOnly: number;
}

/** The value of a matte pixel that the check ignores: the chair, the violin, and the bow. */
export const IGNORED = 128;

/** The smallest value of a pixel of a silhouette or a matte that is part of the animal. */
const INSIDE = 200;

/** The views of a sheet, in the order of {@link ViewSheet.views}. */
const VIEW_NAMES = ['front', 'side', 'back'] as const;

/** The mattes of the sheets in `tools/sheet-mattes/`, made by `tools/spike/fox-gated/sheet_matte.py`. */
const MATTE_DIR = join(import.meta.dirname, 'sheet-mattes');

/**
 * Gives the first device column of each view of a sheet, and the end of the last view. A border
 * lies in the middle between the seats of two neighbor views.
 *
 * @param sheet The model sheet.
 * @returns Four columns: the start of the front, the side, and the back view, and the end.
 */
export function viewColumns(sheet: ViewSheet): [number, number, number, number] {
  const [front, side, back] = sheet.views.map((view) => view.x * sheet.sheetScale);
  const width = sheet.width * sheet.sheetScale;
  return [
    0,
    Math.round(((front ?? 0) + (side ?? 0)) / 2),
    Math.round(((side ?? 0) + (back ?? 0)) / 2),
    width,
  ];
}

/**
 * Compares the silhouette of a model with the matte of its sheet, view by view. A matte pixel of
 * {@link IGNORED} counts neither as animal nor as background.
 *
 * @param matte One value for each pixel of the sheet: 255 for the animal, {@link IGNORED}, or 0.
 * @param silhouette One value for each pixel of the page at the size of the sheet: white for the
 *   body, black for the background.
 * @param width The width of the sheet, in pixels.
 * @param columns The view columns of {@link viewColumns}.
 * @returns The match of each view.
 * @throws Error if the two images have different sizes.
 */
export function matchViews(
  matte: Uint8Array,
  silhouette: Uint8Array,
  width: number,
  columns: readonly [number, number, number, number],
): ViewMatch[] {
  if (matte.length !== silhouette.length) {
    throw new Error(`The matte has ${matte.length} pixels, the silhouette ${silhouette.length}.`);
  }

  const height = matte.length / width;
  return VIEW_NAMES.map((view, i) => {
    let both = 0;
    let sheetOnly = 0;
    let modelOnly = 0;
    for (let y = 0; y < height; y++) {
      for (let x = columns[i] ?? 0; x < (columns[i + 1] ?? 0); x++) {
        const m = matte[y * width + x] ?? 0;
        if (m === IGNORED) {
          continue;
        }
        const inSheet = m >= INSIDE;
        const inModel = (silhouette[y * width + x] ?? 0) >= INSIDE;
        if (inSheet && inModel) {
          both++;
        } else if (inSheet) {
          sheetOnly++;
        } else if (inModel) {
          modelOnly++;
        }
      }
    }
    const sheet = Math.max(1, both + sheetOnly);
    return {
      view,
      iou: both / Math.max(1, both + sheetOnly + modelOnly),
      sheetOnly: sheetOnly / sheet,
      modelOnly: modelOnly / sheet,
    };
  });
}

/**
 * Colors the difference of the two silhouettes: gray where both have the animal, red where only
 * the sheet has it, blue where only the model has it, and dark violet for the ignored pixels.
 *
 * @param matte The matte of the sheet, as for {@link matchViews}.
 * @param silhouette The silhouette of the model, as for {@link matchViews}.
 * @returns The RGBA pixels of the difference image.
 */
export function differenceImage(matte: Uint8Array, silhouette: Uint8Array): Uint8ClampedArray {
  const out = new Uint8ClampedArray(matte.length * 4);
  for (let i = 0; i < matte.length; i++) {
    const m = matte[i] ?? 0;
    const inSheet = m >= INSIDE;
    const inModel = (silhouette[i] ?? 0) >= INSIDE;
    let rgb: readonly [number, number, number] = [40, 40, 40];
    if (m === IGNORED) {
      rgb = [70, 30, 70];
    } else if (inSheet && inModel) {
      rgb = [150, 150, 150];
    } else if (inSheet) {
      rgb = [230, 60, 60];
    } else if (inModel) {
      rgb = [60, 110, 240];
    }
    out.set([...rgb, 255], i * 4);
  }
  return out;
}

/**
 * Reads the red channel of a PNG image with the canvas of the browser.
 *
 * @param browser The browser.
 * @param png The PNG image.
 * @returns The width and one value for each pixel.
 */
async function redChannel(
  browser: Browser,
  png: Buffer,
): Promise<{ width: number; values: Uint8Array }> {
  const page = await browser.newPage();
  try {
    const result = await page.evaluate(
      async (source) => {
        const image = new Image();
        image.src = source;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('The canvas has no 2D context.');
        }
        context.drawImage(image, 0, 0);
        const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let text = '';
        for (let i = 0; i < rgba.length; i += 4) {
          text += String.fromCharCode(rgba[i] ?? 0);
        }
        return { width: canvas.width, base64: btoa(text) };
      },
      `data:image/png;base64,${png.toString('base64')}`,
    );
    return { width: result.width, values: new Uint8Array(Buffer.from(result.base64, 'base64')) };
  } finally {
    await page.close();
  }
}

/**
 * Encodes RGBA pixels, or stacks PNG images from the top down, as one PNG image with the canvas
 * of the browser.
 *
 * @param browser The browser.
 * @param width The width of the image, in pixels.
 * @param parts The RGBA pixels at the width, or PNG images, from the top down.
 * @returns The PNG image.
 */
async function stackPng(
  browser: Browser,
  width: number,
  parts: readonly (Uint8ClampedArray | Buffer)[],
): Promise<Buffer> {
  const page = await browser.newPage();
  try {
    const sources = parts.map((part) =>
      Buffer.isBuffer(part)
        ? { png: `data:image/png;base64,${part.toString('base64')}`, rgba: '' }
        : { png: '', rgba: Buffer.from(part.buffer).toString('base64') },
    );
    const dataUrl = await page.evaluate(
      async ({ width: w, items }) => {
        const layers: (HTMLImageElement | ImageData)[] = [];
        for (const item of items) {
          if (item.png) {
            const image = new Image();
            image.src = item.png;
            await image.decode();
            layers.push(image);
          } else {
            const bytes = Uint8ClampedArray.from(atob(item.rgba), (c) => c.charCodeAt(0));
            layers.push(new ImageData(bytes, w));
          }
        }
        const heightOf = (layer: HTMLImageElement | ImageData): number =>
          layer instanceof ImageData
            ? layer.height
            : (layer.naturalHeight * w) / layer.naturalWidth;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = layers.reduce((sum, layer) => sum + heightOf(layer), 0);
        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('The canvas has no 2D context.');
        }
        let top = 0;
        for (const layer of layers) {
          if (layer instanceof ImageData) {
            context.putImageData(layer, 0, top);
          } else {
            context.drawImage(layer, 0, top, w, heightOf(layer));
          }
          top += heightOf(layer);
        }
        return canvas.toDataURL('image/png');
      },
      { width, items: sources },
    );
    return Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
  } finally {
    await page.close();
  }
}

/**
 * Captures a sheet page at the size of the sheet.
 *
 * @param browser The browser.
 * @param base The URL of the site.
 * @param id The sheet.
 * @param matte True for the silhouette of the body.
 * @returns The PNG image.
 */
async function capture(
  browser: Browser,
  base: string,
  id: SheetId,
  matte: boolean,
): Promise<Buffer> {
  const sheet = VIEW_SHEETS[id];
  const path = `/views.html?sheet=${id}${matte ? '&matte' : ''}`;
  const page = await openShot(
    browser,
    base + path.slice(1),
    { file: '', path, width: sheet.width, height: sheet.height, ready: '[data-ready="views"]' },
    sheet.sheetScale,
  );
  try {
    return await page.screenshot({ type: 'png' });
  } finally {
    await page.close();
  }
}

/**
 * Checks that a command line argument names a sheet.
 *
 * @param name The argument.
 * @returns True if a sheet has the name.
 */
function isSheetId(name: string | undefined): name is SheetId {
  return name !== undefined && Object.hasOwn(VIEW_SHEETS, name);
}

async function main(): Promise<void> {
  const [name, out] = process.argv.slice(2);
  if (!isSheetId(name) || !out) {
    console.error(
      `Usage: pnpm sheet-check <${Object.keys(VIEW_SHEETS).join(' | ')}> <output directory>`,
    );
    process.exit(1);
  }

  const id = name;
  const root = join(import.meta.dirname, '..');
  const sheet = VIEW_SHEETS[id];
  await mkdir(out, { recursive: true });
  const site = await startSite(root);
  try {
    const look = await capture(site.browser, site.base, id, false);
    const matte = await capture(site.browser, site.base, id, true);
    await writeFile(join(out, `${id}-render.png`), look);
    await writeFile(join(out, `${id}-matte.png`), matte);
    const reference = await readFile(join(root, 'docs', 'reference', sheet.file));
    const compare = await stackPng(site.browser, sheet.width * sheet.sheetScale, [reference, look]);
    await writeFile(join(out, `${id}-compare.png`), compare);
    console.log(join(out, `${id}-compare.png`));

    const matteFile = join(MATTE_DIR, `${id}.png`);
    const sheetMatte = await readFile(matteFile).catch(() => null);
    if (!sheetMatte) {
      console.log(`No matte ${matteFile}: no silhouette check.`);
      return;
    }
    const expected = await redChannel(site.browser, sheetMatte);
    const actual = await redChannel(site.browser, matte);
    const columns = viewColumns(sheet);
    for (const match of matchViews(expected.values, actual.values, expected.width, columns)) {
      console.log(
        `${match.view.padEnd(5)} IoU ${match.iou.toFixed(3)}  sheet only ${(100 * match.sheetOnly).toFixed(1)}%  model only ${(100 * match.modelOnly).toFixed(1)}%`,
      );
    }
    const diff = differenceImage(expected.values, actual.values);
    await writeFile(
      join(out, `${id}-diff.png`),
      await stackPng(site.browser, expected.width, [diff]),
    );
  } finally {
    await site.close();
  }
}

if (import.meta.main) {
  await main();
}
