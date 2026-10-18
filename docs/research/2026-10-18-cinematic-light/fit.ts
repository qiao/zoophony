// The offline fit of the grade (docs/research/2026-10-18-cinematic-light.md, section 2.3). It
// reads frames of the camera orchestra that the app rendered with the identity grade (AgX alone:
// GRADE of src/scene/grade.ts with no curve, a saturation of 1, and no tints), removes the
// vignette of the final pass, applies a grade, puts the vignette back, and measures the regions
// of tools/look-lab.ts. It prints each frame as it is and with gradeColor(). Run from the root:
// node docs/research/2026-10-18-cinematic-light/fit.ts <identity frame.png>...
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { gradeColor } from '../../../src/scene/grade.ts';
import { rgbaPixels } from '../../../tools/sheet-check.ts';
import { LOOK_REGIONS, hueSaturation, regionColor, regionContrast, stageTone } from '../../../tools/look-lab.ts';
import type { Pixels } from '../../../tools/look-lab.ts';

type C3 = [number, number, number];
export type Grade = (c: C3) => C3;
const ss = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function vignette(x: number, y: number, w: number, h: number): number {
  const aspect = w / h;
  const fx = ((x + 0.5) / w - 0.5) * aspect, fy = (y + 0.5) / h - 0.5;
  const edge = Math.hypot(fx, fy) / Math.hypot(aspect * 0.5, 0.5);
  return 1 - 0.45 * ss(0.3, 1, edge);
}

function apply(image: Pixels, grade: Grade): Pixels {
  const h = image.rgba.length / 4 / image.width, w = image.width;
  const out = new Uint8Array(image.rgba.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, v = vignette(x, y, w, h);
    const c: C3 = [0, 1, 2].map((k) => Math.min(1, image.rgba[i + k]! / 255 / v)) as C3;
    const g = grade(c);
    for (let k = 0; k < 3; k++) out[i + k] = Math.round(Math.min(1, Math.max(0, g[k]! * v)) * 255);
    out[i + 3] = 255;
  }
  return { width: w, rgba: out };
}

export async function load(paths: string[]): Promise<Pixels[]> {
  const browser = await chromium.launch();
  try { return await Promise.all(paths.map(async (p) => rgbaPixels(browser, await readFile(p)))); } finally { await browser.close(); }
}

export function report(label: string, orchestra: Pixels, grade: Grade): string {
  const img = apply(orchestra, grade);
  const h = img.rgba.length / 4 / img.width;
  const t = stageTone(img, h);
  const parts = [`${label}: tone ${t.percentiles.join('/')} sat ${t.saturation.toFixed(2)}`];
  for (const r of LOOK_REGIONS) {
    if (r.kind === 'color') {
      const c = regionColor(img, r.app); const [hu, s] = hueSaturation(c);
      parts.push(`  ${r.name.slice(0, 24).padEnd(24)} (${c.join(',')}) h${hu.toFixed(0)} s${s.toFixed(2)}`);
    } else {
      const c = regionContrast(img, r.app);
      parts.push(`  ${r.name.slice(0, 24).padEnd(24)} p5 ${c.dark.toFixed(0)} p90 ${c.light.toFixed(0)} ratio ${(c.light / c.dark).toFixed(1)} (${c.shadow.join(',')})`);
    }
  }
  return parts.join('\n');
}


const paths = process.argv.slice(2);
const frames = await load(paths);
for (const [i, frame] of frames.entries()) {
  console.log(report(`${paths[i]}, identity`, frame, (c) => c));
  console.log(report(`${paths[i]}, gradeColor()`, frame, (c) => gradeColor(c)));
}
