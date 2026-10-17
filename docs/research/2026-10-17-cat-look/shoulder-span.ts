/**
 * Gives the span of the shoulder tops of the standing cat: the width along x of the vertices whose
 * main bone is a clavicle, and the width of the body at the shoulder joints with no arm vertex, in
 * head heights. Usage: node scratch/shoulder-span.ts <root of a tree>
 */
import { resolve } from 'node:path';

const root = resolve(process.argv[2] ?? '.');
const player = await import(`${root}/src/models/player.ts`);
const fmt = await import(`${root}/src/models/studio-format.ts`);
const m = player.buildPlayer('cat', 'viola', 4, 'stand');
const rig = m.studio;
const H: number = m.body.headHeight;
const mesh = rig.mesh;
const count = mesh.positions.length / 3;
let lo = Infinity;
let hi = -Infinity;
const arm = new Set(['upper_arm_L', 'upper_arm_R', 'forearm_L', 'forearm_R', 'forearm_twist_L', 'forearm_twist_R', 'hand_L', 'hand_R', 'fingers_L', 'fingers_R']);
const sy = rig.body.heads['upper_arm_L'][1];
let blo = Infinity;
let bhi = -Infinity;
for (let v = 0; v < count; v++) {
  let best = 0;
  let bone = 0;
  for (let k = 0; k < 4; k++) {
    const w = mesh.weights[v * 4 + k] ?? 0;
    if (w > best) {
      best = w;
      bone = mesh.joints[v * 4 + k] ?? 0;
    }
  }
  const name = fmt.STUDIO_BONES[bone];
  const x = mesh.positions[v * 3];
  const y = mesh.positions[v * 3 + 1];
  if (name.startsWith('clavicle')) {
    lo = Math.min(lo, x);
    hi = Math.max(hi, x);
  }
  if (!arm.has(name) && Math.abs(y - sy) < 0.02) {
    blo = Math.min(blo, x);
    bhi = Math.max(bhi, x);
  }
}
const sx = rig.body.heads['upper_arm_L'][0] - rig.body.heads['upper_arm_R'][0];
console.log(`${root.split('/').pop()}: clavicle vertices span ${((hi - lo) / H).toFixed(3)} H, body with no arm vertex at the shoulder joint height (2 cm band) ${((bhi - blo) / H).toFixed(3)} H, shoulder joints ${(sx / H).toFixed(3)} H apart`);
