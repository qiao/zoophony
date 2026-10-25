/**
 * Prints the deepest point of each arm bone and the instrument in each obstacle for the players of
 * one species of a string role, in each sample set, for each variant of `--set`: the sweep of
 * `pnpm pose-depth <role> --per-bone`, with the species apart (the violinist role sweeps the rabbit
 * and the red fox together). Only the pairs with a depth of 0.5 cm or more print.
 *
 * Usage: node docs/research/2026-10-25-string-angle/species-depth.ts <rabbit|fox-red|cat>
 *   [--demo <id>]... [--every <n>] [--set <changes>]...
 */
import type { SpeciesId } from '../../../src/models/species.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../../../src/pose/test-sweep-roles.ts';
import { sweepDepths } from '../../../src/pose/test-sweep.ts';
import { patchedDemo } from '../../../tools/patch-demos.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { perBoneRole } from '../../../tools/pose-depth.ts';

const args = process.argv.slice(2);
const species = (args[0] ?? 'cat') as SpeciesId;
const all = (flag: string): string[] =>
  args.flatMap((a, i) => (a === flag && args[i + 1] !== undefined ? [args[i + 1] ?? ''] : []));
const every = Number(all('--every')[0] ?? '2');
const demos = all('--demo');
const variants = ['', ...all('--set')];
const roleName = species === 'cat' ? 'violist' : 'violinist';

for (const variant of variants) {
  const changes = setHolds(variant);
  const role = perBoneRole(SWEEP_ROLES[roleName]);
  const deepest = new Map<string, { depth: number; at: string }>();
  for (const demo of demos) {
    const scene = sceneOf((await patchedDemo(`${demo}.mid`)).bytes);
    const players = role.players(scene).filter((p) => {
      const index = Number(/(\d+)/.exec(p.name)?.[1] ?? -1);
      return scene.layout.players[index]?.cast.species === species;
    });
    for (const set of role.sampleSets(scene)) {
      const samples = set.samples.filter((_, i) => set.name !== 'play' || i % every === 0);
      for (const player of players) {
        for (const pair of sweepDepths(role, player, samples)) {
          const key = `${set.name} ${pair.part}>${pair.into}`;
          const old = deepest.get(key);
          if (!old || pair.depth > old.depth) {
            const time = set.name === 'play' ? `${pair.song.toFixed(2)} s` : `wall ${pair.wall.toFixed(2)} s`;
            deepest.set(key, { depth: pair.depth, at: `${demo} ${time}` });
          }
        }
      }
    }
  }
  console.log(`${species} | ${variant || 'base'}`);
  for (const [key, { depth, at }] of [...deepest].toSorted((a, b) => a[0].localeCompare(b[0]))) {
    if (depth >= 0.005) {
      console.log(`  ${key} ${(depth * 100).toFixed(1)} cm (${at})`);
    }
  }
  changes.undo();
}
