// Hashes the shot plans of all demos, and the plans of traceShots(), for item 4 of the report.
// Run it from the repository root: node docs/research/2026-10-15-fit-retro/plan-hash.ts

import { createHash } from 'node:crypto';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { buildScore } from '../../../src/score/score.ts';
import { layoutScene } from '../../../src/models/layout-scene.ts';
import { ModelCache } from '../../../src/models/model-cache.ts';
import { prepareShots, traceShots, SHOT_SEED } from '../../../src/shots/prepare.ts';

const hash = createHash('sha256');
const traced = createHash('sha256');
for (const demo of await patchedDemos()) {
  const result = buildScore(demo.bytes, 'auto');
  if (!result.ok) continue;
  const models = new ModelCache();
  const layout = layoutScene(result.score, models);
  const plan = prepareShots(result.score, layout, SHOT_SEED, models);
  hash.update(demo.file).update(JSON.stringify(plan));
  const trace = traceShots(result.score, layout, SHOT_SEED, { fromSec: -Infinity, toSec: Infinity }, models);
  traced.update(JSON.stringify(trace.plan));
}
console.log('plans', hash.digest('hex'));
console.log('traced plans', traced.digest('hex'));
