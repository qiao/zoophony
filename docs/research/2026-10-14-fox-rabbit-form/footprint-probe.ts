/**
 * Prints the bounds of the footprint of the seated rabbit and the seated red fox with the violin
 * of a source tree: x across, z front to back, in meters. Usage, from this folder:
 *
 *     node footprint-probe.ts [<root of a source tree>]
 */
const root = process.argv[2] ?? '../../..';
const { buildPlayer } = await import(`${root}/src/models/player.ts`);
const { playerFootprint } = await import(`${root}/src/models/footprint.ts`);
for (const species of ['rabbit', 'fox-red']) {
  const { bounds } = playerFootprint(buildPlayer(species, 'violin', 4, 'chair'));
  const f = (v: readonly number[]): string => v.map((x) => x.toFixed(3)).join(', ');
  const size = [0, 1, 2].map((k) => (bounds.max[k] ?? 0) - (bounds.min[k] ?? 0));
  console.log(`${species}: min (${f(bounds.min)}) max (${f(bounds.max)}) size (${f(size)})`);
}
