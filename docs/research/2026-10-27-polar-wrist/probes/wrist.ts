/**
 * Measures the skin of the wrists of a role over the samples of the fold probe.
 *
 * A region is the posed edges whose middle lies within `--wrist` m of the posed head of a hand
 * bone. For each region and sample: the length of the edges whose corner normals jump more than
 * `--jump` degrees (a hard shading line), the largest jump, the concave posed edges sharper than
 * 30 degrees (°·cm, and the sharpest), and the area share of the region faces whose posed normal
 * points back toward the elbow (more than 120 degrees from the forearm line: a lip).
 *
 * Usage: node scratch/wrist.ts <role> [--demo <prefix>] [--step <s>] [--wrist <m>] [--jump <deg>]
 *   [--sets rest,play,lift] [--top <n>] [--glb <file>]
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

import { Matrix4, Vector3 } from 'three';

import { STUDIO_BONES } from '../src/models/studio-format.ts';
import { studioNormals } from '../src/models/studio-normals.ts';
import { FOLD_ROLES, probeFolds } from '../tools/fold-probe.ts';
import { speciesAnimal, takeGlb, withGlbBody } from '../tools/glb-swap.ts';
import { probeDemos } from '../tools/probe-demos.ts';

const { glb, rest: args } = takeGlb(process.argv.slice(2));
const opt = (name: string, fallback: string): string =>
  args.includes(name) ? args[args.indexOf(name) + 1]! : fallback;
const roleName = args[0]!;
const role = FOLD_ROLES.get(roleName);
if (!role || role.kind !== 'player') throw new Error(`no player role ${roleName}`);
if (glb) {
  const animal = speciesAnimal(role.species[0]!);
  const code = await withGlbBody(animal!, glb, (dir) => {
    mkdirSync(join(dir, 'scratch'), { recursive: true });
    copyFileSync(new URL(import.meta.url).pathname, join(dir, 'scratch', 'wrist.ts'));
    return new Promise<number>((done) => {
      const child = spawn(process.execPath, [join(dir, 'scratch', 'wrist.ts'), ...args], {
        stdio: 'inherit',
      });
      child.on('close', (c) => done(c ?? 1));
    });
  });
  process.exit(code);
}
const prefix = opt('--demo', '');
const step = Number(opt('--step', '0.5'));
const wristR = Number(opt('--wrist', '0.07'));
const jumpLimit = Number(opt('--jump', '15'));
const top = Number(opt('--top', '0'));
// The band of the wrist in the bind: from `--back` m before the wrist joint along the forearm to
// `--ahead` m past it along the paw, within `--reach` m of the arm line.
const back = Number(opt('--back', '0.05'));
const ahead = Number(opt('--ahead', '0.02'));
const reach = Number(opt('--reach', '0.09'));
let inBand: Uint8Array | null = null;
// The place of an edge in the bind: t in mm from the wrist joint (along the forearm before it and
// along the paw after it), the clock around the arm (0 on the back of the paw, away from the
// palm, and 90 toward the thumb side of a T-pose paw), and the bind angle of its two faces.
let placeOf: ((e: Edge) => [number, number, number]) | null = null;
const sets = opt('--sets', 'rest,play,lift').split(',');
const demos = (await probeDemos()).filter((d) => d.file.startsWith(prefix));
const idx = (name: string): number => STUDIO_BONES.findIndex((b) => b === name);
const DEG = 180 / Math.PI;

type Edge = {
  a: number;
  b: number;
  f1: number;
  f2: number;
  ca1: number;
  cb1: number;
  ca2: number;
  cb2: number;
  o1: number;
  o2: number;
};
let edges: Edge[] | null = null;
let base: Float32Array | null = null;
let moves: Float32Array[] = [];
const regions = ['wrist L', 'wrist R'] as const;
type Region = (typeof regions)[number];
type Row = {
  set: string;
  region: Region;
  hard: number;
  worst: number;
  concave: number;
  sharp: number;
  back: number;
};
const rows: Row[] = [];
const edgeStat = new Map<number, { region: Region; worst: number; label: string; concave: number; clabel: string }>();
const m4 = new Matrix4();

probeFolds(
  role,
  demos,
  step,
  (rig, studio, posed, _folded, set, label) => {
    const mesh = rig.mesh;
    const C = mesh.corners;
    const nv = posed.length / 3;
    if (!edges) {
      const map = new Map<string, [number, number]>();
      edges = [];
      for (let f = 0; f < C.length / 3; f++) {
        for (let k = 0; k < 3; k++) {
          const a = C[f * 3 + k]!;
          const b = C[f * 3 + ((k + 1) % 3)]!;
          const o = C[f * 3 + ((k + 2) % 3)]!;
          const key = a < b ? `${a},${b}` : `${b},${a}`;
          const prev = map.get(key);
          if (prev) {
            const [f1, k1] = prev;
            const a1 = C[f1 * 3 + k1]!;
            const cornerOf = (ff: number, v: number): number => {
              for (let j = 0; j < 3; j++) if (C[ff * 3 + j] === v) return ff * 3 + j;
              return -1;
            };
            const o1 = C[f1 * 3 + ((k1 + 2) % 3)]!;
            edges.push({
              a: a1,
              b: a1 === a ? b : a,
              f1,
              f2: f,
              ca1: cornerOf(f1, a),
              cb1: cornerOf(f1, b),
              ca2: cornerOf(f, a),
              cb2: cornerOf(f, b),
              o1,
              o2: o,
            });
          } else {
            map.set(key, [f, k]);
          }
        }
      }
      const H = rig.body.heads as unknown as Record<string, readonly [number, number, number]>;
      inBand = new Uint8Array(nv);
      for (const sd of ['L', 'R']) {
        const e0 = new Vector3(...H[`forearm_${sd}`]!);
        const w0 = new Vector3(...H[`hand_${sd}`]!);
        const t0 = new Vector3(...H[`fingers_${sd}`]!);
        const fd = w0.clone().sub(e0).normalize();
        const hd = t0.clone().sub(w0).normalize();
        for (let v = 0; v < nv; v++) {
          const q = new Vector3(mesh.positions[v * 3]!, mesh.positions[v * 3 + 1]!, mesh.positions[v * 3 + 2]!).sub(w0);
          const tf = q.dot(fd);
          const th = q.dot(hd);
          const rf = q.clone().sub(fd.clone().multiplyScalar(tf)).length();
          const rh = q.clone().sub(hd.clone().multiplyScalar(th)).length();
          if (tf > -back && th < ahead && Math.min(tf < 0 ? rf : rh, rf) < reach) inBand[v] = sd === 'L' ? 1 : 2;
        }
      }
      const P = mesh.positions;
      const bv = (i: number): Vector3 => new Vector3(P[i * 3]!, P[i * 3 + 1]!, P[i * 3 + 2]!);
      const palms = rig.body.palms as unknown as Record<string, readonly [number, number, number]>;
      placeOf = (e: Edge): [number, number, number] => {
        const mid = bv(e.a).add(bv(e.b)).multiplyScalar(0.5);
        const sd = inBand![e.a] === 1 ? 'L' : 'R';
        const e0 = new Vector3(...H[`forearm_${sd}`]!);
        const w0 = new Vector3(...H[`hand_${sd}`]!);
        const t0 = new Vector3(...H[`fingers_${sd}`]!);
        const fd = w0.clone().sub(e0).normalize();
        const hd = t0.clone().sub(w0).normalize();
        const axis = fd.clone().add(hd).normalize();
        const q = mid.sub(w0);
        const t = q.dot(q.dot(fd) < 0 ? fd : hd);
        const r = q.clone().sub(axis.clone().multiplyScalar(q.dot(axis)));
        const palm = new Vector3(...palms[sd]!);
        const up = palm.clone().negate().sub(axis.clone().multiplyScalar(-palm.dot(axis))).normalize();
        const across = axis.clone().cross(up).multiplyScalar(sd === 'L' ? 1 : -1);
        const clock = (Math.atan2(r.dot(across), r.dot(up)) * 180) / Math.PI;
        const fn = (ff: number, o: number): Vector3 =>
          bv(e.b).sub(bv(e.a)).cross(bv(o).sub(bv(e.a))).multiplyScalar(ff).normalize();
        const angle = (Math.acos(Math.max(-1, Math.min(1, fn(1, e.o1).dot(fn(-1, e.o2))))) * 180) / Math.PI;
        return [t * 1000, clock, angle];
      };
      base = studioNormals(mesh, rig.body.crease, rig.body.caps, rig.body.rim);
      moves = mesh.correctives.map((corrective) => {
        const moved = mesh.positions.map((p, i) => p + (corrective[i] ?? 0));
        const after = studioNormals({ ...mesh, positions: moved }, rig.body.crease, rig.body.caps, rig.body.rim);
        return after.map((x, i) => x - base![i]!);
      });
    }
    const mats = new Float32Array(nv * 9);
    const mm = studio.matrices;
    for (let v = 0; v < nv; v++) {
      for (let k = 0; k < 4; k++) {
        const w = mesh.weights[v * 4 + k]!;
        if (!w) continue;
        const b = mesh.joints[v * 4 + k]! * 16;
        const e = [mm[b]!, mm[b + 1]!, mm[b + 2]!, mm[b + 4]!, mm[b + 5]!, mm[b + 6]!, mm[b + 8]!, mm[b + 9]!, mm[b + 10]!];
        for (let j = 0; j < 9; j++) mats[v * 9 + j] += w * e[j]!;
      }
    }
    const cornerNormal = (c: number): Vector3 => {
      let x = base![c * 3]!;
      let y = base![c * 3 + 1]!;
      let z = base![c * 3 + 2]!;
      for (const [s, move] of moves.entries()) {
        const w = studio.correctives[s] ?? 0;
        x += w * move[c * 3]!;
        y += w * move[c * 3 + 1]!;
        z += w * move[c * 3 + 2]!;
      }
      const v = C[c]!;
      const M = mats.subarray(v * 9, v * 9 + 9);
      return new Vector3(
        M[0]! * x + M[3]! * y + M[6]! * z,
        M[1]! * x + M[4]! * y + M[7]! * z,
        M[2]! * x + M[5]! * y + M[8]! * z,
      ).normalize();
    };
    const p = (i: number): Vector3 => new Vector3(posed[i * 3]!, posed[i * 3 + 1]!, posed[i * 3 + 2]!);
    const heads = rig.body.heads as unknown as Record<string, readonly [number, number, number]>;
    const joint = (bone: string): Vector3 => {
      m4.fromArray(studio.matrices, idx(bone) * 16);
      return new Vector3(...heads[bone]!).applyMatrix4(m4);
    };
    const centers: [Region, Vector3, Vector3][] = (['L', 'R'] as const).map((s) => {
      const w = joint(`hand_${s}`);
      const fore = w.clone().sub(joint(`forearm_${s}`)).normalize();
      return [`wrist ${s}`, w, fore];
    });
    const acc = new Map<Region, Row>(
      regions.map((r) => [r, { set, region: r, hard: 0, worst: 0, concave: 0, sharp: 0, back: 0 }]),
    );
    for (const [i, e] of edges.entries()) {
      const pa = p(e.a);
      const pb = p(e.b);
      const mid = pa.clone().add(pb).multiplyScalar(0.5);
      const found = centers.find(([, c]) => mid.distanceTo(c) < wristR);
      if (!found) continue;
      if (!inBand![e.a] || !inBand![e.b]) continue;
      const region = found[0];
      const row = acc.get(region)!;
      const len = pa.distanceTo(pb) * 100;
      const ja = Math.acos(Math.max(-1, Math.min(1, cornerNormal(e.ca1).dot(cornerNormal(e.ca2))))) * DEG;
      const jb = Math.acos(Math.max(-1, Math.min(1, cornerNormal(e.cb1).dot(cornerNormal(e.cb2))))) * DEG;
      const jump = Math.max(ja, jb);
      if (jump > jumpLimit) row.hard += len;
      row.worst = Math.max(row.worst, jump);
      const n1 = pb.clone().sub(pa).cross(p(e.o1).sub(pa)).normalize();
      const n2 = p(e.o2).sub(pa).cross(pb.clone().sub(pa)).normalize();
      const angle = Math.acos(Math.max(-1, Math.min(1, n1.dot(n2)))) * DEG;
      const concave = p(e.o2).sub(pa).dot(n1) > 0;
      if (concave && angle > 30) row.concave += angle * len;
      if (concave) row.sharp = Math.max(row.sharp, angle);
      if (top > 0) {
        const s = edgeStat.get(i) ?? { region, worst: 0, label: '', concave: 0, clabel: '' };
        if (jump > s.worst) {
          s.worst = jump;
          s.label = `${set} ${label}`;
        }
        if (concave && angle > s.concave) {
          s.concave = angle;
          s.clabel = `${set} ${label}`;
        }
        edgeStat.set(i, s);
      }
    }
    // The lip: faces of the region whose posed normal points back toward the elbow.
    const area = new Map<Region, [number, number]>(regions.map((r) => [r, [0, 0]]));
    for (let f = 0; f < C.length / 3; f++) {
      const a = p(C[f * 3]!);
      const b = p(C[f * 3 + 1]!);
      const c = p(C[f * 3 + 2]!);
      const mid = a.clone().add(b).add(c).multiplyScalar(1 / 3);
      const found = centers.find(([, w]) => mid.distanceTo(w) < wristR);
      if (!found) continue;
      if (!inBand![C[f * 3]!] || !inBand![C[f * 3 + 1]!] || !inBand![C[f * 3 + 2]!]) continue;
      const n = b.clone().sub(a).cross(c.clone().sub(a));
      const ar = n.length() / 2;
      const cos = n.normalize().dot(found[2]);
      const pair = area.get(found[0])!;
      pair[0] += ar;
      if (cos < -0.5) pair[1] += ar;
    }
    for (const r of regions) {
      const [all, back] = area.get(r)!;
      acc.get(r)!.back = all > 0 ? back / all : 0;
    }
    rows.push(...acc.values());
  },
  sets as never,
);
const q = (xs: number[], f: number): number => {
  const s = xs.toSorted((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(f * (s.length - 1)))] ?? NaN;
};
console.log(
  `Wrists of ${roleName}: jump over ${jumpLimit}°, radius ${wristR} m, step ${step} s, demos ${demos.length}${glb ? `, glb ${glb}` : ''}`,
);
console.log('| Set | Region | n | hard cm p50 / p95 | worst jump p50 / max | concave °·cm p50 / p95 | sharpest concave p50 / max | back area % p50 / p95 |');
console.log('|---|---|---:|---|---|---|---|---|');
for (const set of sets) {
  for (const region of regions) {
    const rs = rows.filter((r) => r.set === set && r.region === region);
    if (!rs.length) continue;
    const f = (k: 'hard' | 'worst' | 'concave' | 'sharp' | 'back', pr: number, d = 1, m = 1): string =>
      (q(rs.map((r) => r[k] * m), pr)).toFixed(d);
    console.log(
      `| ${set} | ${region} | ${rs.length} | ${f('hard', 0.5)} / ${f('hard', 0.95)} | ${f('worst', 0.5, 0)} / ${f('worst', 1, 0)} | ${f('concave', 0.5, 0)} / ${f('concave', 0.95, 0)} | ${f('sharp', 0.5, 0)} / ${f('sharp', 1, 0)} | ${f('back', 0.5, 1, 100)} / ${f('back', 0.95, 1, 100)} |`,
    );
  }
}
if (edges && placeOf && inBand) {
  // The band edges whose two faces meet at more than the crease angle in the bind.
  const sharp = { L: [0, 0, 0], R: [0, 0, 0] } as Record<string, number[]>;
  for (const e of edges as Edge[]) {
    if (!inBand[e.a] || !inBand[e.b]) continue;
    const [, , angle] = placeOf(e);
    const side = inBand[e.a] === 1 ? 'L' : 'R';
    if (angle > 40) sharp[side]![0]! += 1;
    sharp[side]![1] = Math.max(sharp[side]![1]!, angle);
    sharp[side]![2]! += 1;
  }
  console.log(`bind band edges over 40°: L ${sharp.L![0]} of ${sharp.L![2]} (largest ${sharp.L![1]!.toFixed(0)}°), R ${sharp.R![0]} of ${sharp.R![2]} (largest ${sharp.R![1]!.toFixed(0)}°)`);
}
if (top > 0 && edges) {
  const E = edges as Edge[];
  const byJump = args.includes('--by-jump');
  const list = [...edgeStat.entries()]
    .toSorted((x, y) => (byJump ? y[1].worst - x[1].worst : y[1].concave - x[1].concave))
    .slice(0, top);
  console.log('');
  console.log('| Edge (a-b) | Faces | Region | t mm | clock | bind angle | Sharpest concave | Sample | Worst jump | Sample |');
  console.log('|---|---|---|---:|---:|---:|---:|---|---:|---|');
  for (const [i, s] of list) {
    const e = E[i]!;
    const [t, clock, angle] = placeOf!(e);
    console.log(`| ${e.a}-${e.b} | ${e.f1}, ${e.f2} | ${s.region} | ${t.toFixed(0)} | ${clock.toFixed(0)} | ${angle.toFixed(0)} | ${s.concave.toFixed(0)} | ${s.clabel} | ${s.worst.toFixed(0)} | ${s.label} |`);
  }
}
