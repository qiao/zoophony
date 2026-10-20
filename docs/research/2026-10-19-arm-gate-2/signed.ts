// Prints the signed paw twist on the forearm (p5, p50, p95) of each arm of roles, by sample set.
import { Matrix4, Quaternion, Vector3 } from 'three';
import { FOLD_ROLES, probeFolds } from '../../../tools/fold-probe.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
import { twistAngle } from '../../../src/models/studio-rig.ts';

const turnOf = (m: ArrayLike<number>, b: number) =>
  new Quaternion().setFromRotationMatrix(new Matrix4().fromArray(Array.from({ length: 16 }, (_, k) => m[b * 16 + k] ?? 0)));
const demos = await patchedDemos();
const q = (v: number[], s: number) => { const t = v.toSorted((a, b) => a - b); return t[Math.min(t.length - 1, Math.floor(s * t.length))] ?? NaN; };
for (const role of process.argv.slice(2)) {
  const src = FOLD_ROLES.get(role);
  if (!src) { console.log(role, 'missing'); continue; }
  const vals: Record<string, number[]> = {};
  probeFolds(src, demos, 0.5, (rig, studio, _p, _f, set) => {
    for (const side of ['L', 'R'] as const) {
      const h = rig.body.heads;
      const axis = new Vector3(...h[`hand_${side}`]).sub(new Vector3(...h[`forearm_${side}`])).normalize();
      const fore = turnOf(studio.matrices, STUDIO_BONES.indexOf(`forearm_${side}`));
      const hand = turnOf(studio.matrices, STUDIO_BONES.indexOf(`hand_${side}`));
      const t = (twistAngle(fore.invert().multiply(hand), axis) * 180) / Math.PI;
      // Mirror the right side, so that one sign means one turn of the forearm on both sides.
      (vals[`${set} ${side}`] ??= []).push(side === 'R' ? -t : t);
    }
  });
  for (const [k, v] of Object.entries(vals)) {
    console.log(`${role} ${k}: p5 ${q(v, 0.05).toFixed(0)} p50 ${q(v, 0.5).toFixed(0)} p95 ${q(v, 0.95).toFixed(0)} min ${Math.min(...v).toFixed(0)} max ${Math.max(...v).toFixed(0)}`);
  }
}
