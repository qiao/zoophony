// Gives the share of the area of the wrist bridge faces of the hippo whose normal points back
// toward the elbow (a lip), in the bind pose: the normal makes more than 120 degrees with the
// line from the elbow joint to the wrist joint. Usage: node docs/research/2026-10-28-hippo-arm/probes/band-back.ts [R|L]
import { roleBodies } from '../../../../tools/fold-probe.ts';
import { STUDIO_BONES } from '../../../../src/models/studio-format.ts';
import { demoSceneOf } from '../../../../src/pose/test-scene.ts';

const side = process.argv[2] ?? 'R';
const scene = await demoSceneOf('boulanger-matin.mid');
const [body] = roleBodies({ kind: 'player', instrument: 'contrabass', species: ['hippo'] }, scene);
const rig = body?.model.studio;
if (!rig) throw new Error('no hippo');
const { mesh } = rig;
const bone = (n: string): number => STUDIO_BONES.indexOf(n as (typeof STUDIO_BONES)[number]);
const heads = rig.body.heads as Record<string, number[]>;
const el = heads[`forearm_${side}`] ?? [0, 0, 0];
const wr = heads[`hand_${side}`] ?? [0, 0, 0];
const f = [0, 1, 2].map((k) => (wr[k] ?? 0) - (el[k] ?? 0));
const fl = Math.hypot(...f);
const w = (v: number, b: number): number => {
  let s = 0;
  for (let k = 0; k < 4; k++) if ((mesh.joints[v * 4 + k] ?? -1) === b) s += mesh.weights[v * 4 + k] ?? 0;
  return s;
};
const [wrist, hand, fingers] = [bone(`wrist_${side}`), bone(`hand_${side}`), bone(`fingers_${side}`)];
let all = 0;
let back = 0;
let count = 0;
let backCount = 0;
for (let t = 0; t < mesh.corners.length / 3; t++) {
  const c = [0, 1, 2].map((k) => mesh.corners[t * 3 + k] ?? 0);
  const onWrist = c.some((v) => w(v, wrist) > 0);
  const onPaw = c.some((v) => w(v, wrist) === 0 && w(v, hand) + w(v, fingers) > 0.3);
  if (!onWrist || !onPaw) continue;
  const p = c.map((v) => [0, 1, 2].map((k) => mesh.positions[v * 3 + k] ?? 0));
  const [a = [], b = [], d = []] = p;
  const u = [0, 1, 2].map((k) => (b[k] ?? 0) - (a[k] ?? 0));
  const q = [0, 1, 2].map((k) => (d[k] ?? 0) - (a[k] ?? 0));
  const n = [u[1]! * q[2]! - u[2]! * q[1]!, u[2]! * q[0]! - u[0]! * q[2]!, u[0]! * q[1]! - u[1]! * q[0]!];
  const area = Math.hypot(...n) / 2;
  const cos = n.reduce((s, x, k) => s + x * (f[k] ?? 0), 0) / (Math.hypot(...n) * fl);
  all += area;
  count += 1;
  if (cos < -0.5) {
    back += area;
    backCount += 1;
  }
}
console.log(`${side}: ${count} bridge faces, ${backCount} face back to the elbow, ${((back / all) * 100).toFixed(1)}% of the bridge area`);
