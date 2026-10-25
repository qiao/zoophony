/**
 * Prints the largest move of a seat of each species in the layout of each demo when the cat plays
 * the viola of the app in place of its 1/2 viola: the smaller viola gives the cat a smaller
 * footprint, so the rows of the strings move (design 4.2), and the other players turn with them.
 *
 * Usage: node docs/research/2026-10-25-string-angle/layout-move.ts
 */
import { probeDemos } from '../../../tools/probe-demos.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { setHolds } from '../../../tools/hold-sets.ts';

const largest = new Map<string, number>();
for (const { bytes } of await probeDemos()) {
  const now = sceneOf(bytes).layout.players;
  const undo = setHolds('cat.violaScale=1');
  const before = sceneOf(bytes).layout.players;
  undo.undo();
  now.forEach((player, i) => {
    const old = before[i];
    if (!player || !old) {
      return;
    }
    const [x, , z] = player.position;
    const [ox, , oz] = old.position;
    const move = Math.hypot(x - ox, z - oz);
    const key = player.cast.species;
    largest.set(key, Math.max(largest.get(key) ?? 0, move));
  });
}
for (const [species, move] of [...largest].toSorted((a, b) => b[1] - a[1])) {
  console.log(`${species.padEnd(12)} ${(move * 100).toFixed(1)} cm`);
}
