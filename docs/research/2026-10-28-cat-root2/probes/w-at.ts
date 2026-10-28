/** Prints the weights of the vertex of the cat violist body nearest to each point (m). Usage: node scratch/w-at.ts x,y,z... */
import { probeDemos } from '../tools/probe-demos.ts';
import { sceneOf } from '../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../src/pose/test-sweep-roles.ts';
import { STUDIO_BONES } from '../src/models/studio-format.ts';
const role = SWEEP_ROLES.violist!;
const demos = await probeDemos();
const sm = role.players(sceneOf(demos.find((d) => role.hasRole(sceneOf(d.bytes).score))!.bytes))[0]!.model.studio!.mesh;
const P = sm.positions;
for (const arg of process.argv.slice(2)) {
  const q = arg.split(',').map(Number);
  let best = 0, bd = 1e9;
  for (let v = 0; v < P.length / 3; v++) { const d = Math.hypot(P[v * 3]! - q[0]!, P[v * 3 + 1]! - q[1]!, P[v * 3 + 2]! - q[2]!); if (d < bd) { bd = d; best = v; } }
  const w = [0, 1, 2, 3].map((j) => [STUDIO_BONES[sm.joints[best * 4 + j]!], sm.weights[best * 4 + j]!] as const).filter(([, x]) => x > 0.001).map(([b, x]) => `${b} ${x.toFixed(3)}`);
  console.log(`${arg}: v${best} at ${[0, 1, 2].map((a) => P[best * 3 + a]!.toFixed(4)).join(',')} (${(bd * 1000).toFixed(1)} mm)  ${w.join(', ')}`);
}
