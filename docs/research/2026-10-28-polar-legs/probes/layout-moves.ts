/**
 * Writes the place of each player of each demo in the layout of a tree, so that two trees compare
 * (round `sixth-polar-legs`): a smaller piano can move the other players of the demos with a
 * piano (design 4.2).
 *
 * Usage, from the root of a tree: node <this file> <root of the tree to probe> <out.json>
 *
 * The probe loads the modules of the tree of the first argument, so the same file probes the
 * working tree and a checkout of `main`. `layout-compare.py` compares two outputs.
 */
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(process.argv[2] ?? '.');
const out = resolve(process.argv[3] ?? 'layout.json');
const load = (path: string) => import(pathToFileURL(join(root, path)).href);
const { sceneOf } = await load('src/pose/test-scene.ts');
const { patchedDemos } = await load('tools/patch-demos.ts');

type Place = {
  position: readonly number[];
  facing: number;
  cast: { species: string; instrument: string; seatIndex: number; player: number };
};
const demos: Record<string, { key: string; x: number; z: number }[]> = {};
for (const demo of await patchedDemos()) {
  const scene = sceneOf(demo.bytes);
  demos[demo.file] = (scene.layout.players as Place[]).map((p) => ({
    key: `${p.cast.instrument}/${p.cast.species}/${p.cast.seatIndex}/${p.cast.player}`,
    x: p.position[0] ?? 0,
    z: p.position[2] ?? 0,
  }));
}
writeFileSync(out, JSON.stringify(demos));
console.log(`wrote ${out}: ${Object.keys(demos).length} demos`);
