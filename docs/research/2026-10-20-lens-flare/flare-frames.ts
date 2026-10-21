/**
 * Renders the frames of the lens flare lineups (`docs/research/2026-10-20-lens-flare.md`).
 *
 * Usage: `node docs/research/2026-10-20-lens-flare/flare-frames.ts <variants.json> --out <dir> [--views <view,...>]`
 *
 * `<variants.json>` maps each variant name to a look override (`?look=` of the dev server), or to
 * the text `"main"` for a build of the branch `main`. One run takes `"main"` or look overrides,
 * not both. The probe pauses the transport and seeks to
 * the exact song time of each frame, with the step of the seek bar set to `any`. The poses and
 * the cameras are stateless (AGENTS.md), so a paused frame at a song time is the frame of play at
 * that time. The bar is hidden with a style. Each frame goes to `<dir>/<variant>/<view>.png`.
 */
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { join, resolve } from 'node:path';

import { chromium } from '@playwright/test';
import type { Browser } from '@playwright/test';

import { FIRST_PLAY, SAMPLES_READY } from '../../../src/app/dev-hook.ts';
import { chromiumArgs } from '../../../tools/chromium-args.ts';
import { ROOT, withRefBuild } from '../../../tools/ref-tree.ts';
import { startSite } from '../../../tools/screenshots.ts';

/** One frame of a lineup. */
interface View {
  readonly name: string;
  readonly camera: 'cinematic' | 'default';
  readonly time: number;
}

const DEMO = 'beethoven-8-4';

const STEP = 1 / 24;

const VIEWS: readonly View[] = [
  { name: 'shot-115', camera: 'cinematic', time: 115 },
  { name: 'shot-27', camera: 'cinematic', time: 27 },
  { name: 'default-30', camera: 'default', time: 30 },
  { name: 'brass-0', camera: 'cinematic', time: 86 },
  { name: 'brass-1', camera: 'cinematic', time: 86 + STEP },
  { name: 'brass-2', camera: 'cinematic', time: 86 + 2 * STEP },
];

async function freePort(): Promise<number> {
  return new Promise((done, fail) => {
    const server = createServer();
    server.once('error', fail);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => done(port));
    });
  });
}

async function renderViews(
  browser: Browser,
  url: string,
  views: readonly View[],
  out: string,
): Promise<void> {
  await mkdir(out, { recursive: true });
  for (const camera of ['cinematic', 'default'] as const) {
    const own = views.filter((view) => view.camera === camera);
    if (own.length === 0) {
      continue;
    }
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('pageerror', (error) => console.error(`${url}: ${error.message}`));
    await page.goto(url);
    await page.waitForSelector(SAMPLES_READY, { timeout: 90_000 });
    await page.click(FIRST_PLAY);
    await page.waitForTimeout(1500);
    await page.click('.close-drawer');
    if (camera === 'default') {
      await page.getByRole('button', { name: 'Reset view' }).click();
    }
    await page.getByRole('button', { name: 'Pause' }).click();
    await page.addStyleTag({ content: '.bar { visibility: hidden !important; }' });
    await page.mouse.move(720, 450);
    for (const view of own) {
      await page.$eval(
        '.seek',
        (element, value) => {
          if (element instanceof HTMLInputElement) {
            element.step = 'any';
            element.value = String(value);
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
          }
        },
        view.time,
      );
      await page.waitForTimeout(1500);
      const song = await page.evaluate(() => window.zoophony?.songTime ?? null);
      const file = join(out, `${view.name}.png`);
      await page.screenshot({ path: file, type: 'png' });
      console.log(`${file}: song time ${song === null ? 'no hook' : song.toFixed(4)}`);
    }
    await page.close();
  }
}

async function main(): Promise<void> {
  const [file, ...rest] = process.argv.slice(2);
  const outIndex = rest.indexOf('--out');
  if (!file || outIndex < 0 || !rest[outIndex + 1]) {
    throw new Error('Usage: node docs/research/2026-10-20-lens-flare/flare-frames.ts <variants.json> --out <dir>');
  }
  const out = resolve(rest[outIndex + 1] ?? '');
  const viewIndex = rest.indexOf('--views');
  const names = viewIndex >= 0 ? (rest[viewIndex + 1] ?? '').split(',') : null;
  const views = names ? VIEWS.filter((view) => names.includes(view.name)) : VIEWS;
  const variants = JSON.parse(await readFile(file, 'utf8')) as Record<string, unknown>;
  const kinds = new Set(Object.values(variants).map((look) => look === 'main'));
  if (kinds.size > 1) {
    // In one run with the build of main, the pages of the dev server lost the look override.
    throw new Error('Render "main" and the look variants in separate runs.');
  }

  for (const [name, look] of Object.entries(variants)) {
    if (look !== 'main') {
      continue;
    }
    await withRefBuild('main', async (dir) => {
      const site = await startSite(dir, await freePort());
      try {
        await renderViews(site.browser, `${site.base}#demo=${DEMO}`, views, join(out, name));
      } finally {
        await site.close();
      }
    });
  }

  const looks = Object.entries(variants).filter(([, look]) => look !== 'main');
  if (looks.length === 0) {
    return;
  }
  for (const tool of ['split-soundfont.ts', 'patch-demos.ts', 'write-perf-60.ts']) {
    execFileSync(process.execPath, [join(ROOT, 'tools', tool)], { cwd: ROOT, stdio: 'ignore' });
  }
  const port = await freePort();
  const vite = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
  const server = spawn(
    process.execPath,
    [vite, '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    { cwd: ROOT, stdio: 'ignore' },
  );
  const browser = await chromium.launch({ args: chromiumArgs(process.platform) });
  try {
    const base = `http://127.0.0.1:${port}/`;
    for (let i = 0; i < 60; i++) {
      const ok = await fetch(base).then(
        (response) => response.ok,
        () => false,
      );
      if (ok) {
        break;
      }
      await new Promise((done) => setTimeout(done, 500));
    }
    for (const [name, look] of looks) {
      const query = `?look=${encodeURIComponent(JSON.stringify(look))}`;
      await renderViews(browser, `${base}${query}#demo=${DEMO}`, views, join(out, name));
    }
  } finally {
    await browser.close();
    server.kill('SIGTERM');
  }
}

await main();
