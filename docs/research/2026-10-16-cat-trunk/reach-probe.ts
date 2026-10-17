/**
 * Prints the reach of the footprint of the seated cat, red fox, and rabbit (`playerFootprint()`):
 * the front and the back of all boxes, the half width, and the front of the boxes below 0.3 m.
 * Usage, from the root of the worktree, with a source tree as for `stage-probe.ts`:
 *
 *     node docs/research/2026-10-16-cat-trunk/reach-probe.ts <src dir>
 */
const [src = ''] = process.argv.slice(2);
const { playerFootprint } = await import(`${src}/models/footprint.ts`);
const { buildPlayer } = await import(`${src}/models/player.ts`);
for (const species of ['cat', 'fox-red', 'rabbit']) {
  const fp = playerFootprint(buildPlayer(species, species === 'cat' ? 'viola' : 'violin', 4, 'chair'));
  const boxes: { min: number[]; max: number[] }[] = fp.boxes;
  const front = Math.min(...boxes.map((b) => b.min[2] ?? 0));
  const back = Math.max(...boxes.map((b) => b.max[2] ?? 0));
  const half = Math.max(...boxes.map((b) => Math.max(Math.abs(b.min[0] ?? 0), Math.abs(b.max[0] ?? 0))));
  const low = boxes.filter((b) => (b.max[1] ?? 0) < 0.3);
  const lowFront = Math.min(...low.map((b) => b.min[2] ?? 0));
  console.log(`${species}: front z ${front.toFixed(3)}, back z ${back.toFixed(3)}, half width ${half.toFixed(3)}, front of the boxes below 0.3 m ${lowFront.toFixed(3)}`);
}
