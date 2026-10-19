/** Prints the corners, the weights, and the neighbors of some faces of the hippo studio mesh. */
import { studioRigOf } from '../../../../src/models/studio-body.ts';
import { STUDIO_BONES } from '../../../../src/models/studio-format.ts';
const rig = studioRigOf('studio-hippo', true);
const m = rig.mesh;
const faces = process.argv.slice(2).map(Number);
const corners = (f: number): number[] => [0, 1, 2].map((k) => m.corners[f * 3 + k] ?? -1);
const nf = m.corners.length / 3;
for (const f of faces) {
  const c = corners(f);
  const w = c.map((v) => [0, 1, 2, 3].filter((k) => (m.weights[v * 4 + k] ?? 0) > 0.005).map((k) => `${STUDIO_BONES[m.joints[v * 4 + k] ?? 0]} ${(m.weights[v * 4 + k] ?? 0).toFixed(2)}`).join(' '));
  const nb: number[] = [];
  for (let g = 0; g < nf; g++) if (g !== f && corners(g).filter((v) => c.includes(v)).length >= 1) nb.push(g);
  console.log(`face ${f}: corners ${c.join(',')} | ${w.join(' | ')} | neighbors ${nb.join(',')}`);
}
