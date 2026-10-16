// Prints the music stands of each demo with the layout of a source tree: the stage side, and the
// count of the stands at each desk height with the species of the players next to each stand.
// The desk height of `main` is 1.05 m for each stand. Usage, from the root of the worktree:
//
//     node docs/research/2026-10-16-seat-rest/stand-probe.ts [<root of a source tree>]
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = pathToFileURL(resolve(process.argv[2] ?? '.')).href;
const { patchedDemos } = await import(`${root}/tools/patch-demos.ts`);
const { scoreOf } = await import(`${root}/src/score/test-score.ts`);
const { layoutScene } = await import(`${root}/src/models/layout-scene.ts`);
const { ModelCache } = await import(`${root}/src/models/model-cache.ts`);
for (const demo of await patchedDemos()) {
  const layout = layoutScene(scoreOf(demo.bytes), new ModelCache());
  const heights = new Map<string, Map<string, number>>();
  for (const stand of layout.stands) {
    // The readers sit behind the stand: the players within 1.1 m of it.
    const near = layout.players
      .map((p: { position: number[]; cast: { species: string } }) => ({
        species: p.cast.species,
        d: Math.hypot(p.position[0] - stand.position[0], p.position[2] - stand.position[2]),
      }))
      .filter((p: { d: number }) => p.d < 1.1)
      .toSorted((a: { d: number }, b: { d: number }) => a.d - b.d)
      .slice(0, 2)
      .map((p: { species: string }) => p.species);
    const key = (stand.deskHeight ?? 1.05).toFixed(3);
    const bySpecies = heights.get(key) ?? new Map<string, number>();
    const label = [...new Set(near)].join('+') || '?';
    bySpecies.set(label, (bySpecies.get(label) ?? 0) + 1);
    heights.set(key, bySpecies);
  }
  const text = [...heights.entries()]
    .toSorted(([a], [b]) => Number(a) - Number(b))
    .map(([h, by]) => `${h} m: ${[...by.entries()].map(([s, n]) => `${s} ${n}`).join(', ')}`)
    .join('; ');
  console.log(`${demo.file} side ${layout.stageSide.toFixed(3)}: ${text}`);
}
