/**
 * Counts the strikes of each kettle by each hand of the timpanist of each demo.
 * Usage: node docs/research/2026-10-19-elephant-pose/kettle-use.ts [--set <changes>]
 */
import { setHolds } from '../../../tools/hold-sets.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { placePoint } from '../../../src/models/instruments/hold.ts';

const i = process.argv.indexOf('--set');
const changes = i > 0 ? setHolds(process.argv[i + 1] ?? '') : null;
for (const demo of await patchedDemos()) {
  const scene = sceneOf(demo.bytes);
  const index = scene.layout.players.findIndex((p) => p.cast.instrument === 'timpani');
  if (index < 0) continue;
  const plan = scene.plan.players[index]!;
  const place = scene.layout.players[index]!;
  if (plan.note.family !== 'percussion') continue;
  const { species, instrument, kettles, support } = place.cast;
  const model = scene.models.get(species, instrument, kettles, support);
  const centers = model.instrument.targets.filter((t) => t.kind === 'head').map((t) => placePoint(model.pieces, { bone: t.bone, at: t.from }));
  const out: string[] = [];
  for (const side of ['L', 'R'] as const) {
    const track = side === 'L' ? plan.note.left : plan.note.right;
    if (!track) continue;
    const count = centers.map(() => 0);
    for (let k = 0; k < track.starts.length; k++) {
      const x = track.points[3 * k]!, z = track.points[3 * k + 2]!;
      let best = 0, d = Infinity;
      for (const [j, c] of centers.entries()) {
        const e = Math.hypot(x - c[0], z - c[2]);
        if (e < d) { d = e; best = j; }
      }
      count[best]!++;
    }
    out.push(`${side}: ${count.map((c, j) => `k${j} ${c}`).join(', ')}`);
  }
  console.log(`${demo.file} (${kettles} kettles): ${out.join('; ')}`);
}
changes?.undo();
