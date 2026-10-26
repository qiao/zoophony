// Reads the paw of a studio body in its bind pose, and compares the palm hint (the z axis of the
// hand bone, `StudioBody.palms`) with the bend of the claws and the flat side of the paw.
// Usage, from the root of the tree: node docs/research/2026-10-25-percussion-grip/claw-bend.ts <badger | elephant | ...>
import { Vector3 } from 'three';
import { STUDIO_BODIES } from '../../../src/models/studio-body.ts';
import { STUDIO_BONES, unpackStudioMesh } from '../../../src/models/studio-format.ts';

const name = process.argv[2] ?? 'badger';
const body = (STUDIO_BODIES as Record<string, (typeof STUDIO_BODIES)[keyof typeof STUDIO_BODIES]>)[
  name
];
if (!body) throw new Error(`no body ${name}: ${Object.keys(STUDIO_BODIES).join(' ')}`);
const mesh = unpackStudioMesh(body.mesh, body.palette);
const f = (v: Vector3): string => v.toArray().map((x) => x.toFixed(3)).join(', ');
for (const side of ['L', 'R'] as const) {
  const hand = STUDIO_BONES.indexOf(`hand_${side}`);
  const fingers = STUDIO_BONES.indexOf(`fingers_${side}`);
  const h = new Vector3(...body.heads[`hand_${side}`]);
  const k = new Vector3(...body.heads[`fingers_${side}`]);
  const a = k.clone().sub(h).normalize();
  const p = new Vector3(...body.palms[side]).projectOnPlane(a).normalize();
  const t = new Vector3().crossVectors(a, p);
  const pts: { s: number; u: number; v: number; w: number; fw: number }[] = [];
  const n = mesh.positions.length / 3;
  for (let i = 0; i < n; i++) {
    let wh = 0;
    let wf = 0;
    for (let j = 0; j < 4; j++) {
      const b = mesh.joints[i * 4 + j];
      const w = mesh.weights[i * 4 + j] ?? 0;
      if (b === hand) wh += w;
      if (b === fingers) wf += w;
    }
    if (wh + wf < 0.5) continue;
    const q = new Vector3(mesh.positions[i * 3], mesh.positions[i * 3 + 1], mesh.positions[i * 3 + 2]);
    const d = q.sub(k);
    pts.push({ s: d.dot(a), u: d.dot(p), v: d.dot(t), w: wh + wf, fw: wf });
  }
  const tip = new Vector3(...body.fingerTips[side]).sub(k);
  console.log(`\n${name} ${side}: ${pts.length} paw vertices; axis (${f(a)}), hint palm (${f(p)}), t = axis x palm (${f(t)})`);
  console.log(`  finger tip from the knuckle: s ${tip.dot(a).toFixed(3)}, u ${tip.dot(p).toFixed(3)}, v ${tip.dot(t).toFixed(3)}`);
  // Bins along the paw axis: the mean and the extent of u and v in each bin.
  const smin = Math.min(...pts.map((q) => q.s));
  const smax = Math.max(...pts.map((q) => q.s));
  const bins = 8;
  console.log('  s (cm) | count | fingers weight | u mean, min..max (cm) | v mean, min..max (cm)');
  for (let b = 0; b < bins; b++) {
    const lo = smin + ((smax - smin) * b) / bins;
    const hi = smin + ((smax - smin) * (b + 1)) / bins;
    const of = pts.filter((q) => q.s >= lo && (q.s < hi || b === bins - 1));
    if (of.length === 0) continue;
    const m = (g: (q: (typeof of)[number]) => number): string =>
      `${((100 * of.reduce((x, q) => x + g(q), 0)) / of.length).toFixed(1)}, ${(100 * Math.min(...of.map(g))).toFixed(1)}..${(100 * Math.max(...of.map(g))).toFixed(1)}`;
    const fw = of.reduce((x, q) => x + q.fw, 0) / of.length;
    console.log(`  ${(100 * lo).toFixed(1)}..${(100 * hi).toFixed(1)} | ${of.length} | ${fw.toFixed(2)} | ${m((q) => q.u)} | ${m((q) => q.v)}`);
  }
  // The principal directions of the paw vertices, in (s, u, v).
  const c = [0, 0, 0];
  for (const q of pts) {
    c[0] += q.s / pts.length;
    c[1] += q.u / pts.length;
    c[2] += q.v / pts.length;
  }
  const cov = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (const q of pts) {
    const d = [q.s - c[0], q.u - c[1], q.v - c[2]];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cov[i * 3 + j] += (d[i] * d[j]) / pts.length;
  }
  // Power iteration on the inverse is long; print the covariance in (s, u, v) instead.
  console.log(`  covariance (cm^2) s,u,v: ${cov.map((x) => (x * 1e4).toFixed(2)).join(' ')}`);
}
