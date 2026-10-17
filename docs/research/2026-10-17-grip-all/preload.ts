/**
 * Sets bow grips in memory before a tool of the repository runs, so that `pnpm hold-fit` and the
 * other tools measure a grip with no change of `src/models/species.ts`. The variable GRIPS holds
 * `<species>:<x>,<y>,<z>,<deg>` items separated by spaces.
 *
 * Usage, from the root of the worktree:
 *
 *     GRIPS="rabbit:-0.0084,0.0058,0.0007,40" node --import ./docs/research/2026-10-17-grip-all/preload.ts \
 *       tools/hold-fit.ts violinist --sets lift --demo boulanger-matin --demo bach-bwv1050
 */
import { applyGrips } from './grip-set.ts';

const grips = (process.env['GRIPS'] ?? '').split(' ').filter((g) => g.length > 0);
if (grips.length > 0) {
  console.log('preload grips', applyGrips(grips.flatMap((g) => ['--grip', g])).join(' '));
}
