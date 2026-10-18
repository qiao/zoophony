/**
 * Dumps the bind and posed places, the weights, and the faces near the left shoulder of the
 * trombonist in one play sample and the rest sample: node docs/research/2026-10-18-panda-folds/dump-shoulder.ts <out.json> [--glb <file>]
 */
import { writeFile } from 'node:fs/promises';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
import { FOLD_ROLES, probeFolds } from '../../../tools/fold-probe.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';

const out = process.argv[2] ?? 'scratch/panda-folds/shoulder.json';
const role = FOLD_ROLES.get('trombonist');
if (!role) throw new Error('no role');
const demos = (await patchedDemos()).filter((d) => d.file.startsWith('boulanger'));
const samples: unknown[] = [];
let n = 0;
probeFolds(role, demos, 20, (rig, _studio, posed, folded, set) => {
  n++;
  if (set === 'lift') return;
  if (samples.length >= 3) return;
  const m = rig.mesh;
  const p = m.positions;
  // the center: the middle of face 1147
  const c = [0, 1, 2].map((k) => {
    let s = 0;
    for (let j = 0; j < 3; j++) s += p[3 * (m.corners[3 * 1147 + j] ?? 0) + k] ?? 0;
    return s / 3;
  });
  const keep: number[] = [];
  for (let v = 0; v < p.length / 3; v++) {
    const d = Math.hypot((p[3 * v] ?? 0) - (c[0] ?? 0), (p[3 * v + 1] ?? 0) - (c[1] ?? 0), (p[3 * v + 2] ?? 0) - (c[2] ?? 0));
    if (d < 0.22) keep.push(v);
  }
  const set1 = new Set(keep);
  const faces: number[][] = [];
  for (let f = 0; f < m.corners.length / 3; f++) {
    const cs = [0, 1, 2].map((j) => m.corners[3 * f + j] ?? 0);
    if (cs.every((v) => set1.has(v))) faces.push([f, ...cs]);
  }
  samples.push({
    set,
    folded,
    center: c,
    verts: keep.map((v) => ({
      v,
      bind: [p[3 * v], p[3 * v + 1], p[3 * v + 2]],
      posed: [posed[3 * v], posed[3 * v + 1], posed[3 * v + 2]],
      w: Object.fromEntries(
        [0, 1, 2, 3]
          .filter((k) => (m.weights[4 * v + k] ?? 0) > 0)
          .map((k) => [STUDIO_BONES[m.joints[4 * v + k] ?? 0], Number((m.weights[4 * v + k] ?? 0).toFixed(3))]),
      ),
    })),
    faces,
  });
});
await writeFile(out, JSON.stringify(samples));
console.log(`samples ${n}, kept ${samples.length}`);
