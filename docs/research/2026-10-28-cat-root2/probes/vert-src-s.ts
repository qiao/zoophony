/** Prints the place of vertices of the cat violist body in the long-armed source (units), from the
 * corners file of `pnpm rig-mesh --check --keep`. Usage: node scratch/vert-source.ts <corners.json> <v>... */
import { readFileSync } from 'node:fs';
import { probeDemos } from '../tools/probe-demos.ts';
import { sceneOf } from '../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../src/pose/test-sweep-roles.ts';
const [file, ...rest] = process.argv.slice(2);
const corners = JSON.parse(readFileSync(file!, 'utf8')) as ({ l: number[][] } | null | string)[];
const role = SWEEP_ROLES.violist!;
const demos = await probeDemos();
const scene = sceneOf(demos.find((d) => role.hasRole(sceneOf(d.bytes).score))!.bytes);
const sm = role.players(scene)[0]!.model.studio!.mesh;
const key = (v: number): string => [0, 1, 2].map((a) => sm.positions[v * 3 + a]!.toFixed(5)).join(',');
const out: number[][] = [];
for (const v of rest.map(Number)) {
  const seen = new Set<string>();
  for (let f = 0; f < sm.corners.length / 3; f++) {
    for (let k = 0; k < 3; k++) {
      const c = sm.corners[f * 3 + k]!;
      if (key(c) !== key(v)) continue;
      const e = corners[f];
      if (e && typeof e === 'object') seen.add(e.s[k]!.map((x) => x.toFixed(4)).join(','));
    }
  }
  console.log(v, [...seen].join(' | '));
  out.push([...seen][0]!.split(',').map(Number));
}
console.log(JSON.stringify(out));
