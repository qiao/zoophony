/** Prints the bind place, the share along the upper arm, the angle from the front, and the weights
 * of vertices of the cat violist body. Usage: node scratch/vert-info.ts [--side L|R] <v>... */
import { Vector3 } from 'three';
import { probeDemos } from '../tools/probe-demos.ts';
import { sceneOf } from '../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../src/pose/test-sweep-roles.ts';
import { STUDIO_BONES } from '../src/models/studio-format.ts';
const args = process.argv.slice(2);
const side = args.includes('--side') ? args[args.indexOf('--side') + 1]! : 'L';
const ids = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--side').map(Number);
const role = SWEEP_ROLES.violist!;
const demos = await probeDemos();
const scene = sceneOf(demos.find((d) => role.hasRole(sceneOf(d.bytes).score))!.bytes);
const rig = role.players(scene)[0]!.model.studio!;
const sm = rig.mesh;
const heads = rig.body.heads as Record<string, [number, number, number]>;
const S = new Vector3(...heads[`upper_arm_${side}`]!);
const u = new Vector3(...heads[`forearm_${side}`]!).sub(S);
const lu = u.length();
u.normalize();
const front = new Vector3(0, 0, -1).addScaledVector(u, -new Vector3(0, 0, -1).dot(u)).normalize();
const upDir = new Vector3().crossVectors(front, u).normalize();
const sign = upDir.y >= 0 ? 1 : -1;
for (const v of ids) {
  const p = new Vector3(sm.positions[v * 3]!, sm.positions[v * 3 + 1]!, sm.positions[v * 3 + 2]!);
  const d = p.clone().sub(S);
  const t = d.dot(u) / lu;
  d.addScaledVector(u, -d.dot(u));
  const ang = (Math.atan2(sign * d.dot(upDir), d.dot(front)) * 180) / Math.PI;
  const w = [0, 1, 2, 3].map((j) => [STUDIO_BONES[sm.joints[v * 4 + j]!], sm.weights[v * 4 + j]!] as const).filter(([, x]) => x > 0.005).map(([b, x]) => `${b} ${x.toFixed(2)}`);
  console.log(`${v} (${p.toArray().map((x) => x.toFixed(4)).join(',')}) t${t.toFixed(2)} a${ang.toFixed(0)} r${(100 * d.length()).toFixed(1)}cm  ${w.join(', ')}`);
}
