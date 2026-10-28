import { probeDemos } from '../tools/probe-demos.ts';
import { sceneOf } from '../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../src/pose/test-sweep-roles.ts';
const role = SWEEP_ROLES.violist!;
const demos = await probeDemos();
const scene = sceneOf(demos.find((d) => role.hasRole(sceneOf(d.bytes).score))!.bytes);
const sm = role.players(scene)[0]!.model.studio!.mesh;
for (const f of process.argv.slice(2).map(Number)) {
  const m = [0, 1, 2].map((a) => [0, 1, 2].reduce((s, k) => s + sm.positions[sm.corners[f * 3 + k]! * 3 + a]!, 0) / 3);
  console.log(f, m.map((x) => x.toFixed(4)).join(','));
}
