// The footprint bounds of the harp player: SET='<changes>' node docs/research/2026-10-25-harp-lean/probes/foot.ts
import { setHolds } from '../../../../tools/hold-sets.ts';
import { probeDemos } from '../../../../tools/probe-demos.ts';
import { sceneOf } from '../../../../src/pose/test-scene.ts';
import { playerFootprint } from '../../../../src/models/footprint.ts';

const sets = process.env['SET'] ?? '';
if (sets) setHolds(sets);
const demo = (await probeDemos()).find((d) => d.file === 'boulanger-matin.mid')!;
const scene = sceneOf(demo.bytes);
const place = scene.layout.players.find((p) => p.cast.instrument === 'harp')!;
const { species, instrument, kettles, support } = place.cast;
const model = scene.models.get(species, instrument, kettles, support);
const f = playerFootprint(model);
for (const b of f.boxes) {
  console.log('box', b.min.map((v: number) => v.toFixed(2)).join(' '), '|', b.max.map((v: number) => v.toFixed(2)).join(' '));
}
console.log('min', f.bounds.min.map((v: number) => v.toFixed(3)).join(' '), 'max', f.bounds.max.map((v: number) => v.toFixed(3)).join(' '));
