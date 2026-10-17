/**
 * Measures the time of `preparePoses()` of `src/pose/plan.ts` for each demo (research of 2026-10-17,
 * round `left-hand`): the best of three runs after one warm run, in ms.
 *
 * Usage, from the root of a tree: `node docs/research/2026-10-17-left-hand/prepare-time.ts [<demo>]...`
 */
import { ModelCache } from '../../../src/models/model-cache.ts';
import { layoutScene } from '../../../src/models/layout-scene.ts';
import { preparePoses } from '../../../src/pose/plan.ts';
import { scoreOf } from '../../../src/score/test-score.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';

const ids = process.argv.slice(2);
for (const demo of await patchedDemos()) {
  const id = demo.file.replace(/\.mid$/, '');
  if (ids.length > 0 && !ids.includes(id)) continue;
  const score = scoreOf(demo.bytes);
  const models = new ModelCache();
  const layout = layoutScene(score, models);
  preparePoses(score, layout, 1, models);
  const times: number[] = [];
  for (let k = 0; k < 3; k++) {
    const t0 = performance.now();
    preparePoses(score, layout, 1, models);
    times.push(performance.now() - t0);
  }
  console.log(id, Math.min(...times).toFixed(0), 'ms');
}
