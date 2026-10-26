/**
 * Prints the corners, places, and weights of named faces of the hippo studio module.
 * Usage: node docs/research/2026-10-25-hippo-arms/probes/faceweights.ts <face>...
 */
import { STUDIO_HIPPO } from '../../../../src/models/studio/hippo.ts';
import { unpackStudioMesh } from '../../../../src/models/studio-format.ts';
import { faceFacts } from '../../../../tools/fold-probe.ts';

const body = STUDIO_HIPPO as unknown as { mesh: string; palette?: string };
const mesh = unpackStudioMesh(body.mesh, body.palette);
for (const face of process.argv.slice(2).map(Number)) {
  const facts = faceFacts(mesh, face);
  console.log(`face ${face} middle ${facts.middle.map((x) => x.toFixed(3)).join(', ')}`);
  for (let k = 0; k < 3; k++) {
    const v = mesh.corners[face * 3 + k] ?? 0;
    const p = [0, 1, 2].map((a) => (mesh.positions[v * 3 + a] ?? 0).toFixed(3)).join(', ');
    const w = (facts.weights[k] ?? []).map((e) => `${e.bone} ${e.weight.toFixed(2)}`).join(' ');
    console.log(`  v${v} [${p}] ${w}`);
  }
}
