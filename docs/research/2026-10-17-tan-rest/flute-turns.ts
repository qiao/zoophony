/**
 * Prints the turn of the `instrument` bone of the resting flute of the tan fox for other angles of
 * `fluteTurn()` of `src/pose/winds.ts` (the forward angle and the down angle, with the keys of
 * `FOX_FLUTE.rest`), one line for each pair, as `<forward>,<down> <quaternion>`. The lines give the
 * `--set "flute@fox-tan.rest=<quaternion>"` options of `flute-tilt.txt`. Usage, from the root of
 * the worktree:
 *
 *     node docs/research/2026-10-17-tan-rest/flute-turns.ts
 */
import { fluteTurn } from '../../../src/pose/winds.ts';
for (const [f, d] of [[-136, 84], [-136, 88], [-120, 80], [-150, 80], [-120, 84], [-150, 84], [-100, 80], [-170, 80]]) {
  console.log(`${f},${d}`, fluteTurn(f!, d!, [-0.545, 0, 0.839]).map((v) => v.toFixed(4)).join(','));
}
