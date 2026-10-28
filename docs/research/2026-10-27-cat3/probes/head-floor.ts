// Prints the lowest fur vertices of a rig GLB that follow the head more than half, in the units of
// the GLB bind pose, so that a head floor can leave the whisker tips out of the head measures.
import { readFileSync } from 'node:fs';
import { readGlb, weldMesh } from '../tools/studio-body.ts';
const glb = readGlb(new Uint8Array(readFileSync(process.argv[2]!)));
const mesh = weldMesh(glb, []);
const rows = mesh.vertices
  .map((v, i) => ({ i, p: v.position, head: v.skin.find(([b]) => b === 'head')?.[1] ?? 0, fur: v.material === 'fur' }))
  .filter((r) => r.fur && r.head > 0.5)
  .toSorted((a, b) => a.p.y - b.p.y);
for (const r of rows.slice(0, Number(process.argv[3] ?? '30'))) {
  console.log(`${r.i}: ${r.p.x.toFixed(4)} ${r.p.y.toFixed(4)} ${r.p.z.toFixed(4)} head ${r.head.toFixed(2)}`);
}
