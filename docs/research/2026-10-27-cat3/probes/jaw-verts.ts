// Lists the vertices of the studio cat in front of a plane z (meters, the cat faces -z) whose head
// weight is below 0.99, with their places and bones.
import { studioRigOf } from '../src/models/studio-body.ts';
import { STUDIO_BONES } from '../src/models/studio-format.ts';
const zmax = Number(process.argv[2] ?? '-0.24');
const m = studioRigOf('studio-cat', false).mesh;
const nv = m.positions.length / 3;
let n = 0;
for (let i = 0; i < nv; i++) {
  const [x, y, z] = [m.positions[i * 3]!, m.positions[i * 3 + 1]!, m.positions[i * 3 + 2]!];
  if (z > zmax || y < 0.6) continue;
  let head = 0;
  const parts: string[] = [];
  for (let j = 0; j < 4; j++) { const w = m.weights[i * 4 + j]!; const b = STUDIO_BONES[m.joints[i * 4 + j]!]!; if (w > 0.005) parts.push(`${b} ${w.toFixed(2)}`); if (b === 'head') head += w; }
  if (head > 0.99 || !parts.some((p) => /^(neck|chest|spine1|clavicle)/.test(p))) continue;
  n++;
  console.log(`${i}: ${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)} | ${parts.join(', ')}`);
}
console.log(`${n} vertices`);
