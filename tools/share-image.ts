// Writes the share image of the site (design 7.4): a JPEG of 1200 × 630 of the default demo
// during play, from a low camera behind the conductor, with the light effects and the title of
// `tools/share-card.ts`. The meta tags `og:image` of `index.html` name it. The target image is
// `docs/reference/share-card.webp`. Run it with `pnpm share-image [--out <file>]`, which writes
// the presets and the demos of `public/` first.
//
// The tool builds the site with the camera plugin of `pnpm close-views` (`aimPlugin()`) into a
// temporary folder, and serves it (`startVariantSite()`). The page gets `SHARE_CAMERA` in the query
// `aim`, so each frame takes that camera. It opens in headless Chromium with the GPU of the Mac,
// at `RENDER_SCALE` device pixels for each CSS pixel. A window of 1200 × 630 has the wide layout,
// so the drawer opens at start (design 2.8). The tool closes the drawer, so that the frame of the
// camera has the full width, and clicks play. After `PLAY_SEC`, it hides each element of the page
// but the canvas, and takes a PNG of the stage. `composeCard()` draws the card over it at the same
// scale. The tool then scales the card down to 1200 × 630 in a canvas, and saves the JPEG at the
// highest quality that keeps the file at most `MAX_SHARE_BYTES`. The default file is
// `public/share.jpg`. No page element loads it, so the first download does not change.
import { writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import type { Browser } from '@playwright/test';

import { DEFAULT_DEMO } from '../src/app/demos.ts';
import { FIRST_PLAY, SAMPLES_READY } from '../src/app/dev-hook.ts';
import { SHARE_IMAGE } from '../src/app/page-title.ts';
import type { CameraPose } from '../src/shots/types.ts';
import { aimPlugin, startVariantSite } from './close-views.ts';
import { optionValue } from './ref-tree.ts';
import { openShot } from './screenshots.ts';
import type { Site } from './screenshots.ts';
import { composeCard } from './share-card.ts';
import type { CardSize } from './share-card.ts';

/** The root of the repository. */
const ROOT = resolve(import.meta.dirname, '..');

/** The time from the click on play to the image, in seconds. The bar hides after 3 s. */
const PLAY_SEC = 6;

/** The largest size of the share image, in bytes. */
const MAX_SHARE_BYTES = 200_000;

/**
 * The device pixels for each CSS pixel of the stage and the card. The tool scales the card down
 * to the size of {@link SHARE_IMAGE}, so each pixel of the file is the mean of 2 × 2 pixels, and
 * the edges of the text and the models are smooth.
 */
const RENDER_SCALE = 2;

/**
 * The camera of the share image, in the axes of the stage, in meters (design 7.4): low and behind
 * the conductor, a little above its head, and a little to the left of the middle line. The left
 * place balances the layout, whose right side is wider, so that the conductor stands in the
 * middle and the players fill the width. The hall wall has a radius of about 16.5 m, so the
 * camera cannot move farther back. The scene sets the beam and the light of a free camera from
 * its place, so `beam`, `light`, and `spot` do nothing.
 */
const SHARE_CAMERA: CameraPose = {
  position: [-3, 3.6, 16.5],
  target: [1, 1.5, 0.5],
  fov: 21,
  beam: 1,
  close: false,
  light: 0,
  spot: 0,
};

/** The style that hides each element of the page but the canvas of the stage. */
const HIDE_UI = 'body > :not(#stage), body > :not(#stage) * { visibility: hidden !important; }';

/**
 * Renders the stage of the default demo during play from {@link SHARE_CAMERA}, with no UI.
 *
 * @param site The site of the build with the camera plugin.
 * @param size The size of the card.
 * @returns The PNG image, at the scale of the card.
 */
async function renderStage(site: Site, size: CardSize): Promise<Buffer> {
  const aim = encodeURIComponent(JSON.stringify(SHARE_CAMERA));
  const page = await openShot(
    site.browser,
    `${site.base}?aim=${aim}`,
    { file: '', path: '/', width: size.width, height: size.height, ready: SAMPLES_READY },
    size.scale,
  );
  try {
    if (await page.locator('.drawer').isVisible()) {
      await page.hover('.bar');
      // The bar shows in the next frame.
      await page.waitForTimeout(100);
      await page.click('.bar button[aria-expanded]');
    }
    await page.click(FIRST_PLAY);
    await page.mouse.move(0, 0);
    await page.waitForTimeout(PLAY_SEC * 1000);
    await page.addStyleTag({ content: HIDE_UI });
    await page.evaluate(
      () =>
        new Promise<void>((done) => {
          requestAnimationFrame(() => requestAnimationFrame(() => done()));
        }),
    );
    return await page.screenshot({ type: 'png' });
  } finally {
    await page.close();
  }
}

/**
 * Scales a card down to the size of {@link SHARE_IMAGE} in a canvas, and encodes it as JPEG at
 * the highest quality that keeps the file at most {@link MAX_SHARE_BYTES}.
 *
 * @param browser The browser.
 * @param card The PNG image of the card.
 * @returns The JPEG file.
 * @throws Error when the file at the lowest quality is still too large.
 */
async function encodeShare(browser: Browser, card: Buffer): Promise<Buffer> {
  const page = await browser.newPage();
  try {
    const dataUrl = await page.evaluate(
      async ({ source, width, height, limit }) => {
        const image = new Image();
        image.src = source;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('No 2D context.');
        }
        context.imageSmoothingQuality = 'high';
        context.drawImage(image, 0, 0, width, height);
        let encoded = '';
        for (let quality = 0.95; quality >= 0.4; quality -= 0.05) {
          encoded = canvas.toDataURL('image/jpeg', quality);
          // A base64 character holds 6 bits.
          if (((encoded.length - encoded.indexOf(',') - 1) * 3) / 4 <= limit) {
            break;
          }
        }
        return encoded;
      },
      {
        source: `data:image/png;base64,${card.toString('base64')}`,
        width: SHARE_IMAGE.width,
        height: SHARE_IMAGE.height,
        limit: MAX_SHARE_BYTES,
      },
    );
    const image = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
    if (image.byteLength > MAX_SHARE_BYTES) {
      throw new Error(`The share image has ${image.byteLength} B, above ${MAX_SHARE_BYTES} B.`);
    }
    return image;
  } finally {
    await page.close();
  }
}

/**
 * Writes the share image: `pnpm share-image [--out <file>]`.
 */
async function main(): Promise<void> {
  const out = optionValue(process.argv.slice(2), '--out');
  if (out === undefined) {
    console.error('Usage: pnpm share-image [--out <file>]');
    process.exitCode = 1;
    return;
  }

  const file = resolve(out ?? join(ROOT, 'public', SHARE_IMAGE.path));
  const size: CardSize = {
    width: SHARE_IMAGE.width,
    height: SHARE_IMAGE.height,
    scale: RENDER_SCALE,
  };
  const site = await startVariantSite([aimPlugin(ROOT)]);
  try {
    const stage = await renderStage(site, size);
    const card = await composeCard(site.browser, ROOT, stage, size);
    const image = await encodeShare(site.browser, card);
    await writeFile(file, image);
    console.log(`${file}: ${DEFAULT_DEMO} after ${PLAY_SEC} s of play, ${image.byteLength} B`);
  } finally {
    await site.close();
  }
}

if (import.meta.main) {
  await main();
}
