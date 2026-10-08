// Prints the lowest vertices of a player and their bones, and the width of its head above
// 0.55 H below the head center.
// Run it from the root of the repository: node <this file> <species> <instrument>
import { buildPlayer } from '../../../../src/models/player.ts';
import { BONE_NAMES } from '../../../../src/models/rig.ts';

const [species = 'hippo', instrument = 'violin'] = process.argv.slice(2);
// SAFETY: a scratch tool; the arguments name a species and an instrument.
const { mesh, body } = buildPlayer(species as never, instrument as never);
const rows: [number, string, number, number][] = [];
for (let i = 0; i < mesh.bones.length; i++) {
  rows.push([
    mesh.positions[3 * i + 1] ?? 0,
    BONE_NAMES[mesh.bones[i] ?? 0] ?? '?',
    mesh.positions[3 * i] ?? 0,
    mesh.positions[3 * i + 2] ?? 0,
  ]);
}
rows.sort((a, b) => a[0] - b[0]);
for (const [y, bone, x, z] of rows.slice(0, 6)) {
  console.log(`y ${y.toFixed(3)} ${bone} x ${x.toFixed(3)} z ${z.toFixed(3)}`);
}
const h = body.headHeight;
const hc = body.headCenter;
let minX = 9;
let maxX = -9;
let crown = -9;
let front = 9;
for (let i = 0; i < mesh.bones.length; i++) {
  const bone = BONE_NAMES[mesh.bones[i] ?? 0];
  const y = mesh.positions[3 * i + 1] ?? 0;
  if ((bone === 'head' || bone === 'jaw') && y > hc[1] - 0.3 * h) {
    minX = Math.min(minX, mesh.positions[3 * i] ?? 0);
    maxX = Math.max(maxX, mesh.positions[3 * i] ?? 0);
    crown = Math.max(crown, y);
    front = Math.min(front, mesh.positions[3 * i + 2] ?? 0);
  }
}
console.log(
  `head width above -0.3 H: ${((maxX - minX) / h).toFixed(3)} H (${(maxX - minX).toFixed(3)} m), ` +
    `crown ${((crown - hc[1]) / h).toFixed(3)} H, front ${((front - hc[2]) / h).toFixed(3)} H`,
);
