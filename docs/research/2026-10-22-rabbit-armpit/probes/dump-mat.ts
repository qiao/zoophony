/**
 * Dumps the posed studio body of a role at each sample of `probeFolds()`, with the bone matrices
 * and the corrective weights: `<out>.json` (bind places, corners, joints, weights, correctives,
 * heads, labels), `<out>.bin` (Float32 places), `<out>.mat` (Float32 matrices), `<out>.cor`.
 * Usage: node scratch/dump-mat.ts <role> <out> [--step <s>] [--every <n>]
 */
import { writeFileSync } from 'node:fs';

import { FOLD_ROLES, probeFolds } from '../tools/fold-probe.ts';
import { patchedDemos } from '../tools/patch-demos.ts';
import { STUDIO_BONES } from '../src/models/studio-format.ts';
import { UPPER_TWIST_BONES } from '../src/models/studio-rig.ts';

const args = process.argv.slice(2);
const role = FOLD_ROLES.get(args[0]!)!;
const out = args[1]!;
const opt = (k: string, d: string): string => (args.includes(k) ? args[args.indexOf(k) + 1]! : d);
const step = Number(opt('--step', '2'));
const every = Number(opt('--every', '1'));
const demos = await patchedDemos();
const labels: string[] = [];
const P: Float32Array[] = [];
const M: Float32Array[] = [];
const C: Float32Array[] = [];
let base: object | null = null;
let n = 0;
probeFolds(role, demos, step, (rig, studio, posed, _f, set, label) => {
  if (!base) {
    const m = rig.mesh;
    base = {
      bind: Array.from(m.positions),
      corners: Array.from(m.corners),
      joints: Array.from(m.joints),
      weights: Array.from(m.weights),
      correctives: m.correctives.map((c) => Array.from(c)),
      heads: rig.body.heads,
      bones: [...STUDIO_BONES],
      twist: UPPER_TWIST_BONES,
      nmat: studio.matrices.length / 16,
    };
  }
  if (set !== 'rest' && n++ % every !== 0) return;
  labels.push(`${set} ${label}`);
  P.push(Float32Array.from(posed));
  M.push(Float32Array.from(studio.matrices));
  C.push(Float32Array.from(studio.correctives));
});
const cat = (xs: Float32Array[]): Buffer => {
  const t = new Float32Array(xs.reduce((s, c) => s + c.length, 0));
  let at = 0;
  for (const c of xs) {
    t.set(c, at);
    at += c.length;
  }
  return Buffer.from(t.buffer);
};
writeFileSync(`${out}.bin`, cat(P));
writeFileSync(`${out}.mat`, cat(M));
writeFileSync(`${out}.cor`, cat(C));
writeFileSync(`${out}.json`, JSON.stringify({ ...base, labels, ncor: C[0]!.length }));
console.log(`${labels.length} samples`);
