/**
 * Prints the weights of the skin of the app body around the root of one upper arm of the cat, in
 * the seated bind: the vertices within 8 cm of the upper arm line, by the share along the upper
 * arm (tu, from the shoulder joint) and the angle around it (0 the front, 90 up, 180 the back,
 * 270 down; the out side in the middle). For each cell: the count, the mean share of the arm
 * bones, of the chest, of the clavicle, and of the other trunk bones.
 *
 * Usage: node scratch/root-weights.ts [--side L|R] [--min <arm share>]
 */
import { Vector3 } from 'three';

import { probeDemos } from '../tools/probe-demos.ts';
import { sceneOf } from '../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../src/pose/test-sweep-roles.ts';
import { STUDIO_BONES } from '../src/models/studio-format.ts';

const args = process.argv.slice(2);
const opt = (n: string, f: string): string => (args.includes(n) ? args[args.indexOf(n) + 1]! : f);
const side = opt('--side', 'L');
const min = Number(opt('--min', '0.05'));
const role = SWEEP_ROLES.violist!;
const demos = await probeDemos();
const scene = sceneOf(demos.find((d) => role.hasRole(sceneOf(d.bytes).score))!.bytes);
const rig = role.players(scene)[0]!.model.studio!;
const sm = rig.mesh;
const heads = rig.body.heads as Record<string, [number, number, number]>;
const S = new Vector3(...heads[`upper_arm_${side}`]!);
const E = new Vector3(...heads[`forearm_${side}`]!);
const u = E.clone().sub(S);
const lu = u.length();
u.normalize();
// The frame around the arm: front is -z of the app (the body faces -z), up is +y.
const front0 = new Vector3(0, 0, -1);
const front = front0.addScaledVector(u, -front0.dot(u)).normalize();
const upDir = new Vector3().crossVectors(front, u).normalize();
const sign = upDir.y >= 0 ? 1 : -1;
const cells = new Map<string, { n: number; arm: number; chest: number; clav: number; trunk: number }>();
const nv = sm.positions.length / 3;
for (let v = 0; v < nv; v++) {
  const p = new Vector3(sm.positions[v * 3]!, sm.positions[v * 3 + 1]!, sm.positions[v * 3 + 2]!);
  const r = p.clone().sub(S);
  const t = r.dot(u) / lu;
  if (t < -0.1 || t > 0.75) continue;
  r.addScaledVector(u, -r.dot(u));
  if (r.length() > 0.08) continue;
  let arm = 0;
  let chest = 0;
  let clav = 0;
  let trunk = 0;
  for (let j = 0; j < 4; j++) {
    const b = STUDIO_BONES[sm.joints[v * 4 + j]!]!;
    const w = sm.weights[v * 4 + j]!;
    if (/^(upper_arm|forearm|elbow|wrist|hand|fingers)/.test(b)) arm += w;
    else if (b === 'chest') chest += w;
    else if (b.startsWith('clavicle')) clav += w;
    else trunk += w;
  }
  if (arm < min) continue;
  const ang = ((Math.atan2(sign * r.dot(upDir), r.dot(front)) * 180) / Math.PI + 360) % 360;
  const key = `${(Math.round(t * 10) / 10).toFixed(1)}|${Math.round(ang / 45) % 8}`;
  const c = cells.get(key) ?? { n: 0, arm: 0, chest: 0, clav: 0, trunk: 0 };
  c.n++;
  c.arm += arm;
  c.chest += chest;
  c.clav += clav;
  c.trunk += trunk;
  cells.set(key, c);
}
const names = ['front', 'front-up', 'up', 'back-up', 'back', 'back-down', 'down', 'front-down'];
console.log(`side ${side}: mean shares of the vertices with an arm share over ${min}, chest/clavicle/other trunk (count)`);
console.log(`  tu   ${names.map((n) => n.padStart(17)).join('')}`);
for (let t = -0.1; t <= 0.75; t += 0.1) {
  const tk = (Math.round(t * 10) / 10).toFixed(1);
  const row = names.map((_, k) => {
    const c = cells.get(`${tk}|${k}`);
    if (!c) return '-'.padStart(17);
    return `${(c.chest / c.n).toFixed(2)}/${(c.clav / c.n).toFixed(2)}/${(c.trunk / c.n).toFixed(2)}(${c.n})`.padStart(17);
  });
  console.log(`  ${tk.padStart(4)} ${row.join('')}`);
}
