/**
 * Counts the samples of the sweep of the bassist in which a part of the right arm goes deeper
 * than 1.5 cm and 3 cm into an obstacle, for each set: the paw, the forearm, and the upper arm in
 * the body and in the contrabass. `pnpm pose-depth` gives only the deepest sample of each pair,
 * over both arms.
 *
 * Usage, from the root of the tree:
 *
 *     node docs/research/2026-10-18-hippo-arm/depth-count.ts [--set <changes>]
 */
import { BASSIST_SWEEP } from '../../../src/pose/test-sweep-roles.ts';
import { sweepDepths } from '../../../src/pose/test-sweep.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { scoreOf } from '../../../src/score/test-score.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { setHolds } from '../../../tools/hold-sets.ts';

const args = process.argv.slice(2);
if (args.includes('--set')) {
  setHolds(args[args.indexOf('--set') + 1] ?? '');
}
// The parts of the right arm only.
const role = {
  ...BASSIST_SWEEP,
  parts: BASSIST_SWEEP.parts
    .map((part) => ({ ...part, bones: part.bones.filter((bone) => bone.endsWith('R')) }))
    .filter((part) => part.bones.length > 0),
};
const pairs = [
  'paws body',
  'paws contrabass',
  'forearms body',
  'forearms contrabass',
  'upper arms body',
  'upper arms contrabass',
];
const counts = new Map<string, [samples: number, over: number, deep: number]>();
for (const demo of await patchedDemos()) {
  if (!role.hasRole(scoreOf(demo.bytes))) {
    continue;
  }
  const scene = sceneOf(demo.bytes);
  for (const player of role.players(scene)) {
    for (const { name, samples } of role.sampleSets(scene)) {
      for (const sample of samples) {
        for (const pair of sweepDepths(role, player, [sample])) {
          const key = `${name} ${pair.part} ${pair.into}`;
          if (!pairs.includes(`${pair.part} ${pair.into}`)) {
            continue;
          }
          const count = counts.get(key) ?? [0, 0, 0];
          count[0] += 1;
          count[1] += pair.depth > 0.015 ? 1 : 0;
          count[2] += pair.depth > 0.03 ? 1 : 0;
          counts.set(key, count);
        }
      }
    }
  }
}
for (const [key, [samples, over, deep]] of counts) {
  console.log(`${key}: ${over} of ${samples} samples above 1.5 cm, ${deep} above 3 cm`);
}
