/**
 * Usage: node docs/research/2026-10-17-grip-all/layout-dump.ts <demo>. layout-main.txt ran on a copy of
 * main 35121846, and layout-branch.txt on the branch at 75d0e67c, both for bach-bwv1050.
 *
 * Prints the layout of each player of a demo: the place, the turn, and the look, as JSON lines. */
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { patchedDemo } from '../../../tools/patch-demos.ts';

const scene = sceneOf((await patchedDemo(`${process.argv[2]}.mid`)).bytes);
for (const [i, p] of scene.layout.players.entries()) {
  const rest = { ...p } as Record<string, unknown>;
  delete rest['cast'];
  console.log(i, p.cast.species, JSON.stringify(rest, (_, v) => (typeof v === 'number' ? Math.round(v * 1e4) / 1e4 : v)).slice(0, 400));
}
