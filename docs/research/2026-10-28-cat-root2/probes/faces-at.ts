/** Prints the faces of the cat violist body that have a corner within 1 mm of each given bind point
 * (x,y,z in m), with the welded corners and their places. Usage: node scratch/faces-at.ts x,y,z... */
import { probeDemos } from '../tools/probe-demos.ts';
import { sceneOf } from '../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../src/pose/test-sweep-roles.ts';
const role = SWEEP_ROLES.violist!;
const demos = await probeDemos();
const sm = role.players(sceneOf(demos.find((d) => role.hasRole(sceneOf(d.bytes).score))!.bytes))[0]!.model.studio!.mesh;
const P = sm.positions;
const pt = (v: number): string => [0, 1, 2].map((a) => P[v * 3 + a]!.toFixed(4)).join(',');
for (const arg of process.argv.slice(2)) {
  const q = arg.split(',').map(Number);
  const out = new Set<string>();
  for (let f = 0; f < sm.corners.length / 3; f++) {
    const cs = [0, 1, 2].map((k) => sm.corners[f * 3 + k]!);
    if (cs.some((v) => Math.hypot(P[v * 3]! - q[0]!, P[v * 3 + 1]! - q[1]!, P[v * 3 + 2]! - q[2]!) < 0.001)) out.add(`  face ${f}: ${cs.map(pt).sort().join(' | ')}`);
  }
  console.log(arg); for (const l of out) console.log(l);
}
