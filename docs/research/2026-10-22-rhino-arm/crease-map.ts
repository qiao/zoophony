/**
 * Lists the region edges of each arm of a role that crease most often in the play (the rule of
 * `pnpm arm-look`), with the bind middle of the edge in meters and the share of the samples.
 * Usage: node scratch/crease-map.ts <role> <corners.json> [<count>]
 */
import { readFileSync } from 'node:fs';

import { Vector3 } from 'three';

import { armRegion, CREASE_ANGLE, parseCorners } from '../tools/arm-look.ts';
import { FOLD_ROLES, probeFolds } from '../tools/fold-probe.ts';
import { probeDemos } from '../tools/probe-demos.ts';
import type { StudioRig } from '../src/models/studio-rig.ts';
import { STUDIO_BONES } from '../src/models/studio-format.ts';
import { UPPER_TWIST_BONES } from '../src/models/studio-rig.ts';

const [role = 'tubist', cornersFile = '', countText = '25'] = process.argv.slice(2);
const sources = parseCorners(readFileSync(cornersFile, 'utf8'));
const source = FOLD_ROLES.get(role);
if (!source) throw new Error('role');
const demos = await probeDemos();
type Region = ReturnType<typeof armRegion>;
let regions: Record<'L' | 'R', Region> | null = null;
let rigOf: StudioRig | null = null;
const hits: Record<'L' | 'R', Float64Array | null> = { L: null, R: null };
let samples = 0;
const normal = (p: ArrayLike<number>, c: Uint32Array, f: number): Vector3 => {
  const at = (k: number) => new Vector3().fromArray(p, (c[f * 3 + k] ?? 0) * 3);
  const a = at(0);
  return new Vector3().crossVectors(at(1).sub(a), at(2).sub(a)).normalize();
};
const angle = (a: Vector3, b: Vector3) => (Math.acos(Math.max(-1, Math.min(1, a.dot(b)))) * 180) / Math.PI;
probeFolds(
  source,
  demos,
  1,
  (rig, _studio, posed) => {
    if (!regions) {
      regions = { L: armRegion(rig, 'L', sources), R: armRegion(rig, 'R', sources) };
      rigOf = rig;
      hits.L = new Float64Array(regions.L.edges.length);
      hits.R = new Float64Array(regions.R.edges.length);
    }
    samples += 1;
    for (const side of ['L', 'R'] as const) {
      const r = regions[side];
      const normals = r.faces.map((f) => normal(posed, rig.mesh.corners, f));
      r.edges.forEach(([i, j], k) => {
        const s = r.sourceAngles[k] ?? Number.NaN;
        if (Number.isNaN(s)) return;
        if (Math.abs(angle(normals[i]!, normals[j]!) - s) > CREASE_ANGLE) hits[side]![k]! += 1;
      });
    }
  },
  ['play'],
);
const rig = rigOf as StudioRig | null;
if (!rig || !regions) throw new Error('no samples');
const pos = rig.mesh.positions;
const regionsOf = regions as Record<'L' | 'R', Region>;
for (const side of ['L', 'R'] as const) {
  const r = regionsOf[side];
  const h = hits[side]!;
  const counted = r.edges.filter((_, k) => !Number.isNaN(r.sourceAngles[k] ?? Number.NaN)).length;
  const order = [...h.keys()].sort((a, b) => h[b]! - h[a]!);
  const total = h.reduce((s, x) => s + x, 0);
  console.log(`side ${side}: ${r.faces.length} faces, ${counted} edges with a source, mean crease share ${(100 * total / samples / counted).toFixed(1)}%`);
  const bins = new Map<string, number>();
  for (const k of order) {
    const share = h[k]! / samples;
    const b = share > 0.9 ? '>90%' : share > 0.5 ? '50-90%' : share > 0.1 ? '10-50%' : '<10%';
    bins.set(b, (bins.get(b) ?? 0) + 1);
  }
  console.log('  edges by share', JSON.stringify([...bins]));
  for (const k of order.slice(0, Number(countText))) {
    const [i, j] = r.edges[k]!;
    const fa = r.faces[i]!;
    const fb = r.faces[j]!;
    const ca = [0, 1, 2].map((m) => rig.mesh.corners[fa * 3 + m]!);
    const cb = [0, 1, 2].map((m) => rig.mesh.corners[fb * 3 + m]!);
    const shared = ca.filter((v) => cb.includes(v));
    const mid = shared.reduce((acc, v) => acc.add(new Vector3().fromArray(pos, v * 3)), new Vector3()).multiplyScalar(1 / shared.length);
    const sa = sources[fa]!.s;
    const sb = sources[fb]!.s;
    const sm = [0, 1, 2].map((d) => ((sa[0]![d]! + sa[1]![d]! + sa[2]![d]! + sb[0]![d]! + sb[1]![d]! + sb[2]![d]!) / 6).toFixed(3)).join(' ');
    const bonesOf = (v: number) => [0, 1, 2, 3].filter((m) => (rig.mesh.weights[v * 4 + m] ?? 0) > 0.04).map((m) => { const j = rig.mesh.joints[v * 4 + m]!; return `${STUDIO_BONES[j] ?? (j === UPPER_TWIST_BONES[side] ? 'twist' : j)}:${rig.mesh.weights[v * 4 + m]!.toFixed(2)}`; }).join(',');
    console.log(`  src ${sm} w ${shared.map(bonesOf).join(' | ')} faces ${fa}/${fb} verts ${shared.join('-')} share ${(100 * h[k]! / samples).toFixed(0)}% source ${r.sourceAngles[k]!.toFixed(0)}° mid ${mid.toArray().map((x) => x.toFixed(3)).join(' ')}`);
  }
}
