/** Compares the bell vertices of the horn mesh with the bell profile of scratch/bell-probe.ts. */
import { Vector3 } from 'three';
import { FOLD_ROLES, roleBodies } from '../../../tools/fold-probe.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { placePoint } from '../../../src/models/instruments/hold.ts';
import { BONE_NAMES } from '../../../src/models/rig.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
const role = FOLD_ROLES.get('hornist');
if (!role) throw new Error('role');
const demo = (await patchedDemos()).find((d) => d.file === 'boulanger-matin.mid');
if (!demo) throw new Error('demo');
const scene = sceneOf(demo.bytes);
const { model } = roleBodies(role, scene)[0] ?? (() => { throw new Error('no body'); })();
const target = model.instrument.targets.find((t) => t.kind === 'bell');
if (!target) throw new Error('bell');
const mouth = new Vector3(...placePoint(model.pieces, { bone: target.bone, at: target.from }));
const tip = new Vector3(...placePoint(model.pieces, { bone: target.bone, at: [target.from[0] + target.normal[0], target.from[1] + target.normal[1], target.from[2] + target.normal[2]] }));
const axis = tip.sub(mouth).normalize();
const ib = BONE_NAMES.indexOf('instrument');
const m = model.mesh;
const rows: string[] = [];
const count = m.positions.length / 3;
let n = 0;
for (let c = 0; c < count; c++) {
  if ((m.bones[c] ?? -1) !== ib) continue;
  const p = new Vector3().fromArray(m.positions, c * 3);
  const d = p.clone().sub(mouth);
  const t = -d.dot(axis);
  const r = d.addScaledVector(axis, t).length();
  if (t > -0.02 && t < 0.21 && r < 0.16) {
    n++;
    rows.push(`${(t * 100).toFixed(1)} ${(r * 100).toFixed(1)}`);
  }
}
console.log('corners near the bell', n, 'of', count);
console.log([...new Set(rows)].toSorted((a, b) => Number(a.split(' ')[0]) - Number(b.split(' ')[0])).join('\n'));
