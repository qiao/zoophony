/**
 * Probe of the elbow form of a studio body over the samples of `pnpm fold-probe`.
 *
 * For each arm and each sample:
 * - bend: the angle between the posed upper arm and the posed forearm, in degrees.
 * - above / below: the narrow / wide ratio of a ring of the arm at 0.85 of the upper arm and at
 *   0.15 of the forearm, in the plane normal to the posed bone.
 * - mid: the ratio of the ring in the plane through the elbow joint, normal to the bisector of the
 *   two bones (bind plane for the vertices, posed plane for the ratio), and its mean radius as a
 *   share of the bind (collapse).
 * - flat: the area of the largest connected patch of elbow faces whose normals lie within 12° of
 *   one another, as a share of the area of all elbow faces. Elbow faces: each corner has weight on
 *   both the upper arm (and twist) and the forearm (and twist), or lies within 0.45 upper arm
 *   lengths of the elbow joint with weight on the arm of 0.9 or more.
 *
 * Usage: node scratch/elbow-look.ts <role> [--glb <file>] [--demo <id>]... [--step <s>]
 *   [--dump <label substring> <out.obj>] [--json <file>] [--faces]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { cpSync } from 'node:fs';
import { join } from 'node:path';

import { Vector3 } from 'three';

import { FOLD_ROLES, probeFolds, roleAnimal } from '../tools/fold-probe.ts';
import { runTool, takeGlb, withGlbBody } from '../tools/glb-swap.ts';
import { probeDemos } from '../tools/probe-demos.ts';
import { STUDIO_BONES } from '../src/models/studio-format.ts';
import type { Side, StudioBone, StudioMesh } from '../src/models/studio-format.ts';
import { UPPER_TWIST_BONES } from '../src/models/studio-rig.ts';
import type { StudioRig } from '../src/models/studio-rig.ts';

const boneAt = (b: StudioBone): number => STUDIO_BONES.indexOf(b);

function weightOn(mesh: StudioMesh, v: number, bones: readonly number[]): number {
  let s = 0;
  for (let k = 0; k < 4; k++) {
    if (bones.includes(mesh.joints[v * 4 + k] ?? -1)) s += mesh.weights[v * 4 + k] ?? 0;
  }
  return s;
}

function mat(m: ArrayLike<number>, b: number, p: Vector3): Vector3 {
  const o = b * 16;
  const x = p.x;
  const y = p.y;
  const z = p.z;
  return new Vector3(
    (m[o] ?? 0) * x + (m[o + 4] ?? 0) * y + (m[o + 8] ?? 0) * z + (m[o + 12] ?? 0),
    (m[o + 1] ?? 0) * x + (m[o + 5] ?? 0) * y + (m[o + 9] ?? 0) * z + (m[o + 13] ?? 0),
    (m[o + 2] ?? 0) * x + (m[o + 6] ?? 0) * y + (m[o + 10] ?? 0) * z + (m[o + 14] ?? 0),
  );
}

function ratio(points: readonly Vector3[], axis: Vector3): { r: number; mean: number } {
  if (points.length < 3) return { r: 1, mean: 0 };
  const e1 = new Vector3(1, 0, 0);
  if (Math.abs(axis.x) > 0.9) e1.set(0, 1, 0);
  e1.addScaledVector(axis, -e1.dot(axis)).normalize();
  const e2 = new Vector3().crossVectors(axis, e1);
  const n = points.length;
  const mx = points.reduce((s, p) => s + p.dot(e1), 0) / n;
  const my = points.reduce((s, p) => s + p.dot(e2), 0) / n;
  let xx = 0;
  let yy = 0;
  let xy = 0;
  let mean = 0;
  for (const p of points) {
    const a = p.dot(e1) - mx;
    const b = p.dot(e2) - my;
    xx += (a * a) / n;
    yy += (b * b) / n;
    xy += (a * b) / n;
    mean += Math.hypot(a, b) / n;
  }
  const half = (xx + yy) / 2;
  const root = Math.sqrt(Math.max(0, half * half - (xx * yy - xy * xy)));
  return { r: Math.sqrt(Math.max(0, half - root)) / Math.sqrt(Math.max(1e-12, half + root)), mean };
}

interface Ring {
  edges: number[];
  along: number[];
}

/** Cuts the bind edges of the arm with a plane. */
function ringOf(
  mesh: StudioMesh,
  edges: readonly [number, number][],
  point: Vector3,
  normal: Vector3,
  arm: readonly number[],
): Ring {
  const pos = mesh.positions;
  const at = (v: number): Vector3 => new Vector3().fromArray(pos, v * 3);
  const cand: { a: number; b: number; t: number; d: number }[] = [];
  for (const [a, b] of edges) {
    if (weightOn(mesh, a, arm) < 0.25 || weightOn(mesh, b, arm) < 0.25) continue;
    const da = at(a).sub(point).dot(normal);
    const db = at(b).sub(point).dot(normal);
    if (da * db >= 0) continue;
    const t = da / (da - db);
    const p = at(a).lerp(at(b), t).sub(point);
    p.addScaledVector(normal, -p.dot(normal));
    cand.push({ a, b, t, d: p.length() });
  }
  const sorted = cand.map((c) => c.d).toSorted((x, y) => x - y);
  const med = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const kept = cand.filter((c) => c.d <= 2 * med);
  return { edges: kept.flatMap((c) => [c.a, c.b]), along: kept.map((c) => c.t) };
}

function ringPoints(ring: Ring, places: ArrayLike<number>): Vector3[] {
  return ring.along.map((t, k) => {
    const p = new Vector3().fromArray(places, (ring.edges[k * 2] ?? 0) * 3);
    const q = new Vector3().fromArray(places, (ring.edges[k * 2 + 1] ?? 0) * 3);
    return p.lerp(q, t);
  });
}

interface ArmFacts {
  side: Side;
  bones: { upper: number; fore: number; twist: number; foreTwist: number; hand: number };
  shoulder: Vector3;
  elbow: Vector3;
  wrist: Vector3;
  above: Ring;
  below: Ring;
  mid: Ring;
  midBindMean: number;
  faces: number[];
  faceAdj: Map<number, number[]>;
  armTris: number[];
}

function meshEdges(corners: Uint32Array): [number, number][] {
  const seen = new Set<number>();
  const out: [number, number][] = [];
  for (let f = 0; f < corners.length / 3; f++) {
    for (let k = 0; k < 3; k++) {
      const u = corners[f * 3 + k] ?? 0;
      const v = corners[f * 3 + ((k + 1) % 3)] ?? 0;
      const a = Math.min(u, v);
      const b = Math.max(u, v);
      const key = a * 0x10000 + b;
      if (!seen.has(key)) {
        seen.add(key);
        out.push([a, b]);
      }
    }
  }
  return out;
}

function armFacts(rig: StudioRig, side: Side): ArmFacts {
  const { mesh } = rig;
  const h = rig.body.heads;
  const shoulder = new Vector3(...h[`upper_arm_${side}`]);
  const elbow = new Vector3(...h[`forearm_${side}`]);
  const wrist = new Vector3(...h[`hand_${side}`]);
  const bones = {
    upper: boneAt(`upper_arm_${side}`),
    twist: UPPER_TWIST_BONES[side],
    fore: boneAt(`forearm_${side}`),
    foreTwist: boneAt(`forearm_twist_${side}`),
    hand: boneAt(`hand_${side}`),
  };
  const arm = [bones.upper, bones.twist, bones.fore, bones.foreTwist, bones.hand, boneAt(`fingers_${side}`)];
  const edges = meshEdges(mesh.corners);
  const ua = elbow.clone().sub(shoulder).normalize();
  const fa = wrist.clone().sub(elbow).normalize();
  const upLen = elbow.distanceTo(shoulder);
  const foreLen = wrist.distanceTo(elbow);
  const above = ringOf(mesh, edges, shoulder.clone().lerp(elbow, 0.85), ua, arm);
  const below = ringOf(mesh, edges, elbow.clone().addScaledVector(fa, 0.15 * foreLen), fa, arm);
  const bis = ua.clone().add(fa).normalize();
  const mid = ringOf(mesh, edges, elbow, bis, arm);
  const midBindMean = ratio(ringPoints(mid, mesh.positions), bis).mean;

  const upperSet = [bones.upper, bones.twist];
  const foreSet = [bones.fore, bones.foreTwist];
  const faces: number[] = [];
  for (let f = 0; f < mesh.corners.length / 3; f++) {
    const cs = [0, 1, 2].map((k) => mesh.corners[f * 3 + k] ?? 0);
    const ok = cs.every((v) => {
      const wu = weightOn(mesh, v, upperSet);
      const wf = weightOn(mesh, v, foreSet);
      const near = new Vector3().fromArray(mesh.positions, v * 3).distanceTo(elbow) <= 0.45 * upLen;
      return (wu >= 0.05 && wf >= 0.05) || (near && wu + wf >= 0.9);
    });
    if (ok) faces.push(f);
  }
  const set = new Set(faces);
  const byEdge = new Map<number, number[]>();
  for (const f of faces) {
    for (let k = 0; k < 3; k++) {
      const u = mesh.corners[f * 3 + k] ?? 0;
      const v = mesh.corners[f * 3 + ((k + 1) % 3)] ?? 0;
      const key = Math.min(u, v) * 0x10000 + Math.max(u, v);
      byEdge.set(key, [...(byEdge.get(key) ?? []), f]);
    }
  }
  const faceAdj = new Map<number, number[]>();
  for (const fs of byEdge.values()) {
    if (fs.length === 2) {
      const [a = 0, b = 0] = fs;
      if (set.has(a) && set.has(b)) {
        faceAdj.set(a, [...(faceAdj.get(a) ?? []), b]);
        faceAdj.set(b, [...(faceAdj.get(b) ?? []), a]);
      }
    }
  }
  void foreLen;
  const armTris: number[] = [];
  for (let k = 0; k < mesh.corners.length / 3; k++) {
    if ([0, 1, 2].some((j) => weightOn(mesh, mesh.corners[k * 3 + j] ?? 0, arm) >= 0.25)) armTris.push(k);
  }
  return { side, bones, shoulder, elbow, wrist, above, below, mid, midBindMean, faces, faceAdj, armTris };
}

function faceGeo(places: ArrayLike<number>, corners: Uint32Array, f: number): { n: Vector3; area: number } {
  const a = new Vector3().fromArray(places, (corners[f * 3] ?? 0) * 3);
  const b = new Vector3().fromArray(places, (corners[f * 3 + 1] ?? 0) * 3);
  const c = new Vector3().fromArray(places, (corners[f * 3 + 2] ?? 0) * 3);
  const n = new Vector3().crossVectors(b.sub(a), c.sub(a));
  const area = n.length() / 2;
  return { n: n.normalize(), area };
}

/** The largest connected patch of faces with normals within `limit` degrees of its seed. */
function flatPatch(
  facts: ArmFacts,
  places: ArrayLike<number>,
  corners: Uint32Array,
  limit = 12,
): { share: number; area: number; faces: number[] } {
  const geo = new Map(facts.faces.map((f) => [f, faceGeo(places, corners, f)]));
  const total = [...geo.values()].reduce((s, g) => s + g.area, 0);
  const cos = Math.cos((limit * Math.PI) / 180);
  let best = { area: 0, faces: [] as number[] };
  for (const seed of facts.faces) {
    const n0 = geo.get(seed)?.n;
    if (!n0) continue;
    const seen = new Set([seed]);
    const stack = [seed];
    let area = 0;
    while (stack.length > 0) {
      const f = stack.pop() ?? 0;
      area += geo.get(f)?.area ?? 0;
      for (const g of facts.faceAdj.get(f) ?? []) {
        if (!seen.has(g) && (geo.get(g)?.n.dot(n0) ?? 0) >= cos) {
          seen.add(g);
          stack.push(g);
        }
      }
    }
    if (area > best.area) best = { area, faces: [...seen] };
  }
  return { share: total > 0 ? best.area / total : 0, area: best.area, faces: best.faces };
}

/** The nearest hit of a ray with some faces, or NaN. */
function rayHit(rig: StudioRig, tris: readonly number[], places: ArrayLike<number>, o: Vector3, d: Vector3): number {
  const c = rig.mesh.corners;
  let best = Number.NaN;
  const a = new Vector3();
  const b = new Vector3();
  const q = new Vector3();
  for (const f of tris) {
    const p0 = new Vector3().fromArray(places, (c[f * 3] ?? 0) * 3);
    a.fromArray(places, (c[f * 3 + 1] ?? 0) * 3).sub(p0);
    b.fromArray(places, (c[f * 3 + 2] ?? 0) * 3).sub(p0);
    const pv = new Vector3().crossVectors(d, b);
    const det = a.dot(pv);
    if (Math.abs(det) < 1e-12) continue;
    const tv = o.clone().sub(p0);
    const u = tv.dot(pv) / det;
    if (u < 0 || u > 1) continue;
    q.crossVectors(tv, a);
    const v = d.dot(q) / det;
    if (v < 0 || u + v > 1) continue;
    const t = b.dot(q) / det;
    if (t > 0 && !(t >= best)) best = t;
  }
  return best;
}

interface Sample {
  label: string;
  set: string;
  bend: number;
  above: number;
  below: number;
  mid: number;
  collapse: number;
  flat: number;
  flatCm2: number;
  flatFaces: number[];
  outer: number;
}

function measure(rig: StudioRig, f: ArmFacts, m: ArrayLike<number>, posed: ArrayLike<number>): Omit<Sample, 'label' | 'set'> {
  const s = mat(m, f.bones.upper, f.shoulder);
  const e = mat(m, f.bones.fore, f.elbow);
  const w = mat(m, f.bones.hand, f.wrist);
  const ua = e.clone().sub(s).normalize();
  const fa = w.clone().sub(e).normalize();
  const bend = (Math.acos(Math.max(-1, Math.min(1, ua.dot(fa)))) * 180) / Math.PI;
  const bis = ua.clone().add(fa).normalize();
  const mid = ratio(ringPoints(f.mid, posed), bis);
  const patch = flatPatch(f, posed, rig.mesh.corners);
  // The outer elbow: the distance from the joint to the skin along the direction away from the
  // bend, as a share of the mean radius of the forearm ring next to the elbow.
  const out = ua.clone().sub(fa);
  let outer = Number.NaN;
  if (out.length() > 0.2) {
    out.normalize();
    const hit = rayHit(rig, f.armTris, posed, e, out);
    const below = ratio(ringPoints(f.below, posed), fa).mean;
    outer = below > 0 ? hit / below : Number.NaN;
  }
  return {
    outer,
    bend,
    above: ratio(ringPoints(f.above, posed), ua).r,
    below: ratio(ringPoints(f.below, posed), fa).r,
    mid: mid.r,
    collapse: f.midBindMean > 0 ? mid.mean / f.midBindMean : 1,
    flat: patch.share,
    flatCm2: patch.area * 1e4,
    flatFaces: patch.faces,
  };
}

function pct(values: number[], q: number): number {
  const s = values.toSorted((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.floor(q * (s.length - 1))))] ?? Number.NaN;
}

function writeObj(rig: StudioRig, posed: ArrayLike<number>, file: string, mark: Set<number>): void {
  const lines: string[] = [];
  for (let v = 0; v < posed.length / 3; v++) {
    lines.push(`v ${posed[v * 3]} ${posed[v * 3 + 1]} ${posed[v * 3 + 2]}`);
  }
  const c = rig.mesh.corners;
  lines.push('g body');
  for (let f = 0; f < c.length / 3; f++) {
    if (!mark.has(f)) lines.push(`f ${(c[f * 3] ?? 0) + 1} ${(c[f * 3 + 1] ?? 0) + 1} ${(c[f * 3 + 2] ?? 0) + 1}`);
  }
  lines.push('g marked');
  for (const f of mark) lines.push(`f ${(c[f * 3] ?? 0) + 1} ${(c[f * 3 + 1] ?? 0) + 1} ${(c[f * 3 + 2] ?? 0) + 1}`);
  writeFileSync(file, lines.join('\n'));
}

async function main(): Promise<void> {
  const { glb, rest: args } = takeGlb(process.argv.slice(2));
  const role = args[0] ?? 'violinist';
  const source = FOLD_ROLES.get(role);
  if (!source) throw new Error(`no role ${role}`);
  if (glb) {
    const code = await withGlbBody(roleAnimal(source), glb, (dir) => {
      cpSync(import.meta.filename, join(dir, 'tools', 'elbow-look-copy.ts'));
      return runTool(dir, 'elbow-look-copy.ts', args);
    });
    process.exitCode = code;
    return;
  }
  const chosen = args.flatMap((a, i) => (args[i - 1] === '--demo' ? [a.endsWith('.mid') ? a : `${a}.mid`] : []));
  const stepAt = args.indexOf('--step');
  const step = stepAt >= 0 ? Number(args[stepAt + 1]) : 1;
  const dumpAt = args.indexOf('--dump');
  const dumpLabel = dumpAt >= 0 ? args[dumpAt + 1] : undefined;
  const dumpFile = dumpAt >= 0 ? args[dumpAt + 2] : undefined;
  const jsonAt = args.indexOf('--json');
  const all = await probeDemos();
  const demos = chosen.length > 0 ? all.filter((d) => chosen.includes(d.file)) : all;
  const facts = new WeakMap<StudioRig, Record<Side, ArmFacts>>();
  const out: Record<Side, Sample[]> = { L: [], R: [] };
  let bindDone = false;
  const faceCount: Record<Side, Map<number, number>> = { L: new Map(), R: new Map() };
  probeFolds(source, demos, step, (rig, studio, posed, _folded, set, label) => {
    let f = facts.get(rig);
    if (!f) {
      f = { L: armFacts(rig, 'L'), R: armFacts(rig, 'R') };
      facts.set(rig, f);
    }
    if (!bindDone) {
      bindDone = true;
      const bindAt = args.indexOf('--bind');
      if (bindAt >= 0) {
        writeObj(rig, rig.mesh.positions, args[bindAt + 1] ?? 'bind.obj', new Set());
        const armFaces: Record<string, number[]> = { L: [], R: [] };
        for (const side of ['L', 'R'] as const) {
          const a = f[side];
          const bonesArm = [a.bones.upper, a.bones.twist, a.bones.fore, a.bones.foreTwist, a.bones.hand];
          for (let k = 0; k < rig.mesh.corners.length / 3; k++) {
            if ([0, 1, 2].every((j) => weightOn(rig.mesh, rig.mesh.corners[k * 3 + j] ?? 0, bonesArm) >= 0.5)) {
              armFaces[side]?.push(k);
            }
            const cs = [0, 1, 2].map((j) => rig.mesh.corners[k * 3 + j] ?? 0);
            if (cs.every((v) => weightOn(rig.mesh, v, [a.bones.upper, a.bones.twist]) >= 0.5)) {
              (armFaces[`${side}U`] ??= []).push(k);
            }
            if (cs.every((v) => weightOn(rig.mesh, v, [a.bones.fore, a.bones.foreTwist, a.bones.hand]) >= 0.5)) {
              (armFaces[`${side}F`] ??= []).push(k);
            }
          }
        }
        writeFileSync(`${args[bindAt + 1] ?? 'bind.obj'}.arms.json`, JSON.stringify(armFaces));
        for (const side of ['L', 'R'] as const) {
          const a = f[side];
          console.log(`bind joints ${side} ${JSON.stringify([a.shoulder, a.elbow, a.wrist].map((p) => [p.x, p.y, p.z]))}`);
        }
      }
      for (const side of ['L', 'R'] as const) {
        const a = f[side];
        const bindP = flatPatch(a, rig.mesh.positions, rig.mesh.corners);
        const ua0 = a.elbow.clone().sub(a.shoulder).normalize();
        const fa0 = a.wrist.clone().sub(a.elbow).normalize();
        const bis0 = ua0.clone().add(fa0).normalize();
        const out0 = ua0.clone().sub(fa0).normalize();
        const hit0 = rayHit(rig, a.armTris, rig.mesh.positions, a.elbow, out0);
        const r0 = ratio(ringPoints(a.below, rig.mesh.positions), fa0).mean;
        const cornersAt = args.indexOf('--corners');
        if (cornersAt >= 0) {
          const list = (JSON.parse(readFileSync(args[cornersAt + 1] ?? '', 'utf8')) as unknown[]).filter((x) => x !== 'eye');
          const src = new Float32Array(rig.mesh.positions.length).fill(Number.NaN);
          list.forEach((item, k) => {
            if (item && typeof item === 'object') {
              const sc = (item as { s: number[][] }).s;
              for (let j = 0; j < 3; j++) {
                const v = rig.mesh.corners[k * 3 + j] ?? 0;
                src.set(sc[j] ?? [0, 0, 0], v * 3);
              }
            }
          });
          const cfg = JSON.parse(readFileSync(args[args.indexOf('--config') + 1] ?? '', 'utf8')) as { joints: Record<string, { head: number[] }> };
          const sg = side === 'L' ? 1 : -1;
          const hj = (n: string): Vector3 => {
            const [x = 0, y = 0, z = 0] = cfg.joints[`${n}_L`]?.head ?? [];
            return new Vector3(x * sg, y, z);
          };
          const s0 = hj('upper_arm');
          const e0 = hj('forearm');
          const w0 = hj('hand');
          const u1 = e0.clone().sub(s0).normalize();
          const f1 = w0.clone().sub(e0).normalize();
          const b1 = u1.clone().add(f1).normalize();
          const pick = (ring: Ring): Vector3[] => ringPoints(ring, src).filter((p) => Number.isFinite(p.x));
          console.log(
            `source ${side} sections: above ${ratio(pick(a.above), u1).r.toFixed(2)}, mid ${ratio(pick(a.mid), b1).r.toFixed(2)}, below ${ratio(pick(a.below), f1).r.toFixed(2)}, bend ${((Math.acos(u1.dot(f1)) * 180) / Math.PI).toFixed(0)}`,
          );
        }
        console.log(
          `bind ${side} sections: above ${ratio(ringPoints(a.above, rig.mesh.positions), ua0).r.toFixed(2)}, mid ${ratio(ringPoints(a.mid, rig.mesh.positions), bis0).r.toFixed(2)}, below ${ratio(ringPoints(a.below, rig.mesh.positions), fa0).r.toFixed(2)}, bend ${((Math.acos(ua0.dot(fa0)) * 180) / Math.PI).toFixed(0)}, outer ${(hit0 / r0).toFixed(2)}, above girth / upper arm ${((2 * ratio(ringPoints(a.above, rig.mesh.positions), ua0).mean) / a.elbow.distanceTo(a.shoulder)).toFixed(2)}, upper arm ${(100 * a.elbow.distanceTo(a.shoulder)).toFixed(1)} cm, mid girth ${(200 * ratio(ringPoints(a.mid, rig.mesh.positions), bis0).mean).toFixed(1)} cm`,
        );
        console.log(
          `bind ${side}: elbow faces ${a.faces.length}, ring above ${a.above.along.length}, below ${a.below.along.length}, mid ${a.mid.along.length}, flat share ${bindP.share.toFixed(2)} (${(bindP.area * 1e4).toFixed(1)} cm2), faces ${bindP.faces.join(',')}`,
        );
      }
    }
    for (const side of ['L', 'R'] as const) {
      const s = { label, set, ...measure(rig, f[side], studio.matrices, posed) };
      out[side].push(s);
      if (set === 'play') {
        for (const x of s.flatFaces) faceCount[side].set(x, (faceCount[side].get(x) ?? 0) + 1);
      }
    }
    if (dumpLabel && dumpFile && label.includes(dumpLabel)) {
      const markAt = args.indexOf('--mark');
      const mark = new Set(
        markAt >= 0
          ? (args[markAt + 1] ?? '').split(',').map(Number)
          : measure(rig, f.R, studio.matrices, posed).flatFaces,
      );
      writeObj(rig, posed, dumpFile, mark);
      for (const side of ['L', 'R'] as const) {
        const a = f[side];
        const m = studio.matrices;
        const pts = [mat(m, a.bones.upper, a.shoulder), mat(m, a.bones.fore, a.elbow), mat(m, a.bones.hand, a.wrist)];
        console.log(`joints ${side} ${JSON.stringify(pts.map((p) => [p.x, p.y, p.z]))}`);
      }
      console.log(`dumped ${label} to ${dumpFile}, marked ${[...mark].join(',')}`);
    }
  });
  console.log('| Set | Side | n | bend p50 | outer p50 / p5 | above p50 / p5 | below p50 / p5 | mid p50 / p5 | collapse p50 / p5 | flat p50 / p95 | flat cm2 p50 / p95 |');
  console.log('|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const set of ['rest', 'play', 'lift']) {
    for (const side of ['L', 'R'] as const) {
      const ss = out[side].filter((s) => s.set === set);
      if (ss.length === 0) continue;
      const g = (k: keyof Sample, q: number): string => pct(ss.map((s) => s[k] as number), q).toFixed(2);
      console.log(
        `| ${set} | ${side} | ${ss.length} | ${g('bend', 0.5)} | ${g('outer', 0.5)} / ${g('outer', 0.05)} | ${g('above', 0.5)} / ${g('above', 0.05)} | ${g('below', 0.5)} / ${g('below', 0.05)} | ${g('mid', 0.5)} / ${g('mid', 0.05)} | ${g('collapse', 0.5)} / ${g('collapse', 0.05)} | ${g('flat', 0.5)} / ${g('flat', 0.95)} | ${g('flatCm2', 0.5)} / ${g('flatCm2', 0.95)} |`,
      );
    }
  }
  for (const side of ['L', 'R'] as const) {
    const top = [...faceCount[side]].toSorted((a, b) => b[1] - a[1]).slice(0, 12);
    console.log(`flat patch faces ${side}: ${top.map(([f, n]) => `${f}:${n}`).join(' ')}`);
    const worst = out[side].filter((s) => s.set === 'play').toSorted((a, b) => a.mid - b.mid).slice(0, 3);
    console.log(`worst mid ${side}: ${worst.map((s) => `${s.label} mid ${s.mid.toFixed(2)} bend ${s.bend.toFixed(0)}`).join('; ')}`);
  }
  if (jsonAt >= 0) {
    writeFileSync(args[jsonAt + 1] ?? 'elbow.json', JSON.stringify(out));
  }
}

await main();
