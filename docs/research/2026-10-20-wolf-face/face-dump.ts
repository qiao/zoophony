/** Dumps the head faces of the studio wolf in the units of the rig config (studio axes). */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FINISH_ORDER } from '../../../src/models/mesh.ts';
import { STUDIO_BONES, STUDIO_INFLUENCES, unpackStudioMesh } from '../../../src/models/studio-format.ts';

const { STUDIO_WOLF } = (await import(resolve(process.argv[2] ?? 'src/models/studio/wolf.ts'))) as typeof import('../../../src/models/studio/wolf.ts');
const config = JSON.parse(readFileSync(process.argv[3] ?? 'tools/mesh-rigs/wolf.json', 'utf8'));
const mesh = unpackStudioMesh(STUDIO_WOLF.mesh);
const head = STUDIO_BONES.indexOf('head');
const s = STUDIO_WOLF.scale;
const h = STUDIO_WOLF.heads.head;
const j = config.joints.head.head as number[];
const conv = (x: number, y: number, z: number): number[] => [
  -(x - h[0]) / s + j[0]!,
  (y - h[1]) / s + j[1]!,
  -(z - h[2]) / s + j[2]!,
];
const share = (v: number): number => {
  let w = 0;
  for (let k = 0; k < STUDIO_INFLUENCES; k++) {
    if (mesh.joints[v * STUDIO_INFLUENCES + k] === head) w += mesh.weights[v * STUDIO_INFLUENCES + k] ?? 0;
  }
  return w;
};
const out = [];
for (let t = 0; t < mesh.corners.length / 3; t++) {
  const cs = [0, 1, 2].map((k) => mesh.corners[t * 3 + k] ?? 0);
  if (!cs.every((c) => share(c) > 0.5)) continue;
  out.push({
    t,
    p: cs.map((c) => conv(mesh.positions[c * 3]!, mesh.positions[c * 3 + 1]!, mesh.positions[c * 3 + 2]!)),
    c: [mesh.colors[t * 3], mesh.colors[t * 3 + 1], mesh.colors[t * 3 + 2]],
    f: FINISH_ORDER[mesh.finishes[t] ?? 0],
  });
}
writeFileSync(process.argv[4] ?? 'faces.json', JSON.stringify({ eyes: [conv(...(STUDIO_WOLF.heads.eye_L as [number, number, number])), conv(...(STUDIO_WOLF.heads.eye_R as [number, number, number]))], faces: out }));
console.log(out.length);
