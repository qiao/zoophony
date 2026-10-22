/** Prints metrics of named faces at one play sample. Usage: node scratch/faces-at.ts <role> <demo> <time> <faces,...> */
import { Matrix4, Quaternion, Vector3 } from 'three';
import { armJoints } from '../tools/arm-check.ts';
import { FOLD_ROLES, probeFolds } from '../tools/fold-probe.ts';
import { patchedDemo } from '../tools/patch-demos.ts';
const [roleName, demo, time, list] = process.argv.slice(2);
const faces = list!.split(',').map(Number);
let restP: Float32Array | null = null;
probeFolds(FOLD_ROLES.get(roleName!)!, [await patchedDemo(`${demo}.mid`)], 1, (rig, studio, posed, _f, set, label) => {
  if (set === 'rest') { restP = posed.slice(); return; }
  if (!label.includes(` ${time} s`)) return;
  const m = rig.mesh, P = m.positions, C = m.corners;
  const jl = armJoints(rig, 'L', false), jr = armJoints(rig, 'R', false);
  const aw = (v: number): number => { let s = 0; for (let k = 0; k < 4; k++) if (jl.includes(m.joints[v*4+k]!) || jr.includes(m.joints[v*4+k]!)) s += m.weights[v*4+k]!; return s; };
  const pt = (A: ArrayLike<number>, v: number): Vector3 => new Vector3(A[v*3]!, A[v*3+1]!, A[v*3+2]!);
  const nrm = (A: ArrayLike<number>, f: number): [Vector3, number] => { const [a,b,c] = [0,1,2].map(k=>pt(A,C[f*3+k]!)); const n = new Vector3().crossVectors(b!.clone().sub(a!), c!.clone().sub(a!)); const ar = n.length()/2; return [n.normalize(), ar*1e4]; };
  for (const f of faces) {
    const vs = [0,1,2].map(k=>C[f*3+k]!);
    const [nb, ab] = nrm(P, f); const [np, ap] = nrm(posed, f); const [nr, ar] = nrm(restP!, f);
    console.log(`f${f} w ${vs.map(v=>aw(v).toFixed(2)).join(',')} area bind ${ab.toFixed(1)} rest ${ar.toFixed(1)} posed ${ap.toFixed(1)} n bind ${nb.toArray().map(x=>x.toFixed(2))} rest ${nr.toArray().map(x=>x.toFixed(2))} posed ${np.toArray().map(x=>x.toFixed(2))} cap ${(rig.body.caps??[]).includes(f)} rim ${(rig.body.rim??[]).includes(f)}`);
  }
}, ['rest', 'play']);
