// Writes the share image of the site (design 7.4): a JPEG of 1200 × 630 of the default demo
// during play, with the logo and no other UI. The meta tags `og:image` of `index.html` name it.
// Run it with `pnpm share-image [--out <file>]`, which builds the site first.
//
// The tool serves `dist/` with `vite preview`, and opens the page in headless Chromium with the GPU
// of the Mac (`startSite()` of `tools/screenshots.ts`). A window of 1200 × 630 has the wide layout,
// so the drawer opens at start (design 2.8). The tool closes the drawer, so that the camera frames
// the whole stage, and clicks play. After `PLAY_SEC`, it hides the controls, the piece title, and
// the link to GitHub, and saves the JPEG at the highest quality that keeps the file at most
// `MAX_SHARE_BYTES`. The default file is `public/share.jpg`. No page element loads it, so the first
// download does not change.
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { DEFAULT_DEMO } from '../src/app/demos.ts';
import { FIRST_PLAY, SAMPLES_READY } from '../src/app/dev-hook.ts';
import { SHARE_IMAGE } from '../src/app/page-title.ts';
import { optionValue } from './ref-tree.ts';
import { openShot, startSite } from './screenshots.ts';

/** The root of the repository. */
const ROOT = resolve(import.meta.dirname, '..');

/** The time from the click on play to the image, in seconds. The bar hides after 3 s. */
const PLAY_SEC = 6;

/** The largest size of the share image, in bytes. */
const MAX_SHARE_BYTES = 200_000;

/** The style that hides each part of the UI but the logo. */
const HIDE_UI = `.title h2, .title p, .title .github, .first-screen, .bar, .drawer, .message,
  .tooltip { visibility: hidden !important; }
  .title h2::before, .title p::before { opacity: 0 !important; }`;

/**
 * Writes the share image: `pnpm share-image [--out <file>]` after `pnpm build`.
 */
async function main(): Promise<void> {
  const out = optionValue(process.argv.slice(2), '--out');
  if (out === undefined) {
    console.error('Usage: pnpm share-image [--out <file>]');
    process.exitCode = 1;
    return;
  }
  if (!existsSync(join(ROOT, 'dist', 'index.html'))) {
    console.error('No build in dist/. Run pnpm build first.');
    process.exitCode = 1;
    return;
  }

  const file = resolve(out ?? join(ROOT, 'public', SHARE_IMAGE.path));
  const site = await startSite(ROOT);
  try {
    const page = await openShot(site.browser, site.base, {
      file: '',
      path: '/',
      width: SHARE_IMAGE.width,
      height: SHARE_IMAGE.height,
      ready: SAMPLES_READY,
    });
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

    let image: Buffer = Buffer.alloc(0);
    for (let quality = 90; quality >= 40; quality -= 5) {
      image = await page.screenshot({ type: 'jpeg', quality });
      if (image.byteLength <= MAX_SHARE_BYTES) {
        break;
      }
    }
    await page.close();
    if (image.byteLength > MAX_SHARE_BYTES) {
      throw new Error(`The share image has ${image.byteLength} B, above ${MAX_SHARE_BYTES} B.`);
    }
    await writeFile(file, image);
    console.log(`${file}: ${DEFAULT_DEMO} after ${PLAY_SEC} s of play, ${image.byteLength} B`);
  } finally {
    await site.close();
  }
}

if (import.meta.main) {
  await main();
}
