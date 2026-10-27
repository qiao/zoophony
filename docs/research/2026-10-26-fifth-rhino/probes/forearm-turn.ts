// Measures the turn of each paw around its forearm from the neutral forearm, as anatomy reads it:
// the angle of the palm from the elbow hinge (the neutral palm faces along the hinge, medially),
// positive toward the supinated side (palm up with the upper arm down), in the bind and in the
// samples of a role. Diagnosis only. Usage, from the root of the tree:
// node docs/research/2026-10-26-fifth-rhino/probes/forearm-turn.ts [role] [step] [holds] [demo]
import { Matrix4, Quaternion, Vector3 } from 'three';

import { FOLD_ROLES, probeFolds } from '../../../../tools/fold-probe.ts';
import { patchedDemos } from '../../../../tools/patch-demos.ts';
import { setHolds } from '../../../../tools/hold-sets.ts';
import { STUDIO_BONES } from '../../../../src/models/studio-format.ts';

const names: readonly string[] = STUDIO_BONES;
const at = (name: string): number => names.indexOf(name);
const roleName = process.argv[2] ?? 'tubist';
const step = Number(process.argv[3] ?? '0.5');
const role = FOLD_ROLES.get(roleName);
if (!role) throw new Error(`no ${roleName}`);
const changes = process.argv[4];
if (changes) {
  console.log(setHolds(changes).text);
}
const only = process.argv[5];
const demos = (await patchedDemos()).filter((d) => !only || d.file.startsWith(only));
const m = new Matrix4();
const q = new Quaternion();

function angle(sh: Vector3, el: Vector3, wr: Vector3, palm: Vector3, side: 'L' | 'R'): number {
  const upper = el.clone().sub(sh).normalize();
  const fore = wr.clone().sub(el).normalize();
  // The hinge points medially for the left arm (app axes: -x is the left side); mirror for R.
  const hinge = new Vector3().crossVectors(upper, fore).normalize();
  if (side === 'R') hinge.negate();
  const sup = upper.clone().negate().projectOnPlane(fore).normalize();
  const p = palm.clone().projectOnPlane(fore).normalize();
  return (Math.atan2(p.dot(sup), p.dot(hinge)) * 180) / Math.PI;
}

const out = new Map<string, number[]>();
let bindDone = false;
probeFolds(role, demos, step, (rig, studio, _posed, _folded, set, label) => {
  for (const side of ['L', 'R'] as const) {
    const h = rig.body.heads;
    const pos = (name: string): Vector3 => {
      const v = new Vector3(...(h[name as keyof typeof h] as [number, number, number]));
      m.fromArray(studio.matrices, at(name) * 16);
      return v.applyMatrix4(m);
    };
    const bindPalm = new Vector3(...rig.body.palms[side]);
    if (!bindDone) {
      const b = (name: string): Vector3 =>
        new Vector3(...(h[name as keyof typeof h] as [number, number, number]));
      console.log(
        `bind ${side}: ${angle(b(`upper_arm_${side}`), b(`forearm_${side}`), b(`hand_${side}`), bindPalm, side).toFixed(1)}`,
      );
    }
    m.fromArray(studio.matrices, at(`hand_${side}`) * 16);
    q.setFromRotationMatrix(m);
    const palm = bindPalm.clone().applyQuaternion(q);
    const a = angle(pos(`upper_arm_${side}`), pos(`forearm_${side}`), pos(`hand_${side}`), palm, side);
    const key = `${set} ${side}`;
    const list = out.get(key) ?? [];
    list.push(a);
    out.set(key, list);
  }
  bindDone = true;
});
for (const [key, list] of out) {
  const s = list.toSorted((a, b) => a - b);
  const med = s[Math.floor(s.length / 2)] ?? NaN;
  console.log(`${key}: n ${s.length}, min ${s[0]?.toFixed(1)}, median ${med.toFixed(1)}, max ${s[s.length - 1]?.toFixed(1)}`);
}
