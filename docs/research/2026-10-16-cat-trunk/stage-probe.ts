/**
 * Prints the stage side, each player (seat, species, radius from the podium, angle), and the
 * leg boxes of the seated cat footprint, for the source tree of the first argument.
 * Usage, from the root of the worktree, with the absolute path of a source tree, such as the
 * `src` of the worktree or of `git archive main src demos | tar -x -C <dir>` (with a link to the
 * `node_modules` of the worktree):
 *
 *     node docs/research/2026-10-16-cat-trunk/stage-probe.ts <src dir> boulanger-matin
 */
import { readFileSync } from 'node:fs';

const [src = '', demo = 'boulanger-matin'] = process.argv.slice(2);
const { layoutScene } = await import(`${src}/models/layout-scene.ts`);
const { ModelCache } = await import(`${src}/models/model-cache.ts`);
const { playerFootprint } = await import(`${src}/models/footprint.ts`);
const { buildPlayer } = await import(`${src}/models/player.ts`);
const { scoreOf } = await import(`${src}/score/test-score.ts`);
const { patchedDemos } = await import(`../../../tools/patch-demos.ts`);
let bytes: Uint8Array;
if (patchedDemos) {
  const demos = await patchedDemos();
  bytes = demos.find((d: { file: string }) => d.file.startsWith(demo)).bytes;
} else {
  bytes = readFileSync(`demos/src/${demo}.mid`);
}
const layout = layoutScene(scoreOf(bytes), new ModelCache());
console.log(`stage side ${layout.stageSide.toFixed(3)}`);
for (const p of layout.players) {
  const [x, , z] = p.position;
  const r = Math.hypot(x - layout.podium[0], z - layout.podium[2]);
  const a = (Math.atan2(x - layout.podium[0], -(z - layout.podium[2])) * 180) / Math.PI;
  console.log(`${p.cast.seatIndex}.${p.cast.player} ${p.cast.species} ${p.cast.instrument}: r ${r.toFixed(3)} angle ${a.toFixed(2)} at (${x.toFixed(3)}, ${z.toFixed(3)})`);
}
const fp = playerFootprint(buildPlayer('cat', 'viola', 4, 'chair'));
console.log(JSON.stringify(fp).slice(0, 300));
