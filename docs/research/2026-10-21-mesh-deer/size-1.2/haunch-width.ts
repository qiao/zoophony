// Prints the width of the haunch of the seated deer at heights above the seat top: the range of x
// of the body vertices (hips, thighs, spine) behind the front of the seat.
import { buildPlayer } from '../../../../src/models/player.ts';
import { boneIndex } from '../../../../src/models/rig.ts';
const m = buildPlayer('deer', 'harp', 4, 'stool');
const seat = m.seat?.seatHeight ?? 0;
console.log('seat', seat.toFixed(3), 'seat width', m.seat?.seatWidth ?? 'none');
const bones = new Set(['hips', 'thighL', 'thighR', 'spine'].map((b) => boneIndex(b as never)));
const p = m.mesh.positions;
for (const dy of [0, 0.01, 0.03, 0.06, 0.1, 0.15, 0.2, 0.25]) {
  let x0 = Infinity, x1 = -Infinity;
  for (let c = 0; c < m.mesh.bones.length; c++) {
    if (!bones.has(m.mesh.bones[c] ?? -1)) continue;
    if (Math.abs(p[c * 3 + 1]! - (seat + dy)) > 0.008) continue;
    x0 = Math.min(x0, p[c * 3]!); x1 = Math.max(x1, p[c * 3]!);
  }
  console.log(`dy ${dy.toFixed(2)}: x ${x0.toFixed(3)}..${x1.toFixed(3)}`);
}
