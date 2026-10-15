// Writes the shot plans of each demo and of each chamber test file as JSON, for a compare of two
// trees. Run it from the root of a worktree: node docs/research/2026-10-14-probe-retro/plans.ts <out>.
// Run it on main and on the branch, and compare the two files with cmp.
import { writeFileSync } from 'node:fs';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { buildScore } from '../../../src/score/score.ts';
import { layoutScene } from '../../../src/models/layout-scene.ts';
import { ModelCache } from '../../../src/models/model-cache.ts';
import { prepareShots, SHOT_SEED } from '../../../src/shots/prepare.ts';
import { writeSmf } from '../../../src/midi/test-smf.ts';
import { stringQuartetFile, violinPianoDuoFile, windQuintetFile } from '../../../src/models/test-chamber.ts';
import { pianoSoloFile } from '../../../src/score/test-audit-files.ts';

const out: Record<string, unknown> = {};
const files: [string, Uint8Array][] = (await patchedDemos()).map((d) => [d.file, d.bytes]);
files.push(['piano-solo', writeSmf(pianoSoloFile())], ['violin-piano', writeSmf(violinPianoDuoFile())], ['string-quartet', writeSmf(stringQuartetFile())], ['wind-quintet', writeSmf(windQuintetFile())]);
const started = performance.now();
for (const [file, bytes] of files) {
  const result = buildScore(bytes, 'auto');
  if (!result.ok) throw new Error(file);
  const models = new ModelCache();
  const t = performance.now();
  out[file] = prepareShots(result.score, layoutScene(result.score, models), SHOT_SEED, models).shots;
  console.log(file, ((performance.now() - t) / 1000).toFixed(2), 's');
}
console.log('total', ((performance.now() - started) / 1000).toFixed(1));
writeFileSync(process.argv[2] ?? 'plans.json', JSON.stringify(out));
