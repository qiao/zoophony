// Measures the wrist of a bow arm of the hippo bassist over the play: for each vertex near the
// wrist (a weight on the wrist helper, the hand, or the last forearm segment of the side), the
// move of the vertex out of the plane of its neighbors, against the bind. A flap or a spike moves
// a vertex far out of its neighbors. It also prints the fold angle of the bridge faces.
// Usage: node docs/research/2026-10-28-hippo-arm/probes/wrist-spike.ts [R|L] [--step <s>] [--demo <file>]...
import { foldAngle, probeFolds } from '../../../../tools/fold-probe.ts';
import { probeDemos } from '../../../../tools/probe-demos.ts';
import { STUDIO_BONES } from '../../../../src/models/studio-format.ts';

const args = process.argv.slice(2);
const side = args.find((a) => a === 'R' || a === 'L') ?? 'R';
const stepAt = args.indexOf('--step');
const step = stepAt >= 0 ? Number(args[stepAt + 1]) : 0.25;
const wanted = args.flatMap((a, i) => (args[i - 1] === '--demo' ? [a] : []));
const demos = (await probeDemos()).filter(
  (d) => wanted.length === 0 || wanted.includes(d.file),
);
const bone = (name: string): number => STUDIO_BONES.indexOf(name as (typeof STUDIO_BONES)[number]);
const near = new Set([bone(`wrist_${side}`), bone(`hand_${side}`), bone(`forearm_seg3_${side}`)]);
const wristBone = bone(`wrist_${side}`);
const handBones = new Set([bone(`hand_${side}`), bone(`fingers_${side}`)]);

let ready = false;
let verts: number[] = [];
let neighbors: number[][] = [];
let bindOut: number[] = [];
let bridge: number[] = [];
let region: number[] = [];
const regionWorst = new Map<number, [number, string]>();
const regionShare: number[] = [];
const worst = new Map<number, [number, string]>();
const shares: number[] = [];
const bridgeWorst: number[] = [];
let samples = 0;

const report = probeFolds(
  { kind: 'player', instrument: 'contrabass', species: ['hippo'] },
  demos,
  step,
  (rig, studio, posed, _folded, set, label) => {
    if (set !== 'play') {
      return;
    }
    const mesh = rig.mesh;
    if (!ready) {
      const count = mesh.positions.length / 3;
      const links: Set<number>[] = Array.from({ length: count }, () => new Set());
      for (let t = 0; t < mesh.corners.length / 3; t++) {
        const c = [0, 1, 2].map((k) => mesh.corners[t * 3 + k] ?? 0);
        for (const a of c) for (const b of c) if (a !== b) links[a]?.add(b);
      }
      const weight = (v: number, set2: Set<number>): number => {
        let w = 0;
        for (let k = 0; k < 4; k++) {
          if (set2.has(mesh.joints[v * 4 + k] ?? -1)) w += mesh.weights[v * 4 + k] ?? 0;
        }
        return w;
      };
      verts = [];
      for (let v = 0; v < count; v++) {
        if (weight(v, near) > 0.2) verts.push(v);
      }
      neighbors = verts.map((v) => [...(links[v] ?? [])]);
      bindOut = verts.map((v, i) => outOf(mesh.positions, v, neighbors[i] ?? []));
      for (let t = 0; t < mesh.corners.length / 3; t++) {
        const c = [0, 1, 2].map((k) => mesh.corners[t * 3 + k] ?? 0);
        const onWrist = c.some((v) => weight(v, new Set([wristBone])) > 0);
        const onPaw = c.some(
          (v) => weight(v, new Set([wristBone])) === 0 && weight(v, handBones) > 0.3,
        );
        if (onWrist && onPaw) bridge.push(t);
        if (c.some((v) => weight(v, near) > 0.2)) region.push(t);
      }
      ready = true;
    }
    samples += 1;
    let most = 0;
    for (const [i, v] of verts.entries()) {
      const grow = outOf(posed, v, neighbors[i] ?? []) - (bindOut[i] ?? 0);
      if (grow > most) most = grow;
      if (grow > (worst.get(v)?.[0] ?? 0)) worst.set(v, [grow, label]);
    }
    shares.push(most);
    let fold = 0;
    for (const t of bridge) fold = Math.max(fold, foldAngle(mesh, studio.matrices, posed, t));
    bridgeWorst.push(fold);
    let regionMost = 0;
    for (const t of region) {
      const a = foldAngle(mesh, studio.matrices, posed, t);
      if (a > regionMost) regionMost = a;
      if (a > (regionWorst.get(t)?.[0] ?? 0)) regionWorst.set(t, [a, label]);
    }
    regionShare.push(regionMost);
  },
  ['play'],
);

/**
 * Gives the distance of a vertex from the mean place of its neighbors, in meters.
 *
 * @param places The places.
 * @param v The vertex.
 * @param links The neighbors.
 * @returns The distance.
 */
function outOf(places: ArrayLike<number>, v: number, links: readonly number[]): number {
  const mean = [0, 0, 0];
  for (const n of links) for (let k = 0; k < 3; k++) mean[k] = (mean[k] ?? 0) + (places[n * 3 + k] ?? 0) / links.length;
  return Math.hypot(...[0, 1, 2].map((k) => (places[v * 3 + k] ?? 0) - (mean[k] ?? 0)));
}

const pct = (xs: number[], p: number): number => {
  const s = xs.toSorted((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 0;
};
console.log(`demos ${report.demos.length}, play samples ${samples}, wrist vertices ${verts.length}, bridge faces ${bridge.length}`);
console.log(
  `largest out move of a wrist vertex (mm): p50 ${(pct(shares, 0.5) * 1000).toFixed(1)}, p95 ${(pct(shares, 0.95) * 1000).toFixed(1)}, max ${(pct(shares, 1) * 1000).toFixed(1)}`,
);
console.log(
  `worst fold angle of a bridge face: p50 ${pct(bridgeWorst, 0.5).toFixed(0)}, p95 ${pct(bridgeWorst, 0.95).toFixed(0)}, max ${pct(bridgeWorst, 1).toFixed(0)}; samples over 60: ${((bridgeWorst.filter((a) => a > 60).length / Math.max(1, samples)) * 100).toFixed(1)}%, over 90: ${((bridgeWorst.filter((a) => a > 90).length / Math.max(1, samples)) * 100).toFixed(1)}%`,
);
console.log(
  `worst fold angle of a wrist region face (${region.length} faces): p50 ${pct(regionShare, 0.5).toFixed(0)}, p95 ${pct(regionShare, 0.95).toFixed(0)}, max ${pct(regionShare, 1).toFixed(0)}; samples over 60: ${((regionShare.filter((a) => a > 60).length / Math.max(1, samples)) * 100).toFixed(1)}%`,
);
for (const [t, [a, label]] of [...regionWorst].toSorted((x, y) => y[1][0] - x[1][0]).slice(0, 8)) {
  console.log(`  face ${t}: ${a.toFixed(0)} at ${label}`);
}
const top = [...worst].toSorted((a, b) => b[1][0] - a[1][0]).slice(0, 6);
for (const [v, [g, label]] of top) console.log(`  vertex ${v}: ${(g * 1000).toFixed(1)} mm at ${label}`);
