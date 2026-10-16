/**
 * Renders the default demo after 6 s of play at a camera near the camera of the screenshot of the
 * user of 2026-10-16 (the violin section, low, from the front left), for several builds of the
 * site. The camera comes from "Reset view" (Free mode at the default view), then a fixed drag and
 * a fixed number of wheel steps of the orbit controls (design 2.5), so that each build gets the
 * same camera when its stage has the same size. Each build is a folder of `vite build`, or the
 * commit `main`, which the probe builds in a temporary folder. Usage, from the root of the
 * worktree:
 *
 *     node docs/research/2026-10-16-seat-rest/user-camera.ts <out> <dx> <dy> <wheel> <label>=<build dir>|main ...
 *
 * `dx` and `dy` are the drag in CSS pixels, and `wheel` is the number of wheel steps of -100 (a
 * zoom in).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import type { Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { preview } from 'vite';

import { FIRST_PLAY, SAMPLES_READY } from '../../../src/app/dev-hook.ts';
import { ROOT, withRefBuild } from '../../../tools/ref-tree.ts';
import { openShot } from '../../../tools/screenshots.ts';

/** The first port of the servers, away from the ports of the other tools. */
const PORT = 4420;

/**
 * Renders the default demo of one build at the camera.
 *
 * @param browser The browser.
 * @param dir The folder of the build.
 * @param port The port of the server.
 * @param camera The drag and the wheel steps.
 * @returns The PNG image.
 */
async function render(
  browser: Browser,
  dir: string,
  port: number,
  camera: { readonly dx: number; readonly dy: number; readonly wheel: number },
): Promise<Buffer> {
  const server = await preview({
    root: ROOT,
    build: { outDir: dir },
    preview: { port, strictPort: false, open: false },
  });
  try {
    const base = server.resolvedUrls?.local[0];
    if (!base) {
      throw new Error('The server has no URL.');
    }
    const page = await openShot(browser, base, {
      file: '',
      path: '/',
      width: 1440,
      height: 900,
      ready: SAMPLES_READY,
    });
    try {
      await page.click(FIRST_PLAY);
      await page.waitForTimeout(4000);
      await page.keyboard.press('Escape');
      await page.mouse.move(700, 300);
      await page.getByRole('button', { name: 'Reset view' }).click();
      await page.waitForTimeout(800);
      await page.mouse.move(720, 400);
      await page.mouse.down();
      await page.mouse.move(720 + camera.dx, 400 + camera.dy, { steps: 20 });
      await page.mouse.up();
      for (let i = 0; i < camera.wheel; i++) {
        await page.mouse.wheel(0, -100);
        await page.waitForTimeout(30);
      }
      await page.mouse.move(1430, 20);
      await page.waitForTimeout(2000);
      return await page.screenshot({ type: 'png' });
    } finally {
      await page.close();
    }
  } finally {
    await server.close();
  }
}

const [outArgument, dx, dy, wheel, ...builds] = process.argv.slice(2);
if (!outArgument || builds.length === 0) {
  console.error('Usage: node user-camera.ts <out> <dx> <dy> <wheel> <label>=<build dir>|main ...');
  process.exit(1);
}
const camera = { dx: Number(dx), dy: Number(dy), wheel: Number(wheel) };
const out = resolve(outArgument);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});
try {
  for (const [i, build] of builds.entries()) {
    const [label = '', dir = ''] = build.split('=');
    const file = join(out, `${label}-user-camera.png`);
    if (dir === 'main') {
      await withRefBuild('main', async (built) => {
        await writeFile(file, await render(browser, join(built, 'dist'), PORT + i * 10, camera));
      });
    } else {
      await writeFile(file, await render(browser, resolve(dir), PORT + i * 10, camera));
    }
    console.log(file);
  }
} finally {
  await browser.close();
}
