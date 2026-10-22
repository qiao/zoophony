/**
 * Dumps the posed studio body of a role at named play samples into JSON for `faces.py`: the bind
 * and posed places, the corners, the caps, the rim, and the arm weight of each vertex.
 * Usage: node scratch/dump.ts <role> <demo> <out.json> <label>...
 * A label is the time of a play sample, as `718.38 s`, or `rest`.
 */
import { writeFileSync } from 'node:fs';

import { FOLD_ROLES, probeFolds } from '../tools/fold-probe.ts';
import { patchedDemo } from '../tools/patch-demos.ts';
import { STUDIO_BONES } from '../src/models/studio-format.ts';

const [roleName, demo, out, ...labels] = process.argv.slice(2);
const role = FOLD_ROLES.get(roleName!)!;
const ARM = new Set<number>();
for (const [i, name] of STUDIO_BONES.entries()) {
  if (/^(upper_arm|forearm|forearm_twist|hand|fingers)_[LR]$/.test(name)) ARM.add(i);
}
const poses: Record<string, number[]> = {};
let base: object | null = null;
const steps = labels.filter((l) => l !== 'rest').map((l) => Number(l));
probeFolds(
  role,
  [await patchedDemo(`${demo}.mid`)],
  Number(process.env.STEP ?? "1"),
  (rig, _s, posed, _f, set, label) => {
    const time = Number(label.split(' ').at(-2));
    const want = set === 'rest' ? labels.includes('rest') : steps.some((t) => Math.abs(t - time) < 0.004);
    if (!want) return;
    const key = set === 'rest' ? 'rest' : time.toFixed(2);
    if (poses[key]) return;
    poses[key] = Array.from(posed);
    if (!base) {
      const m = rig.mesh;
      const nv = m.positions.length / 3;
      const arm: number[] = [];
      for (let v = 0; v < nv; v++) {
        let w = 0;
        for (let k = 0; k < 4; k++) if (ARM.has(m.joints[v * 4 + k]!)) w += m.weights[v * 4 + k]!;
        arm.push(w);
      }
      base = {
        bind: Array.from(m.positions),
        corners: Array.from(m.corners),
        caps: rig.body.caps ?? [],
        rim: rig.body.rim ?? [],
        arm,
        joints: Array.from(m.joints),
        weights: Array.from(m.weights),
      };
    }
  },
  labels.includes('rest') ? ['rest', 'play'] : ['play'],
);
writeFileSync(out!, JSON.stringify({ ...base, poses }));
console.log(`poses: ${Object.keys(poses).join(', ')}`);
