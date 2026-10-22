/**
 * Dumps the posed studio body of a role at each sample of `probeFolds()` into `<out>.json` (the
 * bind places, the corners, the caps, the arm weight of each vertex, and the sample labels) and
 * `<out>.bin` (Float32 places of each sample, in the order of the labels).
 * Usage: node scratch/dump-all.ts <role> <out> [--step <s>] [--demo <id>]... [--every <n>]
 */
import { writeFileSync } from 'node:fs';

import { FOLD_ROLES, probeFolds } from '../tools/fold-probe.ts';
import { patchedDemos } from '../tools/patch-demos.ts';
import { STUDIO_BONES } from '../src/models/studio-format.ts';

const args = process.argv.slice(2);
const role = FOLD_ROLES.get(args[0]!)!;
const out = args[1]!;
const opt = (k: string, d: string): string => (args.includes(k) ? args[args.indexOf(k) + 1]! : d);
const step = Number(opt('--step', '2'));
const every = Number(opt('--every', '1'));
const chosen = args.flatMap((a, i) => (args[i - 1] === '--demo' ? [`${a}.mid`] : []));
const all = await patchedDemos();
const demos = chosen.length > 0 ? all.filter((d) => chosen.includes(d.file)) : all;
const ARM = new Set<number>();
for (const [i, name] of STUDIO_BONES.entries()) {
  if (/^(upper_arm|forearm|forearm_twist|hand|fingers)_[LR]$/.test(name)) ARM.add(i);
}
const labels: string[] = [];
const chunks: Float32Array[] = [];
let base: object | null = null;
let n = 0;
let demo = '';
probeFolds(role, demos, step, (rig, _s, posed, _f, set, label) => {
  if (!base) {
    const m = rig.mesh;
    const nv = m.positions.length / 3;
    const arm: number[] = [];
    for (let v = 0; v < nv; v++) {
      let w = 0;
      for (let k = 0; k < 4; k++) if (ARM.has(m.joints[v * 4 + k]!)) w += m.weights[v * 4 + k]!;
      arm.push(w);
    }
    base = { bind: Array.from(m.positions), corners: Array.from(m.corners), caps: rig.body.caps ?? [], rim: rig.body.rim ?? [], arm };
  }
  if (set === 'rest') demo = label;
  if (set !== 'rest' && n++ % every !== 0) return;
  labels.push(`${set} ${label}`);
  chunks.push(Float32Array.from(posed));
});
const total = new Float32Array(chunks.reduce((s, c) => s + c.length, 0));
let at = 0;
for (const c of chunks) {
  total.set(c, at);
  at += c.length;
}
writeFileSync(`${out}.bin`, Buffer.from(total.buffer));
writeFileSync(`${out}.json`, JSON.stringify({ ...base, labels }));
console.log(`${labels.length} samples, ${demo}`);
