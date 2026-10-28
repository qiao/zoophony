/** Writes the bind places and the weights (by bone name) of the cat violist body to a JSON file. */
import { writeFileSync } from 'node:fs';
import { probeDemos } from '../tools/probe-demos.ts';
import { sceneOf } from '../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../src/pose/test-sweep-roles.ts';
import { STUDIO_BONES } from '../src/models/studio-format.ts';
const role = SWEEP_ROLES.violist!;
const demos = await probeDemos();
const sm = role.players(sceneOf(demos.find((d) => role.hasRole(sceneOf(d.bytes).score))!.bytes))[0]!.model.studio!.mesh;
const out = [];
for (let v = 0; v < sm.positions.length / 3; v++) {
  const w: Record<string, number> = {};
  for (let j = 0; j < 4; j++) { const x = sm.weights[v * 4 + j]!; if (x > 0) w[STUDIO_BONES[sm.joints[v * 4 + j]!]!] = (w[STUDIO_BONES[sm.joints[v * 4 + j]!]!] ?? 0) + x; }
  out.push([sm.positions[v * 3], sm.positions[v * 3 + 1], sm.positions[v * 3 + 2], w]);
}
writeFileSync(process.argv[2]!, JSON.stringify(out));
