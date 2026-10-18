/**
 * Measures the knees of a player with a cello against the cello of its bind pose: the knee joints,
 * the width of the legs at the knee height, and the width of the cello at that height.
 * Usage: node docs/research/2026-10-17-dog-mesh/cello-knees.ts [species]
 */
import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';

const species = (process.argv[2] ?? 'dog') as 'dog';
const m = buildPlayer(species, 'cello', 4, 'chair');
const at = (b: Parameters<typeof boneIndex>[0]): readonly number[] =>
  m.skeleton.positions[boneIndex(b)] ?? [];
const kneeL = at('shinL');
const kneeR = at('shinR');
console.log(`seat ${m.seat?.seatHeight.toFixed(3)} H ${m.body.headHeight.toFixed(3)}`);
console.log(`knee L ${kneeL.map((x) => x.toFixed(3))} knee R ${kneeR.map((x) => x.toFixed(3))} hip L ${at('thighL').map((x) => x.toFixed(3))}`);
const inst = boneIndex('instrument');
const legs = new Set([boneIndex('thighL'), boneIndex('thighR'), boneIndex('shinL'), boneIndex('shinR')]);
for (const dy of [-0.1, -0.05, 0, 0.05, 0.1]) {
  const y = (kneeL[1] ?? 0) + dy;
  let cMin = Infinity;
  let cMax = -Infinity;
  let cz = [Infinity, -Infinity];
  let legIn = Infinity;
  let legOut = 0;
  for (let c = 0; c < m.mesh.bones.length; c++) {
    const p = [m.mesh.positions[c * 3] ?? 0, m.mesh.positions[c * 3 + 1] ?? 0, m.mesh.positions[c * 3 + 2] ?? 0];
    if (Math.abs((p[1] ?? 0) - y) > 0.02) {
      continue;
    }
    const b = m.mesh.bones[c] ?? -1;
    if (b === inst) {
      cMin = Math.min(cMin, p[0] ?? 0);
      cMax = Math.max(cMax, p[0] ?? 0);
      cz = [Math.min(cz[0] ?? 0, p[2] ?? 0), Math.max(cz[1] ?? 0, p[2] ?? 0)];
    }
    if (legs.has(b)) {
      legIn = Math.min(legIn, Math.abs(p[0] ?? 0));
      legOut = Math.max(legOut, Math.abs(p[0] ?? 0));
    }
  }
  console.log(`y ${y.toFixed(3)}: cello x ${cMin.toFixed(3)}..${cMax.toFixed(3)} z ${cz.map((x) => x.toFixed(3))}, legs |x| ${legIn.toFixed(3)}..${legOut.toFixed(3)}`);
}
