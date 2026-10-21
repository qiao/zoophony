/**
 * Measures the look of the skin of the upper arm and the shoulder of a role: the share of new
 * creases (edges whose fold angle is above CREASE in the pose, but not in the bind), of thin
 * faces (shape quality below THIN), of stretched or crushed faces (area against the bind), of
 * turned faces, and the cross-section aspect (narrow / wide axis) of the upper arm rings.
 *
 * Usage: node scratch/arm-look.ts <role> [--glb <file>] [--step <s>] [--demo <id>]...
 */
import { copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { Matrix4, Vector3 } from 'three';

import { FOLD_ROLES, probeFolds, roleAnimal } from '../tools/fold-probe.ts';
import type { SampleSet } from '../tools/fold-probe.ts';
import { runTool, takeGlb, withGlbBody } from '../tools/glb-swap.ts';
import { patchedDemos } from '../tools/patch-demos.ts';
import { setHolds } from '../tools/hold-sets.ts';
import { armBinds } from '../tools/arm-shape.ts';
import { STUDIO_BONES } from '../src/models/studio-format.ts';
import type { Side, StudioBone, StudioMesh } from '../src/models/studio-format.ts';
import { UPPER_TWIST_BONES } from '../src/models/studio-rig.ts';
import type { StudioRig } from '../src/models/studio-rig.ts';

const CREASE = 50; // degrees between two face normals
const THIN = 0.12; // 4 sqrt(3) A / (a^2 + b^2 + c^2): 1 for an equal triangle
const WEIGHT = 0.05;
const REACH = Number(process.env['ARM_REACH'] ?? '1e9'); // shares of the upper arm length from the shoulder joint
const SHIFT = 40; // degrees: a crease change against the source above this is a new crease


interface SourceFace {
  s: number[][];
  l: number[][];
}
let SOURCES: (SourceFace | null)[] | null = null;
let SCALE2 = 1; // the square of meters per unit, from the median area ratio of the bind

interface Region {
  srcNormal: Vector3[]; // the normal of the long-armed source face, or a zero vector
  srcArea: number[]; // the area of the long-armed source face times SCALE2
  srcQuality: number[];
  rawArea: number[]; // the area of the unstretched source face times SCALE2
  faces: number[];
  edges: [number, number][]; // pairs of region faces that share an edge
  bindArea: number[];
  bindNormal: Vector3[];
  bindCrease: boolean[];
  bindThin: boolean[];
}

const regions = new WeakMap<StudioRig, Record<Side, Region>>();

function boneAt(bone: StudioBone): number {
  return STUDIO_BONES.indexOf(bone);
}

function weightOn(mesh: StudioMesh, v: number, bones: readonly number[]): number {
  let sum = 0;
  for (let k = 0; k < 4; k++) {
    if (bones.includes(mesh.joints[v * 4 + k] ?? -1)) {
      sum += mesh.weights[v * 4 + k] ?? 0;
    }
  }
  return sum;
}

function tri(pos: ArrayLike<number>, corners: Uint32Array, f: number): [Vector3, Vector3, Vector3] {
  const p = (k: number) => new Vector3().fromArray(pos, (corners[f * 3 + k] ?? 0) * 3);
  return [p(0), p(1), p(2)];
}

function faceFacts(pos: ArrayLike<number>, corners: Uint32Array, f: number) {
  const [a, b, c] = tri(pos, corners, f);
  const n = new Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a));
  const area = n.length() / 2;
  const sq = a.distanceToSquared(b) + b.distanceToSquared(c) + c.distanceToSquared(a);
  const quality = sq > 0 ? (4 * Math.sqrt(3) * area) / sq : 0;
  return { area, normal: n.normalize(), quality };
}

function angle(a: Vector3, b: Vector3): number {
  return (Math.acos(Math.max(-1, Math.min(1, a.dot(b)))) * 180) / Math.PI;
}

function regionOf(rig: StudioRig, side: Side): Region {
  const { mesh } = rig;
  const h = rig.body.heads;
  const shoulder = new Vector3(...h[`upper_arm_${side}`]);
  const elbow = new Vector3(...h[`forearm_${side}`]);
  const reach = REACH * shoulder.distanceTo(elbow);
  const bones = [boneAt(`upper_arm_${side}`), UPPER_TWIST_BONES[side], boneAt(`clavicle_${side}`)];
  const faces: number[] = [];
  const count = mesh.corners.length / 3;
  for (let f = 0; f < count; f++) {
    const [a, b, c] = tri(mesh.positions, mesh.corners, f);
    const middle = a.add(b).add(c).multiplyScalar(1 / 3);
    let on = false;
    for (let k = 0; k < 3; k++) {
      on ||= weightOn(mesh, mesh.corners[f * 3 + k] ?? 0, bones) >= WEIGHT;
    }
    if (on && middle.distanceTo(shoulder) <= reach) {
      faces.push(f);
    }
  }
  const index = new Map(faces.map((f, i) => [f, i]));
  const byEdge = new Map<number, number[]>();
  for (const f of faces) {
    for (let k = 0; k < 3; k++) {
      const u = mesh.corners[f * 3 + k] ?? 0;
      const v = mesh.corners[f * 3 + ((k + 1) % 3)] ?? 0;
      const key = Math.min(u, v) * 0x10000 + Math.max(u, v);
      byEdge.set(key, [...(byEdge.get(key) ?? []), index.get(f) ?? 0]);
    }
  }
  const edges: [number, number][] = [];
  for (const list of byEdge.values()) {
    if (list.length === 2) {
      edges.push([list[0] ?? 0, list[1] ?? 0]);
    }
  }
  const facts = faces.map((f) => faceFacts(mesh.positions, mesh.corners, f));
  const srcFacts = faces.map((f) => {
    const src = SOURCES?.[f];
    if (!src) return null;
    const flat = (c: number[][]) => new Float32Array(c.flat());
    const ids = new Uint32Array([0, 1, 2]);
    return { l: faceFacts(flat(src.l), ids, 0), s: faceFacts(flat(src.s), ids, 0) };
  });
  return {
    srcNormal: srcFacts.map((x) => x?.l.normal ?? new Vector3()),
    srcArea: srcFacts.map((x) => (x ? x.l.area * SCALE2 : 0)),
    srcQuality: srcFacts.map((x) => x?.l.quality ?? 0),
    rawArea: srcFacts.map((x) => (x ? x.s.area * SCALE2 : 0)),
    faces,
    edges,
    bindArea: facts.map((x) => x.area),
    bindNormal: facts.map((x) => x.normal),
    bindCrease: edges.map(
      ([i, j]) => angle(facts[i]?.normal ?? new Vector3(), facts[j]?.normal ?? new Vector3()) > CREASE,
    ),
    bindThin: facts.map((x) => x.quality < THIN),
  };
}

interface Sample {
  creases: number; // new creases, share of the edges
  creasesAll: number; // all creases in the pose, share of the edges
  thin: number; // thin faces in the pose, share
  thinNew: number; // thin in the pose and not in the bind, share
  stretched: number; // area above 2 times the bind
  crushed: number; // area below 0.5 times the bind
  turned: number; // normal turned more than 90 degrees from the bind
  aspect: number[]; // narrow / wide axis of the rings 0.15, 0.5, 0.85 of the upper arm
  srcCrease: number; // edges whose fold angle differs from the long-armed source by > SHIFT
  srcStretch: number; // faces with area > 2 times the long-armed source
  srcCrush: number; // faces with area < 0.5 times the long-armed source
  srcThin: number; // faces with quality < half of the long-armed source quality
  rawStretch: number; // faces with area > 2 times the unstretched source
  worst: number[]; // the module faces of the largest crease changes
}

function matrixOf(matrices: ArrayLike<number>, bone: number): Matrix4 {
  return new Matrix4().fromArray(Array.from({ length: 16 }, (_, k) => matrices[bone * 16 + k] ?? 0));
}

function aspectOf(points: Vector3[], axis: Vector3): number {
  const e1 = new Vector3(1, 0, 0);
  if (Math.abs(axis.x) > 0.9) e1.set(0, 1, 0);
  e1.addScaledVector(axis, -e1.dot(axis)).normalize();
  const e2 = new Vector3().crossVectors(axis, e1);
  const n = points.length;
  if (n < 3) return 1;
  let mx = 0;
  let my = 0;
  for (const p of points) {
    mx += p.dot(e1) / n;
    my += p.dot(e2) / n;
  }
  let xx = 0;
  let yy = 0;
  let xy = 0;
  for (const p of points) {
    const a = p.dot(e1) - mx;
    const b = p.dot(e2) - my;
    xx += (a * a) / n;
    yy += (b * b) / n;
    xy += (a * b) / n;
  }
  const half = (xx + yy) / 2;
  const root = Math.sqrt(Math.max(0, half * half - (xx * yy - xy * xy)));
  const small = Math.sqrt(Math.max(0, half - root));
  const large = Math.sqrt(Math.max(1e-12, half + root));
  return small / large;
}

function measure(rig: StudioRig, side: Side, matrices: ArrayLike<number>, posed: Float32Array): Sample {
  let region = regions.get(rig);
  if (!region) {
    region = { L: regionOf(rig, 'L'), R: regionOf(rig, 'R') };
    regions.set(rig, region);
  }
  const r = region[side];
  const { corners } = rig.mesh;
  const facts = r.faces.map((f) => faceFacts(posed, corners, f));
  let creases = 0;
  let creasesAll = 0;
  for (const [k, [i, j]] of r.edges.entries()) {
    const a = facts[i]?.normal ?? new Vector3();
    const b = facts[j]?.normal ?? new Vector3();
    if (angle(a, b) > CREASE) {
      creasesAll += 1;
      if (!r.bindCrease[k]) creases += 1;
    }
  }
  let thin = 0;
  let thinNew = 0;
  let stretched = 0;
  let crushed = 0;
  let turned = 0;
  for (const [i, x] of facts.entries()) {
    if (x.quality < THIN) {
      thin += 1;
      if (!r.bindThin[i]) thinNew += 1;
    }
    const ratio = x.area / Math.max(1e-12, r.bindArea[i] ?? 0);
    if (ratio > 2) stretched += 1;
    if (ratio < 0.5) crushed += 1;
    if (x.normal.dot(r.bindNormal[i] ?? new Vector3()) < 0) turned += 1;
  }
  // The rings of the upper arm: the posed crossings of the bind rings of arm-shape.
  const arm = armBinds(rig)[side];
  const shoulder = arm.joints.shoulder.clone().applyMatrix4(matrixOf(matrices, arm.bones.upper));
  const elbow = arm.joints.elbow.clone().applyMatrix4(matrixOf(matrices, arm.bones.fore));
  const axis = elbow.clone().sub(shoulder).normalize();
  const aspect: number[] = [];
  for (const ring of arm.rings) {
    if (ring.ring.bone !== 'upper') continue;
    const pts: Vector3[] = [];
    for (let k = 0; k < ring.along.length; k++) {
      const p = new Vector3().fromArray(posed, (ring.edges[k * 2] ?? 0) * 3);
      const q = new Vector3().fromArray(posed, (ring.edges[k * 2 + 1] ?? 0) * 3);
      pts.push(p.lerp(q, ring.along[k] ?? 0));
    }
    aspect.push(aspectOf(pts, axis));
  }
  let srcCrease = 0;
  let srcStretch = 0;
  let srcCrush = 0;
  let srcThin = 0;
  let rawStretch = 0;
  let withSource = 0;
  let edgesWithSource = 0;
  const changes: [number, number][] = [];
  if (SOURCES) {
    for (const [i, x] of facts.entries()) {
      const area = r.srcArea[i] ?? 0;
      if (area <= 0) continue;
      withSource += 1;
      if (x.area > 2 * area) srcStretch += 1;
      if (x.area < 0.5 * area) srcCrush += 1;
      if (x.quality < 0.5 * (r.srcQuality[i] ?? 0)) srcThin += 1;
      if (x.area > 2 * (r.rawArea[i] ?? Infinity)) rawStretch += 1;
    }
    for (const [i, j] of r.edges) {
      const si = r.srcNormal[i] ?? new Vector3();
      const sj = r.srcNormal[j] ?? new Vector3();
      if (si.lengthSq() === 0 || sj.lengthSq() === 0) continue;
      edgesWithSource += 1;
      const change = Math.abs(angle(facts[i]?.normal ?? si, facts[j]?.normal ?? sj) - angle(si, sj));
      if (change > SHIFT) {
        srcCrease += 1;
        changes.push([change, r.faces[i] ?? 0]);
      }
    }
  }
  const worst = changes.toSorted((a, b) => b[0] - a[0]).slice(0, process.env['DUMP_FLAGS'] ? 400 : 8).map(([, f]) => f);
  const nf = Math.max(1, facts.length);
  const ne = Math.max(1, r.edges.length);
  const ns = Math.max(1, withSource);
  return {
    srcCrease: srcCrease / Math.max(1, edgesWithSource),
    srcStretch: srcStretch / ns,
    srcCrush: srcCrush / ns,
    srcThin: srcThin / ns,
    rawStretch: rawStretch / ns,
    worst,
    creases: creases / ne,
    creasesAll: creasesAll / ne,
    thin: thin / nf,
    thinNew: thinNew / nf,
    stretched: stretched / nf,
    crushed: crushed / nf,
    turned: turned / nf,
    aspect,
  };
}

function q(values: number[], share: number): number {
  const s = values.toSorted((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.floor(share * (s.length - 1))))] ?? 0;
}

async function main(): Promise<void> {
  const { glb, rest: args } = takeGlb(process.argv.slice(2));
  const role = args[0] ?? '';
  const source = FOLD_ROLES.get(role);
  if (!source) throw new Error(`Unknown role ${role}`);
  if (glb) {
    process.exitCode = await withGlbBody(roleAnimal(source), glb, (dir) => {
      copyFileSync(new URL(import.meta.url).pathname, join(dir, 'tools', 'arm-look.ts'));
      return runTool(dir, 'arm-look.ts', args);
    });
    return;
  }
  const facesAt = args.indexOf('--faces');
  if (facesAt >= 0) {
    const { readFileSync } = await import('node:fs');
    const list = JSON.parse(readFileSync(args[facesAt + 1] ?? '', 'utf8')) as (SourceFace | null | 'eye')[];
    SOURCES = list.filter((x) => x !== 'eye') as (SourceFace | null)[];
  }
  const stepAt = args.indexOf('--step');
  const step = stepAt >= 0 ? Number(args[stepAt + 1]) : 1;
  const chosen = args.flatMap((a, i) => (args[i - 1] === '--demo' ? [a.endsWith('.mid') ? a : `${a}.mid`] : []));
  const all = await patchedDemos();
  const demos = chosen.length > 0 ? all.filter((d) => chosen.includes(d.file)) : all;
  const store: Record<SampleSet | 'bind', Record<Side, Sample[]>> = {
    bind: { L: [], R: [] },
    rest: { L: [], R: [] },
    play: { L: [], R: [] },
    lift: { L: [], R: [] },
  };
  const holds = args.flatMap((a, i) => (args[i - 1] === '--set' ? [a] : [])).join(';');
  const changes = holds ? setHolds(holds) : null;
  if (changes) console.log(`Hold changes: ${changes.text}`);
  let bindRow: Record<Side, string> | null = null;
  let infoRig: StudioRig | null = null;
  probeFolds(source, demos, step, (rig, studio, posed, _f, set) => {
    if (!bindRow) {
      infoRig = rig;
      {
        const b = rig.body;
        const reach = new Vector3(...b.palms.L).distanceTo(new Vector3(...b.heads.upper_arm_L));
        const upper = new Vector3(...b.heads.forearm_L).distanceTo(new Vector3(...b.heads.upper_arm_L));
        const fore = new Vector3(...b.heads.hand_L).distanceTo(new Vector3(...b.heads.forearm_L));
        console.log(`Reach L ${reach.toFixed(4)} (body units), upper ${upper.toFixed(4)}, fore ${fore.toFixed(4)}, scale ${b.scale}`);
      }
      if (SOURCES) {
        const { mesh } = rig;
        const count = mesh.corners.length / 3;
        if (SOURCES.length !== count) throw new Error(`faces ${SOURCES.length} against ${count}`);
        const ratios: number[] = [];
        for (let f = 0; f < count; f++) {
          const src = SOURCES[f];
          if (!src) continue;
          const a = faceFacts(mesh.positions, mesh.corners, f).area;
          const b = faceFacts(new Float32Array(src.l.flat()), new Uint32Array([0, 1, 2]), 0).area;
          if (b > 0) ratios.push(a / b);
        }
        SCALE2 = q(ratios, 0.5);
      }
      bindRow = { L: '', R: '' };
      const eye = new Float32Array(STUDIO_BONES.length * 16);
      for (let b = 0; b < STUDIO_BONES.length; b++) new Matrix4().toArray(eye, b * 16);
      for (const side of ['L', 'R'] as const) {
        store.bind[side].push(measure(rig, side, eye, new Float32Array(rig.mesh.positions)));
      }
      for (const side of ['L', 'R'] as const) {
        const r = regionOf(rig, side);
        const thin = r.bindThin.filter(Boolean).length / r.faces.length;
        const cr = r.bindCrease.filter(Boolean).length / r.edges.length;
        {
          const mesh = rig.mesh;
          const hh = rig.body.heads;
          const len = new Vector3(...hh[`upper_arm_${side}`]).distanceTo(new Vector3(...hh[`forearm_${side}`]));
          const bones = [boneAt(`upper_arm_${side}`), UPPER_TWIST_BONES[side]];
          let mixed = 0;
          let edgeSum = 0;
          let edgeN = 0;
          for (const f of r.faces) {
            const ws = [0, 1, 2].map((k) => weightOn(mesh, mesh.corners[f * 3 + k] ?? 0, bones));
            const [a, b, c] = tri(mesh.positions, mesh.corners, f);
            if (ws.some((w) => w > 0.1 && w < 0.9)) mixed += faceFacts(mesh.positions, mesh.corners, f).area;
            edgeSum += a.distanceTo(b) + b.distanceTo(c) + c.distanceTo(a);
            edgeN += 3;
          }
          console.log(`Bind ${side}: upper arm ${len.toFixed(4)}, area of faces with a mixed upper arm weight (0.1 to 0.9) / upper arm length^2 = ${(mixed / (len * len)).toFixed(2)}, mean edge / upper arm length = ${(edgeSum / edgeN / len).toFixed(3)}`);
        }
        bindRow[side] = `${r.faces.length} faces, bind creases ${(100 * cr).toFixed(1)}%, bind thin ${(100 * thin).toFixed(1)}%`;
      }
    }
    for (const side of ['L', 'R'] as const) {
      store[set][side].push(measure(rig, side, studio.matrices, posed));
    }
  });
  const pct = (x: number) => `${(100 * x).toFixed(1)}%`;
  console.log(`Arm look of ${role}${glb ? ` (glb ${glb})` : ''}, step ${step} s, ${demos.length} demos.`);
  console.log(`Region L: ${bindRow?.L}; R: ${bindRow?.R}`);
  console.log('');
  if (SOURCES) {
    console.log(`Scale: ${Math.sqrt(SCALE2).toFixed(4)} m for each unit of the source (median of the bind).`);
    console.log('');
    console.log('Against the long-armed source of the user mesh (the stretch is in the source):');
    console.log('| Set | Side | Crease change > 40° p50 / p95 | Area > 2x p50 / p95 | Area < 0.5x p50 | Thinner than half p50 / p95 | Area > 2x of the unstretched source p50 | Worst faces (one sample) |');
    console.log('|---|---|---:|---:|---:|---:|---:|---|');
    for (const set of ['bind', 'rest', 'play', 'lift'] as const) {
      for (const side of ['L', 'R'] as const) {
        const s2 = store[set][side];
        if (s2.length === 0) continue;
        const col = (f: (x: Sample) => number) => s2.map(f);
        const mid = s2.toSorted((a, b) => a.srcCrease - b.srcCrease)[Math.floor(s2.length / 2)];
        if (process.env['DUMP_FLAGS'] && set === 'play') {
          const { writeFileSync } = await import('node:fs');
          writeFileSync(`${process.env['DUMP_FLAGS']}-${side}.json`, JSON.stringify([...new Set(mid?.worst ?? [])]));
        }
        if (set === 'play' && process.env['FACE_INFO'] && infoRig) {
          for (const f of new Set(mid?.worst ?? [])) {
            const src = SOURCES?.[f];
            const m = src ? [0, 1, 2].map((k) => ((src.s[0]?.[k] ?? 0) + (src.s[1]?.[k] ?? 0) + (src.s[2]?.[k] ?? 0)) / 3) : [];
            const mesh = (infoRig as StudioRig).mesh;
            const sum = new Map<string, number>();
            for (let c = 0; c < 3; c++) {
              const v = mesh.corners[f * 3 + c] ?? 0;
              for (let k = 0; k < 4; k++) {
                const b = STUDIO_BONES[mesh.joints[v * 4 + k] ?? 0] ?? '?';
                sum.set(b, (sum.get(b) ?? 0) + (mesh.weights[v * 4 + k] ?? 0) / 3);
              }
            }
            const w = [...sum].filter(([, x]) => x > 0.02).toSorted((a, b) => b[1] - a[1]).map(([b, x]) => `${b} ${x.toFixed(2)}`).join(', ');
            console.log(`  face ${f}: source middle (${m.map((x) => x.toFixed(3)).join(', ')}) u, ${w}`);
          }
        }
        console.log(`| ${set} | ${side} | ${pct(q(col((x) => x.srcCrease), 0.5))} / ${pct(q(col((x) => x.srcCrease), 0.95))} | ${pct(q(col((x) => x.srcStretch), 0.5))} / ${pct(q(col((x) => x.srcStretch), 0.95))} | ${pct(q(col((x) => x.srcCrush), 0.5))} | ${pct(q(col((x) => x.srcThin), 0.5))} / ${pct(q(col((x) => x.srcThin), 0.95))} | ${pct(q(col((x) => x.rawStretch), 0.5))} | ${mid?.worst.slice(0, 8).join(" ") ?? ""} |`);
      }
    }
    console.log('');
  }
  console.log('| Set | Side | Samples | New creases p50 / p95 | All creases p50 | Thin p50 / p95 | New thin p50 | Stretched >2x p50 / p95 | Crushed <0.5x p50 | Turned p95 | Aspect shoulder / upper / elbow p50 |');
  console.log('|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const set of ['bind', 'rest', 'play', 'lift'] as const) {
    for (const side of ['L', 'R'] as const) {
      const s = store[set][side];
      if (s.length === 0) continue;
      const col = (f: (x: Sample) => number) => s.map(f);
      const asp = [0, 1, 2].map((k) => q(col((x) => x.aspect[k] ?? 1), 0.5).toFixed(2)).join(' / ');
      console.log(
        `| ${set} | ${side} | ${s.length} | ${pct(q(col((x) => x.creases), 0.5))} / ${pct(q(col((x) => x.creases), 0.95))} | ${pct(q(col((x) => x.creasesAll), 0.5))} | ${pct(q(col((x) => x.thin), 0.5))} / ${pct(q(col((x) => x.thin), 0.95))} | ${pct(q(col((x) => x.thinNew), 0.5))} | ${pct(q(col((x) => x.stretched), 0.5))} / ${pct(q(col((x) => x.stretched), 0.95))} | ${pct(q(col((x) => x.crushed), 0.5))} | ${pct(q(col((x) => x.turned), 0.95))} | ${asp} |`,
      );
    }
  }
}

await main();
