/**
 * Renders close views of the gallery panda trombonist at custom views and moments, from the
 * build in dist/. Usage: node docs/research/2026-10-18-panda-marks/shots.ts <out dir> [zoom] [target]
 * Each cell is 600 x 750 px. The moments: rest and first (B flat 2 in the first position).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { ROLE_VIEWS, closeViewPath } from '../../../tools/close-views.ts';
import { openShot, startSite } from '../../../tools/screenshots.ts';

const out = resolve(process.argv[2] ?? 'scratch/marks/shots');
const zoom = Number(process.argv[3] ?? '1.7');
const target = process.argv[4];
await mkdir(out, { recursive: true });
const role = { ...ROLE_VIEWS.trombonist, camera: { kind: 'body' as const, zoom, elevation: 10 } };
const views = [
  { name: 'front', azimuth: 0 },
  { name: 'q-left', azimuth: -40 },
  { name: 'left', azimuth: -90 },
  { name: 'q-right', azimuth: 40 },
  { name: 'right', azimuth: 90 },
  { name: 'back', azimuth: 180 },
];
const moments = [
  { name: 'rest', time: 0, rest: true },
  { name: 'first', time: 0.6, rest: false },
];
const site = await startSite(resolve(import.meta.dirname, '../../..'), 4410);
try {
  for (const moment of moments) {
    for (const view of views) {
      let path = closeViewPath(role, view, moment);
      if (target) {
        path += `&target=${target}`;
      }
      const page = await openShot(site.browser, new URL(path.slice(1), site.base).href, {
        file: '',
        path,
        width: 600,
        height: 750,
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
      await writeFile(join(out, `${moment.name}-${view.name}.png`), await page.screenshot());
      await page.close();
      console.log(`${moment.name}-${view.name}`);
    }
  }
} finally {
  await site.close();
}
