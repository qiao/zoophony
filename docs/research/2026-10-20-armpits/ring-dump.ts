/** Dumps the points of the upper ring of the right arm, bind and rest: ring-dump.ts <out.json> [--glb f] */
import { cpSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Vector3 } from 'three';
import { armBinds, measureArm } from '../../../tools/arm-shape.ts';
import { FOLD_ROLES, probeFolds, roleAnimal } from '../../../tools/fold-probe.ts';
import { runTool, takeGlb, withGlbBody } from '../../../tools/glb-swap.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
const { glb, rest: args } = takeGlb(process.argv.slice(2));
const role = FOLD_ROLES.get('violinist');
if (!role) throw new Error('role');
if (glb) {
  const fixed = [resolve(args[0] ?? 'ring.json'), ...args.slice(1)];
  process.exitCode = await withGlbBody(roleAnimal(role), glb, (dir) => {
    cpSync(import.meta.filename, join(dir, 'tools', 'ring-dump.ts'));
    return runTool(dir, 'ring-dump.ts', fixed);
  });
} else {
  const demos = (await patchedDemos()).filter((d) => d.file === 'boulanger-matin.mid');
  let out: unknown = null;
  probeFolds(role, demos, 100, (rig, studio, posed, _f, set) => {
    if (set !== 'rest' || out) return;
    const arm = armBinds(rig).R;
    const ring = arm.rings.find((r) => r.ring.name === 'upper');
    if (!ring) return;
    const sample = measureArm(arm, studio.matrices, posed);
    const pts = [];
    const m = rig.mesh;
    for (let k = 0; k < ring.along.length; k++) {
      const i = ring.edges[k * 2] ?? 0;
      const j = ring.edges[k * 2 + 1] ?? 0;
      const t = ring.along[k] ?? 0;
      const b = new Vector3().fromArray(m.positions, i * 3).lerp(new Vector3().fromArray(m.positions, j * 3), t);
      const p = new Vector3().fromArray(posed, i * 3).lerp(new Vector3().fromArray(posed, j * 3), t);
      pts.push({ i, j, bind: b.toArray(), rest: p.toArray(), radial: Array.from(ring.radial.slice(k * 3, k * 3 + 3)) });
    }
    out = { narrow: ring.narrow, flats: sample.flats, pts };
  }, ['rest']);
  writeFileSync(args[0] ?? 'ring.json', JSON.stringify(out));
  console.log('wrote', args[0]);
}
