// Takes one frame of each kind of shot of the default demo at 1440 x 900 into <dir>
// (docs/research/2026-10-18-shot-light-lens-haze.md, section 2.3). Run after pnpm build, from
// the root: node docs/research/2026-10-18-shot-light-lens-haze/shots.ts <dir>
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DEFAULT_DEMO } from '../../../src/app/demos.ts';
import { FIRST_PLAY, SAMPLES_READY } from '../../../src/app/dev-hook.ts';
import { layoutScene } from '../../../src/models/layout-scene.ts';
import { ModelCache } from '../../../src/models/model-cache.ts';
import { buildScore } from '../../../src/score/score.ts';
import { SHOT_SEED, prepareShots } from '../../../src/shots/prepare.ts';
import { openShot, shotSeeks, startSite } from '../../../tools/screenshots.ts';

const out = process.argv[2] ?? 'shots';
await mkdir(out, { recursive: true });
const bytes = new Uint8Array(await readFile(`public/demos/${DEFAULT_DEMO}.mid`));
const result = buildScore(bytes, 'auto');
if (!result.ok) throw new Error(result.error);
const models = new ModelCache();
const plan = prepareShots(result.score, layoutScene(result.score, models), SHOT_SEED, models);
const seeks = shotSeeks(plan);
console.log(seeks);
const site = await startSite(process.cwd(), 4393);
try {
  for (const { kind, seekSec } of seeks) {
    const shot = { file: '', path: `/#demo=${DEFAULT_DEMO}`, width: 1440, height: 900, ready: SAMPLES_READY };
    const page = await openShot(site.browser, site.base + shot.path.slice(1), shot);
    await page.click(FIRST_PLAY);
    const clicked = Date.now();
    await page.waitForTimeout(1500);
    await page.$eval('.seek', (element, value) => {
      if (element instanceof HTMLInputElement) {
        element.value = String(value);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, seekSec);
    await page.waitForTimeout(Math.max(1500, 3500 - (Date.now() - clicked)));
    await writeFile(join(out, `${kind}.png`), await page.screenshot({ type: 'png' }));
    await page.close();
    console.log(kind, seekSec);
  }
} finally {
  await site.close();
}
