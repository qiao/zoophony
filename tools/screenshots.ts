import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { chromium } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { preview } from 'vite';

import { DEMO_IDS } from '../src/app/demos.ts';

/** One screenshot of the review of a step (design 9.8). */
export interface Shot {
  /** The name of the WebP file. */
  readonly file: string;
  /** The path and the query of the page, from the root of the site. */
  readonly path: string;
  readonly width: number;
  readonly height: number;
  /** The CSS selector that the page matches when its first frame shows the full scene. */
  readonly ready: string;
}

/** The largest size of one WebP file, in bytes. */
export const MAX_WEBP_BYTES = 300_000;

/** The size of the contact sheet of the species: the viewport of the gallery and the cell size. */
const SHEET = { width: 2880, height: 1800, cellWidth: 300, cellHeight: 340, columns: 6 } as const;

/**
 * Lists the screenshots of a review (design 9.8): the default view of each demo at 1440 × 900,
 * demo 1 at 390 × 844, and the two gallery pages at 1440 × 900.
 *
 * @returns The screenshots, in the order of the demo list.
 */
export function reviewShots(): Shot[] {
  const demo = (id: string, width: number, height: number): Shot => ({
    file: `${id}-${width}x${height}.webp`,
    path: `/?demo=${id}`,
    width,
    height,
    ready: `canvas[data-demo="${id}"]`,
  });
  const gallery = (page: string): Shot => ({
    file: `gallery-${page}-1440x900.webp`,
    path: `/gallery.html?page=${page}`,
    width: 1440,
    height: 900,
    ready: `canvas[data-ready="${page}"]`,
  });
  return [
    ...DEMO_IDS.map((id) => demo(id, 1440, 900)),
    demo(DEMO_IDS[0], 390, 844),
    gallery('species'),
    gallery('instruments'),
  ];
}

/**
 * Opens a page at a size and waits until it shows its scene, plus two more frames.
 *
 * @param browser The browser.
 * @param url The URL of the page.
 * @param shot The size and the ready selector.
 * @returns The page.
 */
async function openShot(browser: Browser, url: string, shot: Shot): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: shot.width, height: shot.height } });
  page.on('pageerror', (error) => {
    console.error(`${shot.path}: ${error.message}`);
  });
  await page.goto(url);
  await page.waitForSelector(shot.ready, { timeout: 60_000 });
  await page.evaluate(
    () =>
      new Promise<void>((done) => {
        requestAnimationFrame(() => requestAnimationFrame(() => done()));
      }),
  );
  return page;
}

/**
 * Encodes a PNG image as WebP in the browser, at the highest quality that keeps the file at most
 * {@link MAX_WEBP_BYTES}.
 *
 * @param browser The browser.
 * @param png The PNG image.
 * @returns The WebP file.
 */
async function toWebp(browser: Browser, png: Buffer): Promise<Buffer> {
  const page = await browser.newPage();
  const dataUrl = await page.evaluate(
    async ({ source, limit }) => {
      const image = new Image();
      image.src = source;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext('2d')?.drawImage(image, 0, 0);
      let encoded = '';
      for (let quality = 0.92; quality > 0.3; quality -= 0.08) {
        encoded = canvas.toDataURL('image/webp', quality);
        // A base64 character holds 6 bits.
        if (((encoded.length - encoded.indexOf(',') - 1) * 3) / 4 <= limit) {
          break;
        }
      }
      return encoded;
    },
    { source: `data:image/png;base64,${png.toString('base64')}`, limit: MAX_WEBP_BYTES },
  );
  await page.close();
  return Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
}

/**
 * Takes a contact sheet of the species: the gallery species page at 2880 × 1800, with one cell for
 * each model above its label.
 *
 * @param browser The browser.
 * @param base The URL of the site.
 * @returns The PNG image of the sheet.
 */
async function speciesSheet(browser: Browser, base: string): Promise<Buffer> {
  const shot: Shot = {
    file: 'species-sheet.webp',
    path: '/gallery.html?page=species',
    width: SHEET.width,
    height: SHEET.height,
    ready: 'canvas[data-ready="species"]',
  };
  const page = await openShot(browser, base + shot.path.slice(1), shot);
  // The panel covers the top left corner. The sheet does not need it.
  await page.addStyleTag({ content: '#controls { display: none; }' });
  const cells = await page.$$eval('#labels > span', (labels) =>
    labels.map((label) => {
      const box = label.getBoundingClientRect();
      return { x: box.x + box.width / 2, bottom: box.bottom };
    }),
  );
  const png = await page.screenshot({ type: 'png' });
  await page.close();
  const sheet = await browser.newPage();
  const result = await sheet.evaluate(
    async ({ source, places, size }) => {
      const image = new Image();
      image.src = source;
      await image.decode();
      const { cellWidth, cellHeight } = size;
      const rows = Math.ceil(places.length / size.columns);
      const canvas = document.createElement('canvas');
      canvas.width = cellWidth * size.columns;
      canvas.height = cellHeight * rows;
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('No 2D context.');
      }
      context.fillStyle = '#201c19';
      context.fillRect(0, 0, canvas.width, canvas.height);
      places.forEach((place, i) => {
        const left = place.x - cellWidth / 2;
        const top = place.bottom + 8 - cellHeight;
        const x = (i % size.columns) * cellWidth;
        const y = Math.floor(i / size.columns) * cellHeight;
        context.drawImage(image, left, top, cellWidth, cellHeight, x, y, cellWidth, cellHeight);
      });
      return canvas.toDataURL('image/png');
    },
    {
      source: `data:image/png;base64,${png.toString('base64')}`,
      places: cells,
      size: { cellWidth: SHEET.cellWidth, cellHeight: SHEET.cellHeight, columns: SHEET.columns },
    },
  );
  await sheet.close();
  return Buffer.from(result.slice(result.indexOf(',') + 1), 'base64');
}

async function main(): Promise<void> {
  const root = join(import.meta.dirname, '..');
  const [outArgument, ...flags] = process.argv.slice(2);
  if (!outArgument) {
    console.error('Usage: pnpm screenshots <output directory> [--sheet]');
    process.exitCode = 1;
    return;
  }
  if (!existsSync(join(root, 'dist', 'index.html'))) {
    console.error('No build in dist/. Run pnpm build first.');
    process.exitCode = 1;
    return;
  }
  const out = resolve(outArgument);
  await mkdir(out, { recursive: true });
  const server = await preview({ root, preview: { port: 4179, strictPort: false, open: false } });
  const base = server.resolvedUrls?.local[0] ?? 'http://localhost:4179/';
  // ANGLE on Metal gives the GPU of the Mac to headless Chromium.
  const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
  try {
    for (const shot of reviewShots()) {
      const page = await openShot(browser, base + shot.path.slice(1), shot);
      const png = await page.screenshot({ type: 'png' });
      await page.close();
      const webp = await toWebp(browser, png);
      await writeFile(join(out, shot.file), webp);
      console.log(`${shot.file}: ${webp.byteLength} B`);
    }
    if (flags.includes('--sheet')) {
      const webp = await toWebp(browser, await speciesSheet(browser, base));
      await writeFile(join(out, 'species-sheet.webp'), webp);
      console.log(`species-sheet.webp: ${webp.byteLength} B`);
    }
  } finally {
    await browser.close();
    await server.close();
  }
}

if (import.meta.main) {
  await main();
}
