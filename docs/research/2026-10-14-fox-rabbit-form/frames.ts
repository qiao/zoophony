/**
 * Writes the images of the form round for the working tree and, with `--base <ref>`, for a
 * commit: a lineup of four species at one camera and one scale, and the Beethoven 9 demo after
 * 6 s of play at 1440 x 900, as `pnpm screenshots --play` takes it. The lineup shows the rabbit,
 * the red fox, the cat, and the bear conductor, each standing in the rest pose on the species page
 * of the gallery. The gallery shows each model at its size in meters, so the heights compare
 * directly. Run `pnpm build` first. The probe serves `dist/` of the working tree and writes
 * `<dir>/lineup-branch.png` and `<dir>/beethoven-9-play-branch.png`. With `--base <ref>`, it also
 * builds the commit in a temporary folder and writes the same images with the short hash in
 * place of `branch`. Usage:
 *
 *     pnpm build && node docs/research/2026-10-14-fox-rabbit-form/frames.ts <dir> [--base main]
 *
 * A copy of `docs/research/2026-10-14-animal-size/frames.ts` with a higher camera target, so that
 * the taller red fox fits the lineup.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Browser } from '@playwright/test';

import { FIRST_PLAY, SAMPLES_READY } from '../../../src/app/dev-hook.ts';
import { ROOT, optionValue, shortHash, withRefBuild } from '../../../tools/ref-tree.ts';
import { openShot, startSite } from '../../../tools/screenshots.ts';

/** The first port of the servers, away from the ports of the other tools. */
const PORT = 4340;

/** The query of the lineup: four species, standing, in the rest pose, with a low camera. */
const QUERY = 'page=species&only=rabbit,fox-red,cat,bear&stand&rest&elevation=4&target=1.1';

/**
 * Renders the Beethoven 9 demo of a site after 6 s of play.
 *
 * @param browser The browser.
 * @param base The URL of the site.
 * @returns The PNG image.
 */
async function play(browser: Browser, base: string): Promise<Buffer> {
  const page = await openShot(browser, new URL('#demo=beethoven-9', base).href, {
    file: '',
    path: '/#demo=beethoven-9',
    width: 1440,
    height: 900,
    ready: SAMPLES_READY,
  });
  try {
    await page.click(FIRST_PLAY);
    await page.waitForTimeout(6000);
    return await page.screenshot({ type: 'png' });
  } finally {
    await page.close();
  }
}

/**
 * Writes the images of a site.
 *
 * @param browser The browser.
 * @param base The URL of the site.
 * @param out The folder.
 * @param label The label of the file names.
 */
async function writeImages(
  browser: Browser,
  base: string,
  out: string,
  label: string,
): Promise<void> {
  for (const [name, image] of [
    ['lineup', await lineup(browser, base)],
    ['beethoven-9-play', await play(browser, base)],
  ] as const) {
    const path = join(out, `${name}-${label}.png`);
    await writeFile(path, image);
    console.log(path);
  }
}

/**
 * Renders the lineup of a site.
 *
 * @param browser The browser.
 * @param base The URL of the site.
 * @returns The PNG image.
 */
async function lineup(browser: Browser, base: string): Promise<Buffer> {
  const page = await openShot(browser, new URL(`gallery.html?${QUERY}`, base).href, {
    file: '',
    path: '/gallery.html',
    width: 1440,
    height: 720,
    ready: 'canvas[data-ready="species"]',
  });
  try {
    await page.addStyleTag({ content: '#controls { display: none; }' });
    await page.waitForTimeout(300);
    return await page.screenshot({ type: 'png' });
  } finally {
    await page.close();
  }
}

const args = process.argv.slice(2);
const out = args[0];
if (!out) {
  console.error('Usage: node frames.ts <dir> [--base <ref>]');
  process.exit(1);
}
const ref = optionValue(args, '--base');
await mkdir(out, { recursive: true });

const site = await startSite(ROOT, PORT);
try {
  await writeImages(site.browser, site.base, out, 'branch');
} finally {
  await site.close();
}

if (ref) {
  const hash = shortHash(ref);
  await withRefBuild(ref, async (dir) => {
    const other = await startSite(dir, PORT + 10);
    try {
      await writeImages(other.browser, other.base, out, hash);
    } finally {
      await other.close();
    }
  });
}
