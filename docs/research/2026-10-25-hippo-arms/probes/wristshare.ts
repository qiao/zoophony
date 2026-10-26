/**
 * Prints the share of the wrist helper on the vertices of each arm of the hippo module, by the
 * main bone of the vertex. Usage: node docs/research/2026-10-25-hippo-arms/probes/wristshare.ts
 */
import { STUDIO_HIPPO } from '../../../../src/models/studio/hippo.ts';
import { STUDIO_BONES, unpackStudioMesh } from '../../../../src/models/studio-format.ts';

const body = STUDIO_HIPPO as unknown as { mesh: string; palette?: string };
const mesh = unpackStudioMesh(body.mesh, body.palette);
const count = mesh.positions.length / 3;
for (const side of ['L', 'R']) {
  const rows = new Map<string, { n: number; sum: number; over: number }>();
  for (let v = 0; v < count; v++) {
    let main = '';
    let best = 0;
    let wrist = 0;
    for (let k = 0; k < 4; k++) {
      const bone = STUDIO_BONES[mesh.joints[v * 4 + k] ?? 0] ?? '';
      const w = mesh.weights[v * 4 + k] ?? 0;
      if (bone === `wrist_${side}`) wrist += w;
      if (w > best && bone !== `wrist_${side}`) {
        best = w;
        main = bone;
      }
    }
    if (!main.endsWith(`_${side}`) || !/forearm|hand|fingers/.test(main)) continue;
    const row = rows.get(main) ?? { n: 0, sum: 0, over: 0 };
    row.n += 1;
    row.sum += wrist;
    row.over += wrist > 0.3 ? 1 : 0;
    rows.set(main, row);
  }
  for (const [bone, r] of [...rows].sort()) {
    console.log(`${bone}: ${r.n} vertices, mean wrist ${(r.sum / r.n).toFixed(3)}, over 0.3: ${r.over}`);
  }
}
