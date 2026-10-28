/**
 * Measures the hard shading lines of the skin of a role near each arm root and each elbow, over
 * the samples of the fold probe.
 *
 * The app gives each corner of a face the smooth normal of `studioNormals()` with the crease
 * angle of the body, the moves of the corrective shapes by their weights, and the skin matrix of
 * its vertex. Where two faces meet at an edge, the corners of the two faces at the same vertex can
 * take different normals: the shading then jumps along the edge, as a hard line. The jump of an
 * edge is the larger angle of the two vertices of the edge. A region is the posed edges whose
 * middle lies within `--root` m of the posed head of an upper arm, or within `--elbow` m of the
 * posed head of a forearm. For each region, the probe gives the length of the edges with a jump
 * over `--jump` degrees (cm), the sum of jump times length (°·cm), and the largest jump. It also
 * gives the concave posed edges sharper than 30° (the sum of angle times length, °·cm).
 * `--top <n>` lists the edges that jump most, with their faces and their bind angle.
 *
 * `--noshapes` leaves the normal moves of the shapes out, and `--noshapepos` the moves of the
 * shapes out of the skin. `--obj <dir>` writes the posed skin of the rest, and of the play at
 * each song time of `--times`, as OBJ files in meters, with the faces of the hard edges in
 * `<name>-folded.txt` for `obj-views.py` of `docs/research/2026-10-27-cat-fox/probes/`.
 *
 * Copy it to `scratch/` of a tree first, because it imports `../src/` and `../tools/`.
 * Usage: node scratch/crease.ts <role> [--demo <file prefix>] [--step <s>] [--root <m>]
 *   [--elbow <m>] [--jump <deg>] [--top <n>] [--sets rest,play,lift] [--noshapes]
 *   [--noshapepos] [--obj <dir> [--times <s,...>]] [--glb <file>]
 */
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

import { Matrix4, Vector3 } from 'three';

import { STUDIO_BONES } from '../src/models/studio-format.ts';
import { studioNormals } from '../src/models/studio-normals.ts';
import { skinStudioMesh } from '../src/models/studio-rig.ts';
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
    copyFileSync(new URL(import.meta.url).pathname, join(dir, 'scratch', 'crease.ts'));
    return new Promise<number>((done) => {
      const child = spawn(process.execPath, [join(dir, 'scratch', 'crease.ts'), ...args], {
        stdio: 'inherit',
      });
      child.on('close', (c) => done(c ?? 1));
    });
  });
  process.exit(code);
}
const prefix = opt('--demo', '');
const step = Number(opt('--step', '0.5'));
const rootR = Number(opt('--root', '0.12'));
const elbowR = Number(opt('--elbow', '0.08'));
const jumpLimit = Number(opt('--jump', '15'));
const top = Number(opt('--top', '0'));
const noShapes = args.includes("--noshapes");
const sets = opt('--sets', 'rest,play,lift').split(',');
const demos = (await probeDemos()).filter((d) => d.file.startsWith(prefix));
const idx = (name: string): number => STUDIO_BONES.findIndex((b) => b === name);
const DEG = 180 / Math.PI;

type Edge = { a: number; b: number; f1: number; f2: number; ca1: number; cb1: number; ca2: number; cb2: number; o1: number; o2: number };
let edges: Edge[] | null = null;
let base: Float32Array | null = null;
let moves: Float32Array[] = [];
const regions = ['root L', 'root R', 'elbow L', 'elbow R'] as const;
type Region = (typeof regions)[number];
type Row = { set: string; region: Region; hard: number; sum: number; worst: number; concave: number };
const rows: Row[] = [];
const edgeStat = new Map<number, { region: Region; hardIn: Map<string, number>; worst: number; worstLabel: string; bindAngle: number }>();
const setCount = new Map<string, number>();
const m4 = new Matrix4();
const objDir = args.includes('--obj') ? opt('--obj', '') : null;
const objTimes = opt('--times', '').split(',').filter(Boolean).map(Number);
const wrote = new Set<string>();
if (objDir) mkdirSync(objDir, { recursive: true });

probeFolds(
  role,
  demos,
  step,
  (rig, studio, posedApp, _folded, set, label) => {
    const mesh = rig.mesh;
    // With --noshapepos, the skin takes no corrective shape, to show what the shapes move.
    const posed = args.includes('--noshapepos')
      ? skinStudioMesh(mesh, { matrices: studio.matrices, correctives: new Float32Array(studio.correctives.length) })
      : posedApp;
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
            // Corner indices of a and b in both faces.
            const cornerOf = (f: number, v: number): number => {
              for (let j = 0; j < 3; j++) if (C[f * 3 + j] === v) return f * 3 + j;
              return -1;
            };
            const o1 = C[f1 * 3 + ((k1 + 2) % 3)]!;
            edges.push({ a: a1, b: a1 === a ? b : a, f1, f2: f, ca1: cornerOf(f1, a), cb1: cornerOf(f1, b), ca2: cornerOf(f, a), cb2: cornerOf(f, b), o1, o2: o });
          } else {
            map.set(key, [f, k]);
          }
        }
      }
      base = studioNormals(mesh, rig.body.crease, rig.body.caps, rig.body.rim);
      moves = mesh.correctives.map((corrective) => {
        const moved = mesh.positions.map((p, i) => p + (corrective[i] ?? 0));
        const after = studioNormals({ ...mesh, positions: moved }, rig.body.crease, rig.body.caps, rig.body.rim);
        return after.map((x, i) => x - base![i]!);
      });
    }
    setCount.set(set, (setCount.get(set) ?? 0) + 1);
    if (set === "rest" && setCount.get(set) === 1) console.log(`rest shapes: ${Array.from(studio.correctives.subarray(0, mesh.correctives.length)).map((w) => w.toFixed(2)).join(", ")}`);
    // The skin matrix of each vertex (3x3), as the app blends it.
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
        const w = noShapes ? 0 : (studio.correctives[s] ?? 0);
        x += w * move[c * 3]!;
        y += w * move[c * 3 + 1]!;
        z += w * move[c * 3 + 2]!;
      }
      const v = C[c]!;
      const M = mats.subarray(v * 9, v * 9 + 9);
      return new Vector3(M[0]! * x + M[3]! * y + M[6]! * z, M[1]! * x + M[4]! * y + M[7]! * z, M[2]! * x + M[5]! * y + M[8]! * z).normalize();
    };
    const p = (i: number): Vector3 => new Vector3(posed[i * 3]!, posed[i * 3 + 1]!, posed[i * 3 + 2]!);
    const bp = (i: number): Vector3 => new Vector3(mesh.positions[i * 3]!, mesh.positions[i * 3 + 1]!, mesh.positions[i * 3 + 2]!);
    const heads = rig.body.heads as unknown as Record<string, readonly [number, number, number]>;
    const joint = (bone: string): Vector3 => {
      m4.fromArray(studio.matrices, idx(bone) * 16);
      return new Vector3(...heads[bone]!).applyMatrix4(m4);
    };
    const centers: [Region, Vector3, number][] = [
      ['root L', joint('upper_arm_L'), rootR],
      ['root R', joint('upper_arm_R'), rootR],
      ['elbow L', joint('forearm_L'), elbowR],
      ['elbow R', joint('forearm_R'), elbowR],
    ];
    const hardFaces = new Set<number>();
    const acc = new Map<Region, Row>(regions.map((r) => [r, { set, region: r, hard: 0, sum: 0, worst: 0, concave: 0 }]));
    for (const [i, e] of edges.entries()) {
      const pa = p(e.a);
      const pb = p(e.b);
      const mid = pa.clone().add(pb).multiplyScalar(0.5);
      const found = centers.find(([, c, r]) => mid.distanceTo(c) < r);
      if (!found) continue;
      const region = found[0];
      const row = acc.get(region)!;
      const len = pa.distanceTo(pb) * 100;
      const ja = Math.acos(Math.max(-1, Math.min(1, cornerNormal(e.ca1).dot(cornerNormal(e.ca2))))) * DEG;
      const jb = Math.acos(Math.max(-1, Math.min(1, cornerNormal(e.cb1).dot(cornerNormal(e.cb2))))) * DEG;
      const jump = Math.max(ja, jb);
      if (jump > jumpLimit) {
        hardFaces.add(e.f1);
        hardFaces.add(e.f2);
        row.hard += len;
        row.sum += jump * len;
      }
      row.worst = Math.max(row.worst, jump);
      const n1 = pb.clone().sub(pa).cross(p(e.o1).sub(pa)).normalize();
      const n2 = p(e.o2).sub(pa).cross(pb.clone().sub(pa)).normalize();
      const angle = Math.acos(Math.max(-1, Math.min(1, n1.dot(n2)))) * DEG;
      // The sign of the bend: the far corner of the second face over the plane of the first is
      // concave. The winding of the second face runs b to a, so its normal uses o2 - a x b - a.
      const concave = p(e.o2).sub(pa).dot(n1) > 0;
      if (concave && angle > 30) row.concave += angle * len;
      if (top > 0) {
        let s = edgeStat.get(i);
        if (!s) {
          const B1 = bp(e.b).sub(bp(e.a)).cross(bp(e.o1).sub(bp(e.a))).normalize();
          const B2 = bp(e.o2).sub(bp(e.a)).cross(bp(e.b).sub(bp(e.a))).normalize();
          s = { region, hardIn: new Map(), worst: 0, worstLabel: '', bindAngle: Math.acos(Math.max(-1, Math.min(1, B1.dot(B2)))) * DEG };
          edgeStat.set(i, s);
        }
        if (jump > jumpLimit) s.hardIn.set(set, (s.hardIn.get(set) ?? 0) + 1);
        if (jump > s.worst) {
          s.worst = jump;
          s.worstLabel = `${set} ${label}`;
        }
      }
    }
    rows.push(...acc.values());
    const t = Number(/(-?[\d.]+) s$/.exec(label)?.[1]);
    const key = set === 'rest' ? 'rest' : set === 'play' && objTimes.some((w) => Math.abs(w - t) < step / 2) ? `play-${t.toFixed(1)}` : '';
    if (objDir && key && !wrote.has(key)) {
      wrote.add(key);
      const lines: string[] = [];
      for (let v = 0; v < nv; v++) lines.push(`v ${posed[v * 3]!.toFixed(5)} ${posed[v * 3 + 1]!.toFixed(5)} ${posed[v * 3 + 2]!.toFixed(5)}`);
      for (let f = 0; f < C.length; f += 3) lines.push(`f ${C[f]! + 1} ${C[f + 1]! + 1} ${C[f + 2]! + 1}`);
      writeFileSync(`${objDir}/${key}.obj`, lines.join('\n') + '\n');
      writeFileSync(`${objDir}/${key}-folded.txt`, [...hardFaces].join(' ') + '\n');
      const js = centers.map(([r, c]) => `${r}: ${c.toArray().map((x) => x.toFixed(4)).join(',')}`);
      writeFileSync(`${objDir}/${key}-joints.txt`, js.join('\n') + '\n');
    }
  },
  sets as never,
);
const q = (xs: number[], f: number): number => {
  const s = xs.toSorted((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(f * (s.length - 1)))] ?? NaN;
};
console.log(`Hard lines of ${roleName}: jump over ${jumpLimit}°, root ${rootR} m, elbow ${elbowR} m, step ${step} s, demos ${demos.length}${glb ? `, glb ${glb}` : ''}`);
console.log('| Set | Region | n | hard cm p50 / p95 | jump·cm p50 / p95 | worst jump p50 / max | concave °·cm p50 / p95 |');
console.log('|---|---|---:|---|---|---|---|');
for (const set of sets) {
  for (const region of regions) {
    const rs = rows.filter((r) => r.set === set && r.region === region);
    if (!rs.length) continue;
    const f = (k: 'hard' | 'sum' | 'worst' | 'concave', pr: number, d = 1): string => q(rs.map((r) => r[k]), pr).toFixed(d);
    console.log(`| ${set} | ${region} | ${rs.length} | ${f('hard', 0.5)} / ${f('hard', 0.95)} | ${f('sum', 0.5, 0)} / ${f('sum', 0.95, 0)} | ${f('worst', 0.5, 0)} / ${f('worst', 1, 0)} | ${f('concave', 0.5, 0)} / ${f('concave', 0.95, 0)} |`);
  }
}
if (top > 0 && edges) {
  const E = edges as Edge[];
  const list = [...edgeStat.entries()].toSorted((x, y) => y[1].worst - x[1].worst).slice(0, top);
  console.log('');
  console.log('| Edge (a-b) | Faces | Region | Bind angle | Worst jump | Worst sample | Hard samples by set |');
  console.log('|---|---|---|---:|---:|---|---|');
  for (const [i, s] of list) {
    const e = E[i]!;
    const shares = sets.map((set) => `${set} ${(((s.hardIn.get(set) ?? 0) / (setCount.get(set) ?? 1)) * 100).toFixed(0)}%`).join(', ');
    console.log(`| ${e.a}-${e.b} | ${e.f1}, ${e.f2} | ${s.region} | ${s.bindAngle.toFixed(0)} | ${s.worst.toFixed(0)} | ${s.worstLabel} | ${shares} |`);
  }
}
