/**
 * Counts the players and the strikes of each percussion part of each demo and tool score.
 * Usage: node docs/research/2026-10-20-badger-mesh/part-use.ts
 */
import { probeDemos } from '../../../tools/probe-demos.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';

const totals = new Map<string, number>();
for (const demo of await probeDemos()) {
  const scene = sceneOf(demo.bytes);
  const out: string[] = [];
  for (const [i, place] of scene.layout.players.entries()) {
    const { species, instrument } = place.cast;
    if (species !== 'badger') continue;
    const plan = scene.plan.players[i]!;
    let strikes = 0;
    if (plan.note.family === 'percussion') {
      strikes = (plan.note.left?.starts.length ?? 0) + (plan.note.right?.starts.length ?? 0);
    }
    out.push(`${instrument} (seat ${place.cast.seatIndex}, ${place.cast.support}): ${strikes} hand strikes`);
    totals.set(instrument, (totals.get(instrument) ?? 0) + strikes);
  }
  console.log(`${demo.file} (${scene.layout.players.length} players): ${out.length ? out.join('; ') : 'no badger'}`);
}
console.log('totals:', [...totals.entries()].map(([k, v]) => `${k} ${v}`).join(', '));
