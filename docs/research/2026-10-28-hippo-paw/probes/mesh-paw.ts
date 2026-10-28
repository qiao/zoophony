// Compares the bone axis of the right paw of the hippo with the form of the mesh in the bind:
// the line from the wrist joint to the middle of the paw vertices, the line to the tip of the
// paw (the vertex furthest along the forearm), and the forearm axis of the mesh.
import { Vector3 } from 'three';

import { roleBodies } from '../../../../tools/fold-probe.ts';
import { STUDIO_BONES } from '../../../../src/models/studio-format.ts';
import { demoSceneOf } from '../../../../src/pose/test-scene.ts';

const scene = await demoSceneOf('boulanger-matin.mid');
const [body] = roleBodies({ kind: 'player', instrument: 'contrabass', species: ['hippo'] }, scene);
const rig = body?.model.studio;
if (!rig) throw new Error('no hippo');
const { mesh } = rig;
const h = rig.body.heads as Record<string, number[]>;
const bone = (n: string): number => STUDIO_BONES.indexOf(n as never);
const share = (v: number, names: string[]): number => {
  let w = 0;
  for (let k = 0; k < 4; k++) {
    const j = mesh.joints[v * 4 + k] ?? -1;
    if (names.some((n) => bone(n) === j)) w += mesh.weights[v * 4 + k] ?? 0;
  }
  return w;
};
const deg = (a: Vector3, b: Vector3): number => (Math.acos(Math.min(1, a.clone().normalize().dot(b.clone().normalize()))) * 180) / Math.PI;
for (const side of ['R'] as const) {
  const el = new Vector3().fromArray(h[`forearm_${side}`] ?? []);
  const wr = new Vector3().fromArray(h[`hand_${side}`] ?? []);
  const fi = new Vector3().fromArray(h[`fingers_${side}`] ?? []);
  const fore = wr.clone().sub(el).normalize();
  const pawBone = fi.clone().sub(wr).normalize();
  const palm = new Vector3().fromArray(rig.body.palms[side]);
  const p = palm.clone().addScaledVector(fore, -palm.dot(fore)).normalize();
  const s = new Vector3().crossVectors(fore, p);
  const pawNames = [`hand_${side}`, `fingers_${side}`];
  const pts: Vector3[] = [];
  for (let v = 0; v < mesh.positions.length / 3; v++) {
    if (share(v, pawNames) > 0.9) pts.push(new Vector3().fromArray(mesh.positions, v * 3));
  }
  const mid = pts.reduce((a, b) => a.add(b), new Vector3()).multiplyScalar(1 / pts.length);
  let tip = pts[0] ?? new Vector3();
  for (const q of pts) if (q.clone().sub(wr).dot(pawBone) > tip.clone().sub(wr).dot(pawBone)) tip = q;
  const toMid = mid.clone().sub(wr);
  const toTip = tip.clone().sub(wr);
  const split = (d: Vector3): string => {
    const n = d.clone().normalize();
    return `along ${n.dot(fore).toFixed(3)}, palm ${n.dot(p).toFixed(3)}, side ${n.dot(s).toFixed(3)} (${deg(d, fore).toFixed(1)}° off the forearm, ${deg(d, pawBone).toFixed(1)}° off the paw bone)`;
  };
  console.log(`${side}: ${pts.length} paw vertices`);
  console.log(`paw bone: ${split(pawBone)}`);
  console.log(`wrist to paw middle: ${split(toMid)}`);
  console.log(`wrist to paw tip: ${split(toTip)}`);
  // Forearm vertices: segments of the forearm.
  const forePts: Vector3[] = [];
  for (let v = 0; v < mesh.positions.length / 3; v++) {
    if (share(v, [`forearm_seg1_${side}`, `forearm_seg2_${side}`]) > 0.6) forePts.push(new Vector3().fromArray(mesh.positions, v * 3));
  }
  // Ring middles along the forearm: split by the place along the bone.
  const bins = new Map<number, Vector3[]>();
  for (const q of forePts) {
    const t = Math.round((q.clone().sub(el).dot(fore) / wr.distanceTo(el)) * 10);
    bins.set(t, [...(bins.get(t) ?? []), q]);
  }
  const mids = [...bins.entries()].sort((a, b) => a[0] - b[0]).map(([t, qs]) => [t, qs.reduce((a, b) => a.add(b), new Vector3()).multiplyScalar(1 / qs.length)] as const);
  for (const [t, m] of mids) {
    const d = m.clone().sub(el);
    console.log(`forearm ring ${t / 10}: off the bone line palm ${d.dot(p).toFixed(4)}, side ${d.dot(s).toFixed(4)}`);
  }
  const wristMid = (() => {
    const qs: Vector3[] = [];
    for (let v = 0; v < mesh.positions.length / 3; v++) if (share(v, [`wrist_${side}`]) > 0.3) qs.push(new Vector3().fromArray(mesh.positions, v * 3));
    return qs.reduce((a, b) => a.add(b), new Vector3()).multiplyScalar(1 / Math.max(1, qs.length));
  })();
  const dw = wristMid.clone().sub(wr);
  console.log(`wrist helper vertices middle from the joint: palm ${dw.dot(p).toFixed(4)}, side ${dw.dot(s).toFixed(4)}, along ${dw.dot(fore).toFixed(4)}`);
  console.log(`paw middle from the joint: palm ${toMid.dot(p).toFixed(4)}, side ${toMid.dot(s).toFixed(4)}, along ${toMid.dot(fore).toFixed(4)}`);
  console.log('s axis', s.toArray().map((x) => x.toFixed(3)).join(','), 'p axis', p.toArray().map((x) => x.toFixed(3)).join(','));
}
