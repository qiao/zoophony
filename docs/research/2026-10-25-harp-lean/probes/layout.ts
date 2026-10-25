// The seat places of a demo: SET='<changes>' node docs/research/2026-10-25-harp-lean/probes/layout.ts [demo]
import { setHolds } from '../../../../tools/hold-sets.ts';
import { probeDemos } from '../../../../tools/probe-demos.ts';
import { sceneOf } from '../../../../src/pose/test-scene.ts';

const sets = process.env['SET'] ?? '';
if (sets) setHolds(sets);
const id = process.argv[2] ?? 'boulanger-matin';
const demo = (await probeDemos()).find((d) => d.file === `${id}.mid`)!;
const scene = sceneOf(demo.bytes);
for (const [i, p] of scene.layout.players.entries()) {
  const v = p as unknown as { position?: number[]; place?: { position: number[] } };
  console.log(i, p.cast.species, p.cast.instrument, JSON.stringify(v.position ?? v.place ?? Object.keys(p)));
}
