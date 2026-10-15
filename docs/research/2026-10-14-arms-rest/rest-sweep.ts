/**
 * Sweeps only the rest, the lift, and the lower sets of the sweep of a role (`SWEEP_ROLES`) for
 * the players of one species, on the demos of `FIT_DEMOS`, with the hold of the working tree and
 * each variant of `--set` (the syntax of `pnpm pose-depth --set`). It prints the deepest point of
 * each pair of each set over 3 mm, with its demo, its player, its wall time, and its bone. A
 * variant takes about 3 s, because it skips the play set of `pnpm hold-fit`.
 *
 * Usage: ROLE=<role> node docs/research/2026-10-14-arms-rest/rest-sweep.ts <species> [--set <changes>]...
 *
 * The role is `violinist` by default.
 */
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { speciesOf } from '../../../tools/pose-depth.ts';
import { scoreOf } from '../../../src/score/test-score.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { sweepDepths } from '../../../src/pose/test-sweep.ts';
import { SWEEP_ROLES } from '../../../src/pose/test-sweep-roles.ts';

const args = process.argv.slice(2);
const species = args[0];
const variants = [''];
for (let k = 1; k < args.length; k++) {
  if (args[k] === '--set') {
    variants.push(args[++k] ?? '');
  }
}
const demos = ['bach-bwv1050', 'beethoven-8', 'boulanger-matin', 'mozart-k525'];
const role = SWEEP_ROLES[(process.env['ROLE'] ?? 'violinist') as keyof typeof SWEEP_ROLES];
const loaded = (await patchedDemos()).filter((d) => demos.includes(d.file.replace(/\.mid$/, '')));
for (const variant of variants) {
  const { undo, text } = setHolds(variant);
  const worst = new Map<string, { depth: number; where: string }>();
  try {
    for (const demo of loaded) {
      if (!role.hasRole(scoreOf(demo.bytes))) {
        continue;
      }
      const scene = sceneOf(demo.bytes);
      for (const player of role.players(scene)) {
        if (speciesOf(scene, player.model) !== species) {
          continue;
        }
        for (const set of role.sampleSets(scene)) {
          if (set.name === 'play') {
            continue;
          }
          for (const pair of sweepDepths(role, player, set.samples)) {
            const key = `${set.name} ${pair.part}>${pair.into}`;
            const old = worst.get(key);
            if (!old || pair.depth > old.depth) {
              worst.set(key, {
                depth: pair.depth,
                where: `${demo.file} ${player.name} wall ${pair.wall.toFixed(1)} ${pair.bone ?? ''}`,
              });
            }
          }
        }
      }
    }
  } finally {
    undo();
  }
  console.log(`\n${text || 'base'}`);
  for (const [key, { depth, where }] of [...worst].toSorted((a, b) => a[0].localeCompare(b[0]))) {
    if (depth > 0.003) {
      console.log(`  ${key}: ${(depth * 100).toFixed(1)} cm (${where})`);
    }
  }
}
