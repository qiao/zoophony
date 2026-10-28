/** Lists the bind vertices of the cat that moved between main and the working tree. */
import { STUDIO_CAT as NOW } from '../src/models/studio/cat.ts';
import { STUDIO_CAT as MAIN } from './cat-main.ts';
import { unpackStudioMesh } from "../src/models/studio-format.ts";
const a = unpackStudioMesh(MAIN.mesh);
const b = unpackStudioMesh(NOW.mesh);
const hips = NOW.heads.hips;
const rows: [number, string][] = [];
for (let v = 0; v < a.positions.length / 3; v++) {
  const d = Math.hypot(...[0, 1, 2].map((k) => a.positions[v * 3 + k]! - b.positions[v * 3 + k]!));
  if (d > 0.002) {
    const p = [0, 1, 2].map((k) => a.positions[v * 3 + k]! - hips[k]!);
    rows.push([d, `${v} move ${(d * 100).toFixed(2)} cm at x ${(p[0]! * 100).toFixed(1)} up ${(p[1]! * 100).toFixed(1)} fwd ${(-p[2]! * 100).toFixed(1)} cm (from hips)`]);
  }
}
rows.sort((p, q) => q[0] - p[0]);
console.log(`${rows.length} vertices moved over 2 mm`);
for (const [, r] of rows.slice(0, 40)) console.log(r);
