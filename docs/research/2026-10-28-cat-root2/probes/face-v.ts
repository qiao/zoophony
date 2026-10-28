/** Prints the welded corner vertices of faces of the cat violist body module. Usage: node scratch/face-v.ts <f>... */
import { probeDemos } from '../tools/probe-demos.ts';
import { sceneOf } from '../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../src/pose/test-sweep-roles.ts';
const role = SWEEP_ROLES.violist!;
const demos = await probeDemos();
const sm = role.players(sceneOf(demos.find((d) => role.hasRole(sceneOf(d.bytes).score))!.bytes))[0]!.model.studio!.mesh;
const nv = sm.positions.length / 3; const wk = new Map<string, number>(); const weld = new Uint32Array(nv);
for (let v = 0; v < nv; v++) { const k = [0, 1, 2].map((a) => Math.round(sm.positions[v * 3 + a]! / 1e-6)).join(','); const o = wk.get(k); weld[v] = o ?? v; if (o === undefined) wk.set(k, v); }
for (const f of process.argv.slice(2).map(Number)) console.log(f, [0, 1, 2].map((k) => weld[sm.corners[f * 3 + k]!]).join(' '));
