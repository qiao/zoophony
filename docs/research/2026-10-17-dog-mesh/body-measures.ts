/**
 * Measures a rig GLB file of the dog as the export makes its studio body: the scale, H, the seat,
 * the chair depth, the seated and the standing head tops, the knees, the hips, the vertex that
 * sets the back of the chair, and the ears. Usage:
 *
 *     node docs/research/2026-10-17-dog-mesh/body-measures.ts <rig.glb> <shoulders m>
 */
import { readFileSync } from 'node:fs';

import { unpackStudioMesh, STUDIO_BONES } from '../../../src/models/studio-format.ts';
import { standingBody } from '../../../src/models/studio-rig.ts';
import { studioBody } from '../../../tools/studio-body.ts';

const [file, shoulders] = process.argv.slice(2);
const bytes = new Uint8Array(readFileSync(file ?? ''));
const settings = {
  landmark: 'shoulders' as const,
  height: Number(shoulders),
  seated: true,
  soloist: true,
  constant: 'STUDIO_DOG',
  crease: 35,
};
const { body } = studioBody(bytes, 'scratch', settings);
const mesh = unpackStudioMesh(body.mesh);
const stand = standingBody(body, mesh).mesh;
const count = mesh.positions.length / 3;
const bone = (name: string): number => STUDIO_BONES.indexOf(name as never);
function top(positions: Float32Array): number {
  let y = -Infinity;
  for (let i = 0; i < count; i++) {
    y = Math.max(y, positions[i * 3 + 1] ?? 0);
  }
  return y;
}
function low(positions: Float32Array): number {
  let y = Infinity;
  for (let i = 0; i < count; i++) {
    y = Math.min(y, positions[i * 3 + 1] ?? 0);
  }
  return y;
}
const f = (v: readonly number[]): string => `(${v.map((x) => x.toFixed(3)).join(', ')})`;
console.log(`scale ${body.scale.toFixed(4)} m/u, H ${body.headHeight.toFixed(3)} m, seat ${body.seatHeight?.toFixed(3)} m, chair depth ${body.chairDepth?.toFixed(3)} m`);
console.log(`seated: top ${top(mesh.positions).toFixed(3)} m, lowest ${low(mesh.positions).toFixed(3)} m; standing: top ${top(stand.positions).toFixed(3)} m, lowest ${low(stand.positions).toFixed(3)} m`);
const h = body.heads;
console.log(`seated heads: hips ${f(h.hips)} thigh_L ${f(h.thigh_L)} shin_L ${f(h.shin_L)} foot_L ${f(h.foot_L)} upper_arm_L ${f(h.upper_arm_L)} head ${f(h.head)} neck ${f(h.neck)}`);
console.log(`head center ${f(body.headCenter)} nose ${f(body.nose)} floor ${f(body.floor)}`);
// The knees: the outer and the inner width of the knee band (the vertices of the shins near the knee).
const shin = [bone('shin_L'), bone('shin_R'), bone('thigh_L'), bone('thigh_R')];
let minX = Infinity;
let maxX = -Infinity;
const kneeY = h.shin_L[1];
for (let i = 0; i < count; i++) {
  const y = mesh.positions[i * 3 + 1] ?? 0;
  const x = mesh.positions[i * 3] ?? 0;
  let main = -1;
  let best = -1;
  for (let k = 0; k < 4; k++) {
    const w = mesh.weights[i * 4 + k] ?? 0;
    if (w > best) {
      best = w;
      main = mesh.joints[i * 4 + k] ?? -1;
    }
  }
  if (Math.abs(y - kneeY) < 0.03 && shin.includes(main)) {
    if (x > 0) {
      minX = Math.min(minX, x);
    }
    maxX = Math.max(maxX, Math.abs(x));
  }
}
console.log(`knees at y ${kneeY.toFixed(3)} m: the inner gap ${(2 * minX).toFixed(3)} m, the outer width ${(2 * maxX).toFixed(3)} m, knee joints ${(2 * Math.abs(h.shin_L[0])).toFixed(3)} m apart`);
// The vertices that set the back of the chair: the body, with no tail, below the top of the back.
const tail = [bone('tail'), bone('tail_tip')];
const rows: [number, number, number, string, number][] = [];
for (let i = 0; i < count; i++) {
  let tw = 0;
  let main = -1;
  let best = -1;
  for (let k = 0; k < 4; k++) {
    const w = mesh.weights[i * 4 + k] ?? 0;
    const j = mesh.joints[i * 4 + k] ?? -1;
    if (tail.includes(j)) {
      tw += w;
    }
    if (w > best) {
      best = w;
      main = j;
    }
  }
  const y = mesh.positions[i * 3 + 1] ?? 0;
  if (tw <= 0.5 && y <= (body.seatHeight ?? 0) + 0.5) {
    rows.push([mesh.positions[i * 3 + 2] ?? 0, y, mesh.positions[i * 3] ?? 0, STUDIO_BONES[main] ?? '?', tw]);
  }
}
for (const [z, y, x, b, tw] of rows.toSorted((a, b) => b[0] - a[0]).slice(0, 6)) {
  console.log(`back vertex z ${z.toFixed(3)} y ${y.toFixed(3)} x ${x.toFixed(3)} main ${b} tail ${tw.toFixed(2)}`);
}
