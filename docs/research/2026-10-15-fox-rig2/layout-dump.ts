// Probe: dumps the footprint boxes of the fox players (by bone and band) and the layout of the
// demos. Usage: node docs/research/2026-10-15-fox-rig2/layout-dump.ts <out.json>
import { writeFileSync } from 'node:fs';

import { layoutScene } from '../../../src/models/layout-scene.ts';
import { ModelCache } from '../../../src/models/model-cache.ts';
import { INSTRUMENT_SUPPORTS } from '../../../src/models/player.ts';
import { BONE_NAMES } from '../../../src/models/rig.ts';
import { scoreOf } from '../../../src/score/test-score.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';

const [out = 'scratch/logs/layout.json'] = process.argv.slice(2);
const models = new ModelCache();
const r = (v: number): number => Math.round(v * 1e4) / 1e4;
const players: Record<string, Record<string, number[]>> = {};
for (const [species, instrument] of [
  ['fox-red', 'violin'],
  ['fox-tan', 'flute'],
] as const) {
  const model = models.get(species, instrument, 4, INSTRUMENT_SUPPORTS[instrument]);
  const { bones, positions } = model.mesh;
  const boxes: Record<string, number[]> = {};
  for (let t = 0; t < positions.length / 9; t++) {
    const y = ((positions[t * 9 + 1] ?? 0) + (positions[t * 9 + 4] ?? 0) + (positions[t * 9 + 7] ?? 0)) / 3;
    const key = `${BONE_NAMES[bones[t * 3] ?? 0]}@${Math.floor(y / 0.2)}`;
    const box = boxes[key] ?? [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (let i = t * 9; i < t * 9 + 9; i++) {
      const k = i % 3;
      box[k] = Math.min(box[k] ?? 0, positions[i] ?? 0);
      box[k + 3] = Math.max(box[k + 3] ?? 0, positions[i] ?? 0);
    }
    boxes[key] = box;
  }
  players[`${species}:${instrument}`] = Object.fromEntries(
    Object.entries(boxes)
      .toSorted(([a], [b]) => a.localeCompare(b))
      .map(([k, b]) => [k, b.map(r)]),
  );
}
const stages: Record<string, unknown> = {};
for (const demo of await patchedDemos()) {
  const layout = layoutScene(scoreOf(demo.bytes), models);
  stages[demo.file] = {
    side: r(layout.stageSide),
    players: layout.players.map(
      (p) => `${p.cast.species}:${p.cast.instrument} ${p.position.map(r).join(',')} ${r(p.facing)}`,
    ),
  };
}
writeFileSync(out, JSON.stringify({ players, stages }, null, 1));
console.log('wrote', out);
