/**
 * Renders the seated rabbit and red fox from the side and from 35° to the front, and a lineup of
 * six species on their chairs, from the gallery of several builds of the site. Each build is a
 * folder of `vite build` (`pnpm exec vite build --outDir <dir>`), or the commit `main`, which the
 * probe builds in a temporary folder (`withRefBuild()` of `tools/ref-tree.ts`). The images go into
 * `<out>/<label>-<name>.png`. Usage, from the root of the worktree:
 *
 *     node docs/research/2026-10-16-seat-rest/views.ts <out> <label>=<build dir>|main ...
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import type { Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { preview } from 'vite';

import { ROOT, withRefBuild } from '../../../tools/ref-tree.ts';
import { openShot } from '../../../tools/screenshots.ts';

/** The first port of the servers, away from the ports of the other tools. */
const PORT = 4370;

/** The close views: the species, the azimuth from the front, and the elevation, in degrees. */
const CLOSE: readonly [name: string, species: string, azimuth: number, elevation: number][] = [
  ['fox-side', 'fox-red', 90, 3],
  ['fox-front35', 'fox-red', 35, 10],
  ['rabbit-side', 'rabbit', 90, 3],
  ['rabbit-front35', 'rabbit', 35, 10],
];

/** The query of the seated lineup: six species on their chairs in the rest pose, from behind on the right (150°), so that the chair backs show. */
const LINEUP =
  'page=species&only=rabbit,fox-red,cat,dog,mouse,panda&rest&elevation=12&target=0.5&azimuth=150';

/**
 * Renders one gallery page.
 *
 * @param browser The browser.
 * @param base The URL of the site.
 * @param query The query of the gallery page.
 * @param width The width of the page, in CSS pixels.
 * @param height The height of the page, in CSS pixels.
 * @returns The PNG image.
 */
async function shot(
  browser: Browser,
  base: string,
  query: string,
  width: number,
  height: number,
): Promise<Buffer> {
  const page = await openShot(browser, new URL(`gallery.html?${query}`, base).href, {
    file: '',
    path: '/gallery.html',
    width,
    height,
    ready: 'canvas[data-ready="species"]',
  });
  try {
    await page.addStyleTag({ content: '#controls, #labels { display: none; }' });
    await page.waitForTimeout(400);
    return await page.screenshot({ type: 'png' });
  } finally {
    await page.close();
  }
}

/**
 * Renders the images of one build.
 *
 * @param browser The browser.
 * @param dir The folder of the build.
 * @param port The port of the server.
 * @param out The folder of the images.
 * @param label The label of the build.
 */
async function renderBuild(
  browser: Browser,
  dir: string,
  port: number,
  out: string,
  label: string,
): Promise<void> {
  const server = await preview({
    root: ROOT,
    build: { outDir: dir },
    preview: { port, strictPort: false, open: false },
  });
  try {
    const base = server.resolvedUrls?.local[0];
    if (!base) {
      throw new Error(`The server of ${label} has no URL.`);
    }
    for (const [name, species, azimuth, elevation] of CLOSE) {
      const query = `page=species&only=${species}&body&zoom=1&azimuth=${azimuth}&elevation=${elevation}`;
      const path = join(out, `${label}-${name}.png`);
      await writeFile(path, await shot(browser, base, query, 480, 600));
      console.log(path);
    }
    const path = join(out, `${label}-lineup.png`);
    await writeFile(path, await shot(browser, base, LINEUP, 1440, 600));
    console.log(path);
  } finally {
    await server.close();
  }
}

const [outArgument, ...builds] = process.argv.slice(2);
if (!outArgument || builds.length === 0) {
  console.error('Usage: node views.ts <out> <label>=<build dir>|main ...');
  process.exit(1);
}
const out = resolve(outArgument);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
try {
  for (const [i, build] of builds.entries()) {
    const [label = '', dir = ''] = build.split('=');
    if (dir === 'main') {
      await withRefBuild('main', async (built) => {
        await renderBuild(browser, join(built, 'dist'), PORT + i * 10, out, label);
      });
    } else {
      await renderBuild(browser, resolve(dir), PORT + i * 10, out, label);
    }
  }
} finally {
  await browser.close();
}
