import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { chromium } from '@playwright/test';

import { ROOT } from './ref-tree.ts';
import { rgbaPixels } from './sheet-check.ts';

/** A box of an image, in pixels: the left, the top, the right, and the bottom edge. */
export type PixelBox = readonly [left: number, top: number, right: number, bottom: number];

/** The RGBA pixels of an image. */
export interface Pixels {
  /** The width, in pixels. */
  readonly width: number;
  /** Four values for each pixel, row by row. */
  readonly rgba: Uint8Array;
}

/**
 * A region of a frame that the look lab measures. `color` gives the median color of a lit or a
 * shaded surface. `contrast` gives the contrast of the cast shadows on the floor.
 */
export interface LookRegion {
  /**
   * The name of the region. The box of the app and the box of the reference show the same kind
   * of surface.
   */
  readonly name: string;
  /** The measure of the region. */
  readonly kind: 'color' | 'contrast';
  /** The box in a frame of the camera `orchestra` of `pnpm close-views` (1440 × 900). */
  readonly app: PixelBox;
  /** The box in `docs/reference/orchestra-latest.png` (1762 × 1240). */
  readonly reference: PixelBox;
}

/**
 * The matched regions of the look lab (`docs/research/2026-10-17-cinematic-lighting.md`, P0). The
 * boxes of the app hold for the default demo at {@link LOOK_TIME_SEC}. A new layout or a new
 * camera moves them, so check them again on a new frame.
 */
export const LOOK_REGIONS: readonly LookRegion[] = [
  {
    name: 'lit floor, left of the podium',
    kind: 'color',
    app: [540, 700, 630, 780],
    reference: [700, 1050, 860, 1150],
  },
  {
    name: 'lit floor, right of the podium',
    kind: 'color',
    app: [830, 700, 950, 760],
    reference: [1220, 1040, 1340, 1110],
  },
  {
    name: 'back of the conductor',
    kind: 'color',
    app: [690, 580, 770, 650],
    reference: [950, 830, 1070, 960],
  },
  {
    name: 'white fur, front left rabbit',
    kind: 'color',
    app: [240, 480, 280, 560],
    reference: [150, 700, 200, 780],
  },
  {
    name: 'floor with the shadows of the players',
    kind: 'contrast',
    app: [250, 640, 530, 760],
    reference: [1250, 880, 1450, 1000],
  },
  {
    name: 'floor in front of the podium',
    kind: 'contrast',
    app: [620, 770, 820, 820],
    reference: [820, 1150, 1180, 1235],
  },
];

/** The cameras of `pnpm close-views` that the look lab renders. The first one has the regions. */
export const LOOK_CAMERAS = ['orchestra', 'default', 'violins'] as const;

/** The song time of the frames, in seconds: the time of the play frame of `pnpm snapshot`. */
export const LOOK_TIME_SEC = 33.5;

/** The reference image of the look. */
const REFERENCE = 'docs/reference/orchestra-latest.png';

/** The luma of an sRGB color, from 0 to 255. */
function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Gives the hue and the saturation of the HSV model of an sRGB color.
 *
 * @param rgb The color, from 0 to 255 for each channel.
 * @returns The hue in degrees, and the saturation from 0 to 1.
 */
export function hueSaturation(rgb: readonly [number, number, number]): [number, number] {
  const [r, g, b] = rgb;
  const top = Math.max(r, g, b);
  const range = top - Math.min(r, g, b);
  if (range === 0) {
    return [0, 0];
  }
  let hue: number;
  if (top === r) {
    hue = ((g - b) / range) % 6;
  } else if (top === g) {
    hue = (b - r) / range + 2;
  } else {
    hue = (r - g) / range + 4;
  }
  return [(hue * 60 + 360) % 360, range / top];
}

/**
 * Reads the colors of the pixels in a box.
 *
 * @param image The image.
 * @param box The box.
 * @param step The distance between two read pixels, in pixels.
 * @returns The colors.
 */
function boxColors(image: Pixels, box: PixelBox, step = 1): [number, number, number][] {
  const [left, top, right, bottom] = box;
  const colors: [number, number, number][] = [];
  for (let y = top; y < bottom; y += step) {
    for (let x = left; x < right; x += step) {
      const i = (y * image.width + x) * 4;
      colors.push([image.rgba[i] ?? 0, image.rgba[i + 1] ?? 0, image.rgba[i + 2] ?? 0]);
    }
  }
  return colors;
}

/**
 * Gives the value at a part of a sorted list.
 *
 * @param sorted The values, from the smallest.
 * @param q The part, from 0 to 1.
 * @returns The value.
 */
function at<T>(sorted: readonly T[], q: number): T {
  const value = sorted[Math.floor(q * (sorted.length - 1))];
  if (value === undefined) {
    throw new Error('A region of the look lab has no pixels.');
  }
  return value;
}

/** The tone of the stage area of a frame. */
export interface StageTone {
  /** The luma at 5%, 25%, 50%, 75%, and 95% of the pixels, from 0 to 255. */
  readonly percentiles: readonly number[];
  /** The median of the saturation of the pixels, from 0 to 1. */
  readonly saturation: number;
}

/**
 * Measures the tone of the stage area: the band from 45% to 85% of the height and from 20% to
 * 80% of the width, as `tone_measure.py` of the research report.
 *
 * @param image The image.
 * @param height The height of the image, in pixels.
 * @returns The tone.
 */
export function stageTone(image: Pixels, height: number): StageTone {
  const box: PixelBox = [
    Math.round(image.width * 0.2),
    Math.round(height * 0.45),
    Math.round(image.width * 0.8),
    Math.round(height * 0.85),
  ];
  const colors = boxColors(image, box, 2);
  const lumas = colors.map(([r, g, b]) => luma(r, g, b)).toSorted((a, b) => a - b);
  const saturations = colors.map((c) => hueSaturation(c)[1]).toSorted((a, b) => a - b);
  return {
    percentiles: [0.05, 0.25, 0.5, 0.75, 0.95].map((q) => Math.round(at(lumas, q))),
    saturation: at(saturations, 0.5),
  };
}

/**
 * Measures the median color of a region, by the sum of the channels.
 *
 * @param image The image.
 * @param box The region.
 * @returns The color, from 0 to 255 for each channel.
 */
export function regionColor(image: Pixels, box: PixelBox): [number, number, number] {
  const sorted = boxColors(image, box).toSorted((a, b) => a[0] + a[1] + a[2] - b[0] - b[1] - b[2]);
  return at(sorted, 0.5);
}

/** The contrast of the cast shadows in a region of the floor. */
export interface RegionContrast {
  /** The luma at 5% of the pixels. */
  readonly dark: number;
  /** The luma at 90% of the pixels. */
  readonly light: number;
  /** The mean color of the darkest 5% of the pixels: the color of the shadows. */
  readonly shadow: readonly [number, number, number];
}

/**
 * Measures the contrast of the cast shadows in a region, as `floor_measure.py` of the research
 * report.
 *
 * @param image The image.
 * @param box The region.
 * @returns The contrast.
 */
export function regionContrast(image: Pixels, box: PixelBox): RegionContrast {
  const sorted = boxColors(image, box).toSorted(
    (a, b) => luma(a[0], a[1], a[2]) - luma(b[0], b[1], b[2]),
  );
  const darkest = sorted.slice(0, Math.max(1, Math.floor(sorted.length / 20)));
  const mean = (channel: 0 | 1 | 2): number =>
    Math.round(darkest.reduce((sum, color) => sum + color[channel], 0) / darkest.length);
  return {
    dark: luma(...at(sorted, 0.05)),
    light: luma(...at(sorted, 0.9)),
    shadow: [mean(0), mean(1), mean(2)],
  };
}

/** A frame that the look lab measures. */
interface LookFrame {
  /** The label of the frame in the tables. */
  readonly label: string;
  /** The pixels. */
  readonly image: Pixels;
  /** The height, in pixels. */
  readonly height: number;
  /** The kind of the boxes of the regions, or `null` for a frame with no regions. */
  readonly boxes: 'app' | 'reference' | null;
}

/**
 * Writes the tables of the look lab as Markdown.
 *
 * @param frames The frames.
 * @returns The text.
 */
export function lookTables(frames: readonly LookFrame[]): string {
  const f = (value: number, digits = 0): string => value.toFixed(digits);
  const lines = [
    '## Stage tone',
    '',
    '| Frame | p5 | p25 | p50 | p75 | p95 | Median saturation |',
    '|---|---|---|---|---|---|---|',
  ];
  for (const frame of frames) {
    const tone = stageTone(frame.image, frame.height);
    lines.push(`| ${frame.label} | ${tone.percentiles.join(' | ')} | ${f(tone.saturation, 2)} |`);
  }

  const matched = frames.filter((frame) => frame.boxes);
  lines.push(
    '',
    '## Colors of the regions',
    '',
    '| Region | Frame | Median RGB | Luma | Hue | Saturation |',
    '|---|---|---|---|---|---|',
  );
  for (const region of LOOK_REGIONS.filter((r) => r.kind === 'color')) {
    for (const frame of matched) {
      const box = frame.boxes === 'app' ? region.app : region.reference;
      const color = regionColor(frame.image, box);
      const [hue, saturation] = hueSaturation(color);
      lines.push(
        `| ${region.name} | ${frame.label} | (${color.join(', ')}) | ${f(luma(...color))} | ${f(hue)} | ${f(saturation, 2)} |`,
      );
    }
  }

  lines.push(
    '',
    '## Shadows on the floor',
    '',
    '| Region | Frame | Luma p5 | Luma p90 | Ratio | Shadow RGB |',
    '|---|---|---|---|---|---|',
  );
  for (const region of LOOK_REGIONS.filter((r) => r.kind === 'contrast')) {
    for (const frame of matched) {
      const box = frame.boxes === 'app' ? region.app : region.reference;
      const c = regionContrast(frame.image, box);
      lines.push(
        `| ${region.name} | ${frame.label} | ${f(c.dark, 1)} | ${f(c.light, 1)} | ${f(c.light / c.dark, 1)} | (${c.shadow.join(', ')}) |`,
      );
    }
  }
  return `${lines.join('\n')}\n`;
}

/**
 * Reads a PNG image as a frame.
 *
 * @param browser The browser that decodes the image.
 * @param path The path of the image.
 * @param label The label of the frame in the tables.
 * @param boxes The kind of the boxes of the regions, or `null`.
 * @returns The frame.
 */
async function readFrame(
  browser: Parameters<typeof rgbaPixels>[0],
  path: string,
  label: string,
  boxes: LookFrame['boxes'],
): Promise<LookFrame> {
  const image = await rgbaPixels(browser, await readFile(path));
  return { label, image, height: image.rgba.length / 4 / image.width, boxes };
}

const USAGE = 'Usage: pnpm look-lab <dir> [--base <ref>] [--url <url>] [--measure]';

/**
 * Renders the frames of the look lab with `pnpm close-views play`, unless `--measure` is given,
 * then measures each frame and the reference, and writes `<dir>/look.md`.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const [dir, ...rest] = args;
  if (!dir || dir.startsWith('--')) {
    throw new Error(USAGE);
  }
  const measureOnly = rest.includes('--measure');
  const passed = rest.filter((arg) => arg !== '--measure');
  if (!measureOnly) {
    const cameras = LOOK_CAMERAS.flatMap((camera) => ['--camera', camera]);
    const play = ['play', dir, '--time', String(LOOK_TIME_SEC), ...cameras, ...passed];
    // With --url, close-views renders the running site, so the build of `pnpm close-views` is
    // no use. The build also writes `dist/` while another run can read it.
    const [command, line] = passed.includes('--url')
      ? [process.execPath, [join(ROOT, 'tools/close-views.ts'), ...play]]
      : ['pnpm', ['close-views', ...play]];
    execFileSync(command, line, { cwd: ROOT, stdio: 'inherit' });
  }

  const browser = await chromium.launch();
  try {
    const frames = [await readFrame(browser, join(ROOT, REFERENCE), 'reference', 'reference')];
    for (const [prefix, tree] of [
      ['play-base-', 'base'],
      ['play-', 'tree'],
    ] as const) {
      for (const [i, camera] of LOOK_CAMERAS.entries()) {
        const path = join(dir, `${prefix}${camera}.png`);
        if (existsSync(path)) {
          frames.push(await readFrame(browser, path, `${tree}, ${camera}`, i === 0 ? 'app' : null));
        }
      }
    }
    const text = `# Look lab\n\nThe frames of \`${dir}\` against \`${REFERENCE}\`.\n\n${lookTables(frames)}`;
    await writeFile(join(dir, 'look.md'), text);
    console.log(text);
  } finally {
    await browser.close();
  }
}

if (import.meta.main) {
  await main();
}
