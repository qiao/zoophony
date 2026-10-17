/**
 * Prints, for the first rest sample of the violist in K. 525, the corrective weights, the folded
 * faces with and with no corrective shapes, and the bind place, the posed place, the bones, and the
 * corrective moves of each corner of the faces that fold most. Usage:
 *
 *     node docs/research/2026-10-16-cat-mesh/face-probe.ts
 */
import { FOLD_ROLES, foldedFaces, probeFolds } from '../../../tools/fold-probe.ts';
import { patchedDemo } from '../../../tools/patch-demos.ts';
import { skinStudioMesh } from '../../../src/models/studio-rig.ts';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';

const role = FOLD_ROLES.get('violist')!;
const demo = await patchedDemo('mozart-k525.mid');
const faces = [187, 204, 205, 250, 2007, 2009, 2118];
let done = false;
probeFolds(role, [demo], 50, (rig, studio, posed, folded, set) => {
  if (done || set !== 'rest') return;
  done = true;
  console.log('correctives', Array.from(studio.correctives).map((x) => x.toFixed(2)).join(' '));
  const zero = { ...studio, correctives: new Float32Array(studio.correctives.length) };
  const posed0 = skinStudioMesh(rig.mesh, zero);
  const f0 = new Set(foldedFaces(rig.mesh, studio.matrices, posed0));
  console.log('folded with correctives', folded.length, 'without', f0.size);
  console.log('folded', folded.join(' '));
  console.log('folded no correctives', [...f0].join(' '));
  const m = rig.mesh;
  for (const f of faces) {
    const cs = [0, 1, 2].map((k) => m.corners[f * 3 + k] ?? 0);
    console.log(`face ${f} folded ${folded.includes(f)} no-corr ${f0.has(f)}`);
    for (const v of cs) {
      const w = [0, 1, 2, 3].map((j) => `${STUDIO_BONES[m.joints[v * 4 + j] ?? 0]} ${(m.weights[v * 4 + j] ?? 0).toFixed(2)}`).filter((t) => !t.endsWith(' 0.00'));
      const corr = m.correctives.map((c) => Math.hypot(c[v * 3] ?? 0, c[v * 3 + 1] ?? 0, c[v * 3 + 2] ?? 0).toFixed(3));
      console.log(`  v ${v} bind ${[0, 1, 2].map((i) => (m.positions[v * 3 + i] ?? 0).toFixed(3)).join(',')} posed ${[0, 1, 2].map((i) => (posed[v * 3 + i] ?? 0).toFixed(3)).join(',')} ${w.join(', ')} corr ${corr.join(' ')}`);
    }
  }
}, ['rest']);
