import { Quaternion, Vector3 } from 'three';
import { STUDIO_RABBIT } from '../../../src/models/studio/rabbit.ts';
import { studioRig } from '../../../src/models/studio-rig.ts';
import { STUDIO_BONES, STUDIO_LEG_BONES } from '../../../src/models/studio-format.ts';

const seated = studioRig(STUDIO_RABBIT, false);
const standing = studioRig(STUDIO_RABBIT, true);
const low = (p: Float32Array) => { let m = Infinity; for (let v = 1; v < p.length; v += 3) m = Math.min(m, p[v] ?? 0); return m; };
console.log('lowest seated', low(seated.mesh.positions).toFixed(4), 'standing', low(standing.mesh.positions).toFixed(4));
const h = standing.body.heads;
for (const b of ['hips','thigh_L','shin_L','foot_L','toes_L','upper_arm_L','head'] as const) console.log(b, h[b].map((x) => x.toFixed(3)).join(' '));
// folds: face normal vs seated normal turned by the turn of the main bone of the face
const turnOf = new Map<number, Quaternion>();
for (const b of STUDIO_LEG_BONES) turnOf.set(STUDIO_BONES.indexOf(b), new Quaternion(...STUDIO_RABBIT.standing!.turns[b]));
const { corners, joints, weights } = seated.mesh;
const normal = (p: Float32Array, t: number) => {
  const [a, b, c] = [corners[t*3]!, corners[t*3+1]!, corners[t*3+2]!];
  const A = new Vector3().fromArray(p, a*3), B = new Vector3().fromArray(p, b*3), C = new Vector3().fromArray(p, c*3);
  return B.sub(A).cross(C.sub(A)).normalize();
};
let folded = 0; const byBone = new Map<string, number>();
for (let t = 0; t < corners.length / 3; t++) {
  // mean turn: main bone of the face (sum of weights of its corners)
  const sums = new Map<number, number>();
  for (let k = 0; k < 3; k++) { const v = corners[t*3+k]!; for (let j = 0; j < 4; j++) { const w = weights[v*4+j]!; if (w>0) sums.set(joints[v*4+j]!, (sums.get(joints[v*4+j]!) ?? 0) + w); } }
  const main = [...sums].sort((a,b)=>b[1]-a[1])[0]![0];
  const turn = turnOf.get(main) ?? new Quaternion();
  const n0 = normal(seated.mesh.positions, t).applyQuaternion(turn);
  const n1 = normal(standing.mesh.positions, t);
  if (n0.dot(n1) < 0) { folded++; byBone.set(STUDIO_BONES[main]!, (byBone.get(STUDIO_BONES[main]!) ?? 0) + 1); }
}
console.log('folded faces', folded, [...byBone]);
