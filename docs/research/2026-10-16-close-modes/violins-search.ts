/**
 * Renders the default demo at many drags and wheel steps from "Reset view" in one page, for the
 * search of the camera `violins` of `pnpm close-views play`. It serves `dist/` of the worktree
 * (run `pnpm build` first) from port 4460 up, plays the demo, and then, for each camera, clicks
 * "Reset view", drags from (720, 400), turns the wheel, waits 1.5 s, and writes
 * `<out>/<dx>_<dy>_<wheel>.png`. The song time goes on from frame to frame. `score.py` compares
 * the frames with `../2026-10-16-seat-rest/user-camera.webp`. Usage, from the root of the
 * worktree:
 *
 *     node docs/research/2026-10-16-close-modes/violins-search.ts <out> <dx,dy,wheel>...
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { chromium } from '@playwright/test';
import { preview } from 'vite';

import { FIRST_PLAY, SAMPLES_READY } from '../../../src/app/dev-hook.ts';
import { ROOT } from '../../../tools/ref-tree.ts';
import { openShot } from '../../../tools/screenshots.ts';

const [outArgument, ...cameras] = process.argv.slice(2);
if (!outArgument) {
  process.exit(1);
}
const out = resolve(outArgument);
await mkdir(out, { recursive: true });
const server = await preview({ root: ROOT, preview: { port: 4460, strictPort: false, open: false } });
const browser = await chromium.launch({
  args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});
try {
  const base = server.resolvedUrls?.local[0] ?? '';
  const page = await openShot(browser, base, { file: '', path: '/', width: 1440, height: 900, ready: SAMPLES_READY });
  await page.click(FIRST_PLAY);
  await page.waitForTimeout(1500);
  await page.click('.close-drawer');
  for (const camera of cameras) {
    const [dx = 0, dy = 0, wheel = 0] = camera.split(',').map(Number);
    await page.mouse.move(700, 300);
    await page.getByRole('button', { name: 'Reset view' }).click();
    await page.waitForTimeout(300);
    await page.mouse.move(720, 400);
    await page.mouse.down();
    await page.mouse.move(720 + dx, 400 + dy, { steps: 20 });
    await page.mouse.up();
    for (let i = 0; i < wheel; i++) {
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(30);
    }
    await page.mouse.move(720, 450);
    await page.waitForTimeout(1500);
    const file = join(out, `${dx}_${dy}_${wheel}.png`);
    await writeFile(file, await page.screenshot({ type: 'png' }));
    console.log(file);
  }
  await page.close();
} finally {
  await browser.close();
  await server.close();
}
