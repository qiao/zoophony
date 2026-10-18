/**
 * Renders the visibility probe frames at 1440 x 900 from the build in dist/ (built with the probe
 * patch of probe-patch.py): the gallery views and moments of the trombonist, and the stage of each
 * demo with a trombone in the planned shots and in three free cameras.
 * Usage: node docs/research/2026-10-18-panda-seam/hidden/probe.ts <out dir> [gallery|stage|all]
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import type { Page } from '@playwright/test';

import { FIRST_PLAY, SAMPLES_READY } from '../../../../src/app/dev-hook.ts';
import { DEMOS } from '../../../../src/app/demos.ts';
import type { DemoId } from '../../../../src/app/demos.ts';
import { ROLE_VIEWS, closeViewPath } from '../../../../tools/close-views.ts';
import { openShot, startSite } from '../../../../tools/screenshots.ts';

const out = resolve(process.argv[2] ?? 'scratch/hid/probe');
const mode = process.argv[3] ?? 'all';
await mkdir(out, { recursive: true });
const FRAME = { width: 1440, height: 900 };
const site = await startSite(resolve(import.meta.dirname, '../../../..'), 4420);
const role = ROLE_VIEWS.trombonist;

async function gallery(): Promise<void> {
  const sets = [
    {
      name: 'role',
      camera: role.camera,
      views: [...role.views, { name: 'q-left', azimuth: -40 }, { name: 'q-right', azimuth: 40 }],
      moments: role.moments,
    },
    {
      name: 'streak',
      camera: { kind: 'body' as const, zoom: 1.7, elevation: 10 },
      views: [
        { name: 'front', azimuth: 0 },
        { name: 'q-left', azimuth: -40 },
        { name: 'left', azimuth: -90 },
        { name: 'q-right', azimuth: 40 },
        { name: 'right', azimuth: 90 },
      ],
      moments: role.moments.filter((m) => m.name === 'rest' || m.name === 'first'),
    },
  ];
  for (const set of sets) {
    for (const moment of set.moments) {
      for (const view of set.views) {
        const path = closeViewPath({ ...role, camera: set.camera }, view, moment);
        const page = await openShot(site.browser, new URL(path.slice(1), site.base).href, {
          file: '',
          path,
          ...FRAME,
          ready: 'canvas[data-ready="species"]',
        });
        await page.addStyleTag({ content: '#controls, #labels { display: none; }' });
        await page.evaluate(
          ({ time, notes }) => {
            const input = document.querySelector('#notes');
            if (notes !== null && input instanceof HTMLTextAreaElement) {
              input.value = notes;
              input.dispatchEvent(new Event('input'));
            }
            const slider = document.querySelector('#time');
            if (slider instanceof HTMLInputElement) {
              slider.value = String(time);
              slider.dispatchEvent(new Event('input'));
            }
          },
          { time: moment.time, notes: role.notes },
        );
        await page.waitForTimeout(300);
        await writeFile(join(out, `gallery-${set.name}-${moment.name}-${view.name}.png`), await page.screenshot());
        await page.close();
      }
    }
  }
}

async function seek(page: Page, sec: number): Promise<void> {
  await page.$eval(
    '.seek',
    (element, value) => {
      if (element instanceof HTMLInputElement) {
        element.value = String(value);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
    },
    sec,
  );
}

async function stage(): Promise<void> {
  const demos: DemoId[] = ['boulanger-matin', 'beethoven-9', 'brahms-2'];
  // The planned shots (no "Reset view"), and three free cameras: the default view, low from the
  // front, and close from the back left.
  const cameras = [
    { name: 'planned', reset: false, dx: 0, dy: 0, wheel: 0 },
    { name: 'default', reset: true, dx: 0, dy: 0, wheel: 0 },
    { name: 'front-low', reset: true, dx: 0, dy: -60, wheel: 10 },
    { name: 'back-left', reset: true, dx: -330, dy: -20, wheel: 15 },
  ];
  for (const demo of demos) {
    const length = DEMOS[demo].lengthSec;
    for (const camera of cameras) {
      const count = camera.name === 'planned' ? 14 : 6;
      const path = `/#demo=${demo}`;
      const page = await openShot(site.browser, new URL(path.slice(1), site.base).href, {
        file: '',
        path,
        ...FRAME,
        ready: SAMPLES_READY,
      });
      await page.click(FIRST_PLAY);
      await page.waitForTimeout(1500);
      await page.click('.close-drawer');
      if (camera.reset) {
        await page.getByRole('button', { name: 'Reset view' }).click();
        if (camera.dx !== 0 || camera.dy !== 0) {
          await page.mouse.move(720, 400);
          await page.mouse.down();
          await page.mouse.move(720 + camera.dx, 400 + camera.dy, { steps: 20 });
          await page.mouse.up();
        }
        await page.mouse.move(720, 400);
        for (let i = 0; i < camera.wheel; i++) {
          await page.mouse.wheel(0, -100);
          await page.waitForTimeout(30);
        }
      }
      await page.mouse.move(720, 450);
      for (let k = 0; k < count; k++) {
        const sec = Math.floor(5 + ((length - 10) * k) / (count - 1));
        await seek(page, sec);
        await page.waitForTimeout(3600);
        await writeFile(join(out, `stage-${demo}-${camera.name}-${sec}.png`), await page.screenshot());
      }
      await page.close();
    }
  }
}

try {
  if (mode !== 'stage') {
    await gallery();
  }
  if (mode !== 'gallery') {
    await stage();
  }
} finally {
  await site.close();
}
console.log(`frames in ${out}`);
