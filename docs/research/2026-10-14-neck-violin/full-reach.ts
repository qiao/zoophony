/**
 * Prints the reach that a violin of each scale needs by the rule of a violin shop (the distance
 * from the left shoulder joint to the scroll), and the arm factor that gives it, for the rabbit
 * and the red fox, with the hold of the working tree and each variant of `--set`.
 *
 * Usage, from the root of the worktree: node docs/research/2026-10-14-neck-violin/full-reach.ts
 * [--set '<changes>']...
 */
import { readFileSync } from 'node:fs';

import { violinReachAt } from '../../../tools/hold-reach.ts';
import { setHolds } from '../../../tools/hold-sets.ts';

const sets = process.argv.flatMap((a, i) => (process.argv[i - 1] === '--set' ? [a] : []));
// The arm factor of each rig config, and the paw, from the reach with and with no factor (the
// report of the form round). The arm of factor 1 is the arm with no paw over the factor.
const factorOf = (animal: string): number =>
  (JSON.parse(readFileSync(`tools/mesh-rigs/${animal}.json`, 'utf8')) as { armFactor: number })
    .armFactor;
const ARMS = {
  rabbit: { factor: factorOf('rabbit'), paw: 0.036 },
  'fox-red': { factor: factorOf('fox'), paw: 0.039 },
};
for (const variant of ['', ...sets]) {
  const changes = variant ? setHolds(variant) : null;
  console.log(`${variant || 'base'}:`);
  for (const species of ['rabbit', 'fox-red'] as const) {
    const now = violinReachAt(species, 'chair', 1);
    const arm = ARMS[species];
    const bare = (now.arms.L - arm.paw) / arm.factor;
    const rows = [0.7, 0.8, 0.9, 1].map((s) => {
      const r = violinReachAt(species, 'chair', s).scroll;
      return `${s.toFixed(2)}: reach ${r.toFixed(3)} m, factor ${((r - arm.paw) / bare).toFixed(3)}`;
    });
    console.log(`  ${species} (arm L ${now.arms.L.toFixed(3)} m, bare ${bare.toFixed(4)} m): ${rows.join('; ')}`);
  }
  changes?.undo();
}
