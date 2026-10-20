// Measures the eye places of a studio body in the front view, as ref-eyes.py does on the sheet:
// the eye spacing and the height of the eye bones above the nose tip, over the width of the head
// at the row of the eyes (a cut of the head faces at that height), in an orthographic front view.
// Usage: node docs/research/2026-10-20-bear-eyes/app-eyes.ts <animal> [<studio dir>]
import { resolve } from 'node:path';
import { Vector3 } from 'three';
import { STUDIO_BONES, unpackStudioMesh } from '../../../src/models/studio-format.ts';
import type { StudioBody } from '../../../src/models/studio-format.ts';

const animal = process.argv[2] ?? 'bear';
const dir = resolve(process.argv[3] ?? 'src/models/studio');
const body = Object.values((await import(resolve(dir, `${animal}.ts`))) as Record<string, StudioBody>)[0]!;
const mesh = unpackStudioMesh(body.mesh);
const HEAD = STUDIO_BONES.indexOf('head');
const [l, r] = [new Vector3(...body.heads.eye_L), new Vector3(...body.heads.eye_R)];
const row = (l.y + r.y) / 2;
let lo = Infinity;
let hi = -Infinity;
for (let t = 0; t < mesh.corners.length / 3; t++) {
  const c = [0, 1, 2].map((k) => mesh.corners[t * 3 + k] ?? 0);
  const on = (v: number) => [0, 1, 2, 3].reduce((w, k) => w + (mesh.joints[v * 4 + k] === HEAD ? (mesh.weights[v * 4 + k] ?? 0) : 0), 0) > 0.5;
  if (!c.every(on)) continue;
  const p = c.map((v) => new Vector3().fromArray(mesh.positions, v * 3));
  for (let k = 0; k < 3; k++) {
    const a = p[k]!;
    const b = p[(k + 1) % 3]!;
    if ((a.y - row) * (b.y - row) <= 0 && a.y !== b.y) {
      const x = a.x + ((row - a.y) / (b.y - a.y)) * (b.x - a.x);
      lo = Math.min(lo, x);
      hi = Math.max(hi, x);
    }
  }
}
const width = hi - lo;
const h = body.eyes.headHeight;
console.log(`${animal}: head width at the eye row ${(width / h).toFixed(3)} H, eye spacing ${(Math.abs(l.x - r.x) / h).toFixed(3)} H = ${(Math.abs(l.x - r.x) / width).toFixed(3)} of the head width, eye row ${((row - body.nose[1]) / h).toFixed(3)} H = ${((row - body.nose[1]) / width).toFixed(3)} of the head width above the nose tip`);
