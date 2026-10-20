/**
 * Prints the bind cross section of each arm of the elephant studio body at a share along a bone:
 * the crossings of the mesh edges with the plane normal to the bone, their count, the mean
 * radius, and the ratio of the narrow axis to the wide axis.
 * Usage: node docs/research/2026-10-19-elephant-pose/ring-shape.ts
 */
import { Vector3 } from 'three';
import { studioRigOf } from '../../../src/models/studio-body.ts';

const rig = studioRigOf('studio-elephant', true);
const h = rig.body.heads;
const m = rig.mesh;
const P = (v: number) => new Vector3(m.positions[3 * v]!, m.positions[3 * v + 1]!, m.positions[3 * v + 2]!);
const edges = new Set<string>();
for (let f = 0; f < m.corners.length / 3; f++) {
  for (let k = 0; k < 3; k++) {
    const a = m.corners[3 * f + k]!, b = m.corners[3 * f + ((k + 1) % 3)]!;
    edges.add(a < b ? `${a} ${b}` : `${b} ${a}`);
  }
}
for (const [from, to, label] of [['upper_arm', 'forearm', 'upper'], ['forearm', 'hand', 'forearm']] as const) {
  for (const at of [0.15, 0.3, 0.5, 0.7, 0.85]) {
    const out: string[] = [];
    for (const side of ['L', 'R'] as const) {
      const a = new Vector3(...h[`${from}_${side}`]);
      const b = new Vector3(...h[`${to}_${side}`]);
      const axis = b.clone().sub(a);
      const len = axis.length();
      axis.normalize();
      const c = a.clone().addScaledVector(axis, len * at);
      const pts: Vector3[] = [];
      for (const e of edges) {
        const [i, j] = e.split(' ').map(Number) as [number, number];
        const pi = P(i), pj = P(j);
        const hi = pi.clone().sub(c).dot(axis), hj = pj.clone().sub(c).dot(axis);
        if (hi * hj >= 0) continue;
        const t = hi / (hi - hj);
        const x = pi.clone().lerp(pj, t);
        if (x.distanceTo(c) > len * 0.9) continue;
        pts.push(x.sub(c));
      }
      // principal axes in the plane
      let xx = 0, xy = 0, yy = 0;
      const u = new Vector3(0, 1, 0).addScaledVector(axis, -axis.y).normalize();
      const w = new Vector3().crossVectors(axis, u);
      const mean = pts.reduce((s, p) => s + p.length(), 0) / Math.max(1, pts.length);
      for (const p of pts) { const px = p.dot(u), py = p.dot(w); xx += px * px; xy += px * py; yy += py * py; }
      const tr = xx + yy, det = xx * yy - xy * xy;
      const l1 = tr / 2 + Math.sqrt(Math.max(0, tr * tr / 4 - det)), l2 = tr / 2 - Math.sqrt(Math.max(0, tr * tr / 4 - det));
      out.push(`${side}: ${pts.length} pts, mean ${mean.toFixed(3)}, narrow/wide ${Math.sqrt(Math.max(0, l2) / l1).toFixed(2)}`);
    }
    console.log(`${label} ${at}: ${out.join(' | ')}`);
  }
}
