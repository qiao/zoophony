import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { chromium } from '@playwright/test';
import type { Browser } from '@playwright/test';
import { preview } from 'vite';

import type { SpeciesId } from '../src/models/species.ts';
import { chromiumArgs } from './chromium-args.ts';
import { ROOT, optionValue, shortHash, withRefBuild } from './ref-tree.ts';
import { openShot, startSite, toWebp } from './screenshots.ts';

/** One view of a close view: the turn of the gallery camera around the animal. */
export interface CloseViewAngle {
  /** The name of the view in the file names and the labels. */
  readonly name: 'front' | 'side' | 'left' | 'right' | 'back' | 'keys';
  /**
   * The turn of the camera to the right side of the animal, in degrees. Around a body, 0 is the
   * front of the animal. Around a line, 0 is the +z side of the gallery.
   */
  readonly azimuth: number;
  /** The angle of the camera above the floor, in degrees, in place of the angle of the role. */
  readonly elevation?: number;
}

/**
 * One moment of a close view: a time of the gallery time slider in the test notes of the role,
 * or the rest pose of design 5.2.
 */
export interface CloseMoment {
  /** The name of the moment in the file names and the labels. */
  readonly name: string;
  /** The time of the slider, in seconds. The rest pose ignores it. */
  readonly time: number;
  /** True for the rest pose: the arms hang, or the paws rest on the knees. */
  readonly rest: boolean;
  /** True for a player who stands as a soloist (the gallery query `stand`, design 4.5). */
  readonly stand?: boolean;
}

/**
 * The camera of a close view around the body of the animal (the query `body`). The box of the
 * body gives the vertical line, the target, and the distance at the zoom 1. A new role needs no
 * other value.
 */
export interface BodyCamera {
  /** The kind of the camera. */
  readonly kind: 'body';
  /** The zoom of the camera, 1 or more: 1 shows the whole body. */
  readonly zoom: number;
  /** The angle of the camera above the floor, in degrees. */
  readonly elevation: number;
}

/** The camera of a close view around a fixed vertical line of the gallery (`closeView()`). */
export interface LineCamera {
  /** The kind of the camera. */
  readonly kind: 'line';
  /** The zoom of the camera, 1 or more. */
  readonly zoom: number;
  /** The height of the point that the camera looks at, in meters. */
  readonly target: number;
  /** The angle of the camera above the floor, in degrees. */
  readonly elevation: number;
  /** The x of the vertical line around which the camera turns, in meters. */
  readonly x: number;
  /** The z of the vertical line around which the camera turns, in meters. */
  readonly z: number;
}

/** The close view of one role of the gallery. */
export interface RoleViews {
  /** The species of the role, which the query `only` selects. */
  readonly species: SpeciesId;
  /** The views, one column of the grid each. */
  readonly views: readonly CloseViewAngle[];
  /** The moments, one row of the grid each. */
  readonly moments: readonly CloseMoment[];
  /** The camera of the close views. */
  readonly camera: BodyCamera | LineCamera;
  /** The test notes of the gallery for the moments, or none for the default test notes. */
  readonly notes: string | null;
}

/** A role with a close view: the bear conductor, the polar bear pianist, or the rabbit violinist. */
export type CloseRole = 'conductor' | 'pianist' | 'violinist';

/**
 * The close views of the roles (design 7.1):
 *
 * - The conductor: the front, the right side, and the back, which the default view of the stage
 *   shows (design 2.5), at the four beats of the first bar of the default test notes (4/4 at 120
 *   BPM), between two beats, and in the rest pose. The conductor keeps its fixed line.
 * - The pianist: the front, both sides, the back, and the left paw on the keys. The moments are
 *   a chord of three keys in each hand, a time between two chords, and the rest pose. The camera
 *   turns around the body. It looks down 35°, over the case of the piano in the front view. The view of the
 *   keys is low from the left, 15° to the front.
 * - The violinist: the front, both sides, and the back. The moments are the frog and the tip of a
 *   whole bow on the A string, a string crossing from the G string to the E string, the rest
 *   pose, and the standing soloist at the frog.
 *
 * A new role gives its species, its views, its moments, and its test notes, with the camera
 * `{ kind: 'body', zoom: 1, elevation }`.
 */
export const ROLE_VIEWS: Readonly<Record<CloseRole, RoleViews>> = {
  conductor: {
    species: 'bear',
    views: [
      { name: 'front', azimuth: 0 },
      { name: 'side', azimuth: 90 },
      { name: 'back', azimuth: 180 },
    ],
    moments: [
      { name: 'beat-1', time: 0, rest: false },
      { name: 'between', time: 0.25, rest: false },
      { name: 'beat-2', time: 0.5, rest: false },
      { name: 'beat-3', time: 1, rest: false },
      { name: 'beat-4', time: 1.5, rest: false },
      { name: 'rest', time: 0, rest: true },
    ],
    camera: { kind: 'line', zoom: 1.4, target: 0.9, elevation: 8, x: 0, z: 0 },
    notes: null,
  },
  pianist: {
    species: 'polar-bear',
    views: [
      { name: 'front', azimuth: 0 },
      { name: 'left', azimuth: -90 },
      { name: 'right', azimuth: 90 },
      { name: 'back', azimuth: 180 },
      // The lid of the piano hides the paws in the front view. From above, the muzzle hides them.
      // This low view from the left, 15° to the front, shows the left paw on the keys.
      { name: 'keys', azimuth: -75, elevation: 25 },
    ],
    moments: [
      { name: 'chord', time: 0.6, rest: false },
      { name: 'between', time: 1.45, rest: false },
      { name: 'rest', time: 0, rest: true },
    ],
    camera: { kind: 'body', zoom: 1, elevation: 35 },
    // A wide chord splits into C3 E3 G3 for the left paw and C5 E5 G5 for the right paw, then
    // A2 C3 E3 and A4 C5 E5 (design 5.3).
    notes: [
      '0.5 0.8 C3',
      '0.5 0.8 E3',
      '0.5 0.8 G3',
      '0.5 0.8 C5',
      '0.5 0.8 E5',
      '0.5 0.8 G5',
      '1.5 0.8 A2',
      '1.5 0.8 C3',
      '1.5 0.8 E3',
      '1.5 0.8 A4',
      '1.5 0.8 C5',
      '1.5 0.8 E5',
    ].join('\n'),
  },
  violinist: {
    species: 'rabbit',
    views: [
      { name: 'front', azimuth: 0 },
      { name: 'left', azimuth: -90 },
      { name: 'right', azimuth: 90 },
      { name: 'back', azimuth: 180 },
    ],
    moments: [
      { name: 'frog', time: 0.55, rest: false },
      { name: 'tip', time: 2.4, rest: false },
      { name: 'crossing', time: 3.25, rest: false },
      { name: 'rest', time: 0, rest: true },
      { name: 'stand', time: 0.55, rest: false, stand: true },
    ],
    camera: { kind: 'body', zoom: 1, elevation: 20 },
    // A whole down-bow on A4, then a string crossing from G3 to E5.
    notes: ['0.5 2 A4', '3 0.25 G3', '3.25 0.25 E5', '3.5 0.25 G3'].join('\n'),
  },
};

/** The size of one cell of the close view, in CSS pixels. */
export const CELL = { width: 360, height: 450 } as const;

/**
 * Gives the path of the gallery page of a view and a moment: the animal of a role alone with its
 * instrument, close, at the camera of the view.
 *
 * @param role The role.
 * @param view The view.
 * @param moment The moment.
 * @returns The path and the query, from the root of the site.
 */
export function closeViewPath(role: RoleViews, view: CloseViewAngle, moment: CloseMoment): string {
  const camera = role.camera;
  const query = new URLSearchParams({
    page: 'species',
    only: role.species,
    zoom: String(camera.zoom),
    azimuth: String(view.azimuth),
    elevation: String(view.elevation ?? camera.elevation),
  });
  if (camera.kind === 'body') {
    query.set('body', '');
  } else {
    query.set('target', String(camera.target));
    query.set('x', String(camera.x));
    query.set('z', String(camera.z));
  }
  if (moment.rest) {
    query.set('rest', '');
  }
  if (moment.stand) {
    query.set('stand', '');
  }
  return `/gallery.html?${query.toString()}`;
}

/**
 * Renders one cell: the gallery page of a view at the time of a moment, with no panel and no
 * labels.
 *
 * @param browser The browser.
 * @param base The URL of the site.
 * @param role The role.
 * @param view The view.
 * @param moment The moment.
 * @returns The PNG image.
 */
async function render(
  browser: Browser,
  base: string,
  role: RoleViews,
  view: CloseViewAngle,
  moment: CloseMoment,
): Promise<Buffer> {
  const path = closeViewPath(role, view, moment);
  const page = await openShot(browser, new URL(path.slice(1), base).href, {
    file: '',
    path,
    ...CELL,
    ready: 'canvas[data-ready="species"]',
  });
  try {
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
    // The idle motion needs a few frames at the new time.
    await page.waitForTimeout(300);
    return await page.screenshot({ type: 'png' });
  } finally {
    await page.close();
  }
}

/**
 * Puts the cells in a grid: one row for each moment, one column for each view, with the name of
 * the moment and of the view in each cell.
 *
 * @param browser The browser.
 * @param cells The image of each cell, row by row.
 * @param labels The label of each cell.
 * @param columns The number of columns.
 * @returns The PNG image.
 */
async function grid(
  browser: Browser,
  cells: readonly Buffer[],
  labels: readonly string[],
  columns: number,
): Promise<Buffer> {
  const page = await browser.newPage();
  try {
    const dataUrl = await page.evaluate(
      async ({ images, names, size, across }) => {
        const loaded = await Promise.all(
          images.map(async (source) => {
            const image = new Image();
            image.src = source;
            await image.decode();
            return image;
          }),
        );
        const canvas = document.createElement('canvas');
        canvas.width = size.width * across;
        canvas.height = size.height * Math.ceil(images.length / across);
        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('The canvas has no 2D context.');
        }
        context.font = '16px sans-serif';
        for (const [i, image] of loaded.entries()) {
          const x = (i % across) * size.width;
          const y = Math.floor(i / across) * size.height;
          context.drawImage(image, x, y, size.width, size.height);
          context.fillStyle = '#ffffff';
          context.fillText(names[i] ?? '', x + 10, y + 24);
        }
        return canvas.toDataURL('image/png');
      },
      {
        images: cells.map((cell) => `data:image/png;base64,${cell.toString('base64')}`),
        names: [...labels],
        size: CELL,
        across: columns,
      },
    );
    return Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
  } finally {
    await page.close();
  }
}

/**
 * Gives the role of a name of the command line.
 *
 * @param name The name.
 * @returns The role, or `null` for a name that is not a role.
 */
export function roleOf(name: string | undefined): CloseRole | null {
  return name === 'conductor' || name === 'pianist' || name === 'violinist' ? name : null;
}

/** The command line of the close views. */
export interface CloseViewsArgs {
  /** The role. */
  readonly role: CloseRole;
  /** The output directory. */
  readonly out: string;
  /** The URL of a running site of the working tree, or `null` for the built site. */
  readonly url: string | null;
  /** The commit, the branch, or the tag to compare with the working tree, or `null`. */
  readonly base: string | null;
}

/**
 * Reads the command line of the close views: `<role> <dir> [--url <url>] [--base <ref>]`.
 *
 * @param args The arguments after the script.
 * @returns The command line, or `null` when it is not correct.
 */
export function closeViewsArgs(args: readonly string[]): CloseViewsArgs | null {
  const role = roleOf(args[0]);
  const out = args[1];
  const url = optionValue(args, '--url');
  const base = optionValue(args, '--base');
  if (!role || !out || out.startsWith('--') || url === undefined || base === undefined) {
    return null;
  }
  return { role, out, url, base };
}

/**
 * Gives the labels of the grid of a commit above the grid of the working tree: each label of a
 * cell starts with the name of its tree.
 *
 * @param labels The labels of the cells of one grid.
 * @param base The name of the commit, such as `main (cc83899c)`.
 * @returns The labels of the cells of the commit, then of the working tree.
 */
export function baseGridLabels(labels: readonly string[], base: string): string[] {
  return [
    ...labels.map((label) => `${base}: ${label}`),
    ...labels.map((label) => `working tree: ${label}`),
  ];
}

/** The cells of the close view of a role, row by row, with their labels. */
interface RenderedViews {
  /** The PNG image of each cell. */
  readonly cells: readonly Buffer[];
  /** The label of each cell: the moment and the view. */
  readonly labels: readonly string[];
}

/**
 * Renders each cell of the close view of a role, and writes each cell as a PNG file.
 *
 * @param browser The browser.
 * @param base The URL of the site.
 * @param name The role.
 * @param out The output directory.
 * @param prefix The start of the file names, such as `violinist-`.
 * @returns The cells and their labels.
 */
async function renderViews(
  browser: Browser,
  base: string,
  name: CloseRole,
  out: string,
  prefix: string,
): Promise<RenderedViews> {
  const role = ROLE_VIEWS[name];
  const cells: Buffer[] = [];
  const labels: string[] = [];
  for (const moment of role.moments) {
    for (const view of role.views) {
      const cell = await render(browser, base, role, view, moment);
      await writeFile(join(out, `${prefix}${moment.name}-${view.name}.png`), cell);
      cells.push(cell);
      labels.push(`${moment.name}, ${view.name}`);
    }
  }
  return { cells, labels };
}

/**
 * Builds a commit in a temporary folder, serves its site, and renders the close view of a role
 * there. Then it writes the grid of the commit above the grid of the working tree as
 * `<role>-base-views.png` and `<role>-base-views.webp`, and each cell of the commit as
 * `<role>-base-<moment>-<view>.png`.
 *
 * @param browser The browser.
 * @param ref The commit, the branch, or the tag.
 * @param name The role.
 * @param out The output directory.
 * @param views The cells of the working tree.
 */
async function renderBase(
  browser: Browser,
  ref: string,
  name: CloseRole,
  out: string,
  views: RenderedViews,
): Promise<void> {
  const label = `${ref} (${shortHash(ref)})`;
  await withRefBuild(ref, async (dir) => {
    const server = await preview({
      root: dir,
      preview: { port: 4179, strictPort: false, open: false },
    });
    try {
      const site = server.resolvedUrls?.local[0];
      if (!site) {
        throw new Error(`The preview server of ${label} has no URL.`);
      }
      const before = await renderViews(browser, site, name, out, `${name}-base-`);
      const cells = [...before.cells, ...views.cells];
      const labels = baseGridLabels(views.labels, label);
      const sheet = await grid(browser, cells, labels, ROLE_VIEWS[name].views.length);
      await writeFile(join(out, `${name}-base-views.png`), sheet);
      await writeFile(join(out, `${name}-base-views.webp`), await toWebp(browser, sheet));
      console.log(join(out, `${name}-base-views.png`));
    } finally {
      await server.close();
    }
  });
}

/**
 * Renders the close view of a role:
 * `node tools/close-views.ts <role> <dir> [--url <url>] [--base <ref>]` (design 7.1). It writes
 * the animal of the role at each moment from each view into `<dir>`, and the grid of all cells as
 * `<role>-views.png` and `<role>-views.webp`. With `--url`, it uses a running site, such as the
 * dev server, in place of the built site. With `--base`, it also builds the commit in a temporary
 * folder, and writes the grid of the commit above the grid of the working tree.
 */
async function main(): Promise<void> {
  const args = closeViewsArgs(process.argv.slice(2));
  if (!args) {
    console.error(
      'Usage: pnpm close-views <conductor|pianist|violinist> <output directory> [--url <url>] [--base <ref>]',
    );
    process.exit(1);
  }
  if (args.base !== null) {
    // An unknown commit stops the tool before the first render.
    try {
      shortHash(args.base);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  const { role: name, out, url } = args;
  const role = ROLE_VIEWS[name];
  await mkdir(out, { recursive: true });
  const site = url
    ? {
        base: url,
        browser: await chromium.launch({ args: chromiumArgs(process.platform) }),
        close: async (): Promise<void> => undefined,
      }
    : await startSite(ROOT);
  try {
    const views = await renderViews(site.browser, site.base, name, out, `${name}-`);
    const sheet = await grid(site.browser, views.cells, views.labels, role.views.length);
    await writeFile(join(out, `${name}-views.png`), sheet);
    await writeFile(join(out, `${name}-views.webp`), await toWebp(site.browser, sheet));
    console.log(join(out, `${name}-views.png`));
    if (args.base !== null) {
      await renderBase(site.browser, args.base, name, out, views);
    }
  } finally {
    if (url) {
      await site.browser.close();
    }
    await site.close();
  }
}

if (import.meta.main) {
  await main();
}
