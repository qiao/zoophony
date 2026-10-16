// Renders close views of the faces of species from several builds of the site, in the rest pose,
// with the camera at the eyes at 2.2 head heights of the eyes.
// Usage: node docs/research/2026-10-16-pea-eyes/faces.ts <out dir> <name>=<dist dir>... -- <species,...> [views] [elevation]
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { chromium } from '@playwright/test';
import { preview } from 'vite';

import { boundsOf, gallerySupport, selectItems, speciesItems } from '../../../src/gallery/items.ts';
import { buildPlayer } from '../../../src/models/player.ts';
import { buildSupport } from '../../../src/models/props.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import type { SpeciesId } from '../../../src/models/species.ts';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const args = process.argv.slice(2);
const out = args[0] ?? 'scratch/faces/out';
const split = args.indexOf('--');
const sites = args.slice(1, split).map((pair) => pair.split('=') as [string, string]);
const species = (args[split + 1] ?? 'bear').split(',') as SpeciesId[];
const viewNames = (args[split + 2] ?? 'front,quarter').split(',');
const elevation = Number(args[split + 3] ?? 5);
const SIZE = { width: 420, height: 420 };

/** Gives the camera of the face of a species in the axes of the gallery. */
function faceCamera(id: SpeciesId) {
  const item = selectItems(speciesItems(), id)[0];
  if (!item) {
    throw new Error(`No item of ${id}`);
  }
  const model = buildPlayer(item.species, item.instrument, 4, gallerySupport(new URLSearchParams(), item.instrument));
  const seat = buildSupport(model.support, model.seat);
  const b = boundsOf(seat ? [model.mesh, seat] : [model.mesh]);
  const cx = (b.min[0] + b.max[0]) / 2;
  const cz = (b.min[2] + b.max[2]) / 2;
  const l = model.skeleton.positions[boneIndex('eyeL')] ?? [0, 0, 0];
  const r = model.skeleton.positions[boneIndex('eyeR')] ?? [0, 0, 0];
  const h = [(l[0] + r[0]) / 2, (l[1] + r[1]) / 2, (l[2] + r[2]) / 2];
  const piano = item.instrument === 'piano';
  // Facing pi: (x, z) -> (cx - x, cz - z). Facing -pi/2: (x, z) -> (cz - z, x - cx).
  const x = piano ? cz - (h[2] ?? 0) : cx - (h[0] ?? 0);
  const z = piano ? (h[0] ?? 0) - cx : cz - (h[2] ?? 0);
  const front = piano ? -90 : 0;
  const headHeight = model.body.headHeight * (model.studio?.body.eyes.headHeight ? model.studio.body.eyes.headHeight / model.body.headHeight : 1);
  return { x, z, y: h[1] ?? 1, front, headHeight };
}

const views: Record<string, number> = { front: 0, quarter: 35, side: 70, left: -35 };

await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
let port = 4320;
try {
  for (const [name, dist] of sites) {
    const server = await preview({
      root: ROOT,
      configFile: false,
      build: { outDir: resolve(dist) },
      preview: { port: port++, strictPort: false, open: false },
      logLevel: 'error',
    });
    const base = server.resolvedUrls?.local[0] ?? '';
    try {
      for (const id of species) {
        const cam = faceCamera(id);
        for (const view of viewNames) {
          const query = new URLSearchParams({
            page: 'species',
            only: id,
            rest: '',
            target: cam.y.toFixed(3),
            x: cam.x.toFixed(3),
            z: cam.z.toFixed(3),
            distance: (2.2 * cam.headHeight).toFixed(3),
            azimuth: String(cam.front + (views[view] ?? 0)),
            elevation: String(elevation),
          });
          const page = await browser.newPage({ viewport: SIZE });
          page.on('pageerror', (e) => console.error(e.message));
          await page.goto(`${base}gallery.html?${query.toString()}`);
          await page.waitForSelector('canvas[data-ready="species"]', { timeout: 60_000 });
          await page.addStyleTag({ content: '#controls, #labels { display: none; }' });
          await page.waitForTimeout(400);
          const file = join(out, `${name}-${id}-${view}.png`);
          await writeFile(file, await page.screenshot({ type: 'png' }));
          await page.close();
          console.log(file);
        }
      }
    } finally {
      await server.close();
    }
  }
} finally {
  await browser.close();
}
