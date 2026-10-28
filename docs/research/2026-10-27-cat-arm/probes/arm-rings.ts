/**
 * Measures the form of one arm of the cat along its length: cuts at a right angle to the upper
 * arm and to the forearm, at steps of 5% of each bone. Each cut takes the closed loop of the skin
 * around the bone line, and gives its area radius (r = sqrt(area / pi)), its widest and
 * narrowest radius from the middle of the loop, and the radius at 24 angles. Along the arm, a
 * bump is r_i - (r_(i-1) + r_(i+1)) / 2 of one angle line: a lump is a large positive bump, a dent
 * a large negative one. The step is the largest change of the area radius between two cuts.
 *
 * The states: `--glb <file>` (a source GLB in the units of the studio, with the joints of the
 * config, `--joints source` for `cat.glb`), `--bind` (the seated bind of the app body), and
 * `--at <demo>:<set>:<time>` (the posed body of the violist; set play with the song time, or
 * rest, lift, lower with the wall time of the sample).
 *
 * Usage: node scratch/arm-rings.ts (--glb <file> [--joints source] | --bind | --at <spec>)
 *   [--side L|R] [--lines] [--json <file>]
 */
import { readFileSync, writeFileSync } from 'node:fs';

import { Vector3 } from 'three';

import { readAccessor, readGlb } from '../tools/studio-body.ts';
import { probeDemos } from '../tools/probe-demos.ts';
import { setHolds } from '../tools/hold-sets.ts';
import { sceneOf } from '../src/pose/test-scene.ts';
import { SWEEP_ROLES, playSample } from '../src/pose/test-sweep-roles.ts';
import { poseSkeleton } from '../src/pose/test-kinematics.ts';
import {
  createStudioPose,
  poseStudioBones,
  skinStudioMesh,
  studioOffsets,
} from '../src/models/studio-rig.ts';
import { STUDIO_BONES } from '../src/models/studio-format.ts';
import { CLOSED_EYE_SCALE } from '../src/scene/player.ts';
import type { SweepSample } from '../src/pose/test-sweep.ts';

const args = process.argv.slice(2);
const opt = (n: string, f: string): string => (args.includes(n) ? args[args.indexOf(n) + 1]! : f);
const side = opt('--side', 'L');
setHolds(opt('--set', ''));

/** Meters for each unit of the source (`scale` of `src/models/studio/cat.ts`). */
const SCALE = 1.63916;
const ANGLES = 24;
/** The largest distance of a cut point from the bone line, in meters. */
const REACH = Number(process.env.REACH ?? 0.08);

interface State {
  /** The vertices, in meters. */
  pos: Float64Array;
  tris: Uint32Array;
  shoulder: Vector3;
  elbow: Vector3;
  wrist: Vector3;
  /** A direction to the outer side of the arm, to start the angles. */
  out: Vector3;
}

function weld(pos: Float64Array, idx: ArrayLike<number>): Uint32Array {
  const key = new Map<string, number>();
  const map = new Uint32Array(pos.length / 3);
  for (let v = 0; v < pos.length / 3; v++) {
    const k = [0, 1, 2].map((a) => Math.round(pos[v * 3 + a]! / 1e-5)).join(',');
    const old = key.get(k);
    if (old === undefined) {
      key.set(k, v);
      map[v] = v;
    } else map[v] = old;
  }
  const tris = new Uint32Array(idx.length);
  for (let i = 0; i < idx.length; i++) tris[i] = map[idx[i]!]!;
  return tris;
}

function glbState(path: string, jointsKind: string): State {
  const glb = readGlb(new Uint8Array(readFileSync(path)));
  const prim = glb.json.meshes[0]!.primitives[0]!;
  const raw = readAccessor(glb, prim.attributes.POSITION!);
  const idx = readAccessor(glb, prim.indices!);
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 1; i < raw.length; i += 3) {
    lo = Math.min(lo, raw[i]!);
    hi = Math.max(hi, raw[i]!);
  }
  const pos = new Float64Array(raw.length);
  for (let i = 0; i < raw.length; i += 3) {
    pos[i] = (raw[i]! / (hi - lo)) * SCALE;
    pos[i + 1] = ((raw[i + 1]! - lo) / (hi - lo)) * SCALE;
    pos[i + 2] = (raw[i + 2]! / (hi - lo)) * SCALE;
  }
  const config = JSON.parse(readFileSync('tools/mesh-rigs/cat.json', 'utf8')) as {
    joints: Record<string, { head: number[] }>;
  };
  const j = (name: string): Vector3 => new Vector3(...(config.joints[name]!.head as [number, number, number]));
  const s = j('upper_arm_L');
  let e = j('forearm_L');
  let w = j('hand_L');
  if (jointsKind === 'source') {
    // The joints of the mesh of the user: `source_joints()` of `violin_arms.py`.
    const e2 = e.clone();
    e = s.clone().add(e2.clone().sub(s).divideScalar(0.92));
    w = e.clone().add(w.clone().sub(e2).divideScalar(0.78));
  }
  const m = (p: Vector3): Vector3 =>
    new Vector3(p.x * (side === 'L' ? 1 : -1), p.y, p.z).multiplyScalar(SCALE);
  return {
    pos,
    tris: weld(pos, idx),
    shoulder: m(s),
    elbow: m(e),
    wrist: m(w),
    out: new Vector3(side === 'L' ? 1 : -1, 0, 0),
  };
}

const B = (name: string): number => STUDIO_BONES.indexOf(name as (typeof STUDIO_BONES)[number]);

async function appState(spec: string | null): Promise<{ state: State; label: string }> {
  const role = SWEEP_ROLES.violist!;
  const [demoId = '', setName = 'bind', timeText = '0'] = (spec ?? '').split(':');
  const demos = await probeDemos();
  const demo = spec
    ? demos.find((d) => d.file.replace(/\.mid$/, '') === demoId)
    : demos.find((d) => role.hasRole(sceneOf(d.bytes).score));
  if (!demo) throw new Error(`no demo ${demoId}`);
  const scene = sceneOf(demo.bytes);
  const player = role.players(scene)[0]!;
  const rig = player.model.studio!;
  const sm = rig.mesh;
  const heads = rig.body.heads as Record<string, [number, number, number]>;
  const pos = Float64Array.from(sm.positions);
  const head = (n: string): Vector3 => new Vector3(...heads[`${n}_${side}`]!);
  let shoulder = head('upper_arm');
  let elbow = head('forearm');
  let wrist = head('hand');
  let out = new Vector3(side === 'L' ? 1 : -1, 0, 0);
  if (spec) {
    const time = Number(timeText);
    const sample: SweepSample =
      setName === 'play'
        ? playSample(scene, time)
        : ([...role
            .sampleSets(scene)
            .find((s) => s.name === setName)!
            .samples].find((s, i) =>
              timeText.startsWith('#') ? i === Number(timeText.slice(1)) : Math.abs((s as SweepSample)[1] - time) < 0.06,
            ) as SweepSample);
    if (!sample) throw new Error(`no sample ${spec}`);
    const posed = poseSkeleton(player.model, player.poseAt(sample));
    const pose = poseStudioBones(
      rig,
      posed.model.skeleton,
      posed.pose.rotations,
      studioOffsets(posed.pose),
      Math.max(CLOSED_EYE_SCALE, 1 - posed.pose.blink),
      createStudioPose(),
    );
    const verts = skinStudioMesh(sm, pose);
    for (let i = 0; i < verts.length; i++) pos[i] = verts[i]!;
    const mat = (n: string): number[] => Array.from(pose.matrices.subarray(B(n) * 16, B(n) * 16 + 16));
    const apply = (m: number[], p: Vector3): Vector3 =>
      new Vector3(
        m[0]! * p.x + m[4]! * p.y + m[8]! * p.z + m[12]!,
        m[1]! * p.x + m[5]! * p.y + m[9]! * p.z + m[13]!,
        m[2]! * p.x + m[6]! * p.y + m[10]! * p.z + m[14]!,
      );
    const turn = (m: number[], d: Vector3): Vector3 =>
      new Vector3(
        m[0]! * d.x + m[4]! * d.y + m[8]! * d.z,
        m[1]! * d.x + m[5]! * d.y + m[9]! * d.z,
        m[2]! * d.x + m[6]! * d.y + m[10]! * d.z,
      );
    shoulder = apply(mat(`upper_arm_${side}`), shoulder);
    elbow = apply(mat(`forearm_${side}`), elbow);
    wrist = apply(mat(`hand_${side}`), wrist);
    out = turn(mat(`upper_arm_seg1_${side}`), out);
  }
  return {
    state: { pos, tris: weld(pos, sm.corners), shoulder, elbow, wrist, out },
    label: spec ? `${demo.file} ${setName} ${timeText}` : `bind (${demo.file})`,
  };
}

interface Cut {
  /** The name: u<share> on the upper arm, f<share> on the forearm. */
  name: string;
  /** The distance from the shoulder joint along the arm line, in cm. */
  s: number;
  area: number;
  rMax: number;
  rMin: number;
  radii: number[];
  /** The count of loop points. */
  points: number;
}

function cut(state: State, point: Vector3, normal: Vector3, ref: Vector3): Cut | null {
  const r = ref.clone().addScaledVector(normal, -ref.dot(normal)).normalize();
  const a = new Vector3().crossVectors(normal, r);
  const { pos, tris } = state;
  const nv = pos.length / 3;
  const d = new Float64Array(nv);
  for (let v = 0; v < nv; v++) {
    d[v] =
      (pos[v * 3]! - point.x) * normal.x +
      (pos[v * 3 + 1]! - point.y) * normal.y +
      (pos[v * 3 + 2]! - point.z) * normal.z;
  }
  const segs: { p: [number, number][]; k: string[] }[] = [];
  for (let t = 0; t < tris.length / 3; t++) {
    const c = [tris[t * 3]!, tris[t * 3 + 1]!, tris[t * 3 + 2]!];
    if (c[0] === c[1] || c[1] === c[2] || c[0] === c[2]) continue;
    const pts: [number, number][] = [];
    const keys: string[] = [];
    for (let e = 0; e < 3; e++) {
      const i = c[e]!;
      const j = c[(e + 1) % 3]!;
      if (d[i]! < 0 !== d[j]! < 0) {
        const f = d[i]! / (d[i]! - d[j]!);
        const q = new Vector3(
          pos[i * 3]! + (pos[j * 3]! - pos[i * 3]!) * f - point.x,
          pos[i * 3 + 1]! + (pos[j * 3 + 1]! - pos[i * 3 + 1]!) * f - point.y,
          pos[i * 3 + 2]! + (pos[j * 3 + 2]! - pos[i * 3 + 2]!) * f - point.z,
        );
        pts.push([q.dot(r), q.dot(a)]);
        keys.push(i < j ? `${i},${j}` : `${j},${i}`);
      }
    }
    if (pts.length === 2 && pts.every(([x, y]) => Math.hypot(x, y) < REACH)) segs.push({ p: pts, k: keys });
  }
  // Group the segments into loops by their shared edges.
  const parent = new Map<string, string>();
  const root = (k: string): string => {
    while (parent.get(k) !== k) k = parent.get(k)!;
    return k;
  };
  for (const s of segs) {
    for (const k of s.k) if (!parent.has(k)) parent.set(k, k);
    parent.set(root(s.k[1]!), root(s.k[0]!));
  }
  const groups = new Map<string, typeof segs>();
  for (const s of segs) {
    const g = root(s.k[0]!);
    groups.set(g, [...(groups.get(g) ?? []), s]);
  }
  let best: typeof segs | null = null;
  let bestArea = Infinity;
  for (const g of groups.values()) {
    let crossings = 0;
    let area = 0;
    for (const s of g) {
      const [[x1, y1], [x2, y2]] = s.p as [[number, number], [number, number]];
      if (y1 > 0 !== y2 > 0) {
        const x = x1 + ((0 - y1) * (x2 - x1)) / (y2 - y1);
        if (x > 0) crossings++;
      }
      area += Math.abs(x1 * y2 - x2 * y1) / 2;
    }
    if (crossings % 2 === 1 && area < bestArea) {
      best = g;
      bestArea = area;
    }
  }
  if (!best) return null;
  // The middle of the loop: the mean of the segment middles, by length.
  let cx = 0;
  let cy = 0;
  let total = 0;
  for (const s of best) {
    const [[x1, y1], [x2, y2]] = s.p as [[number, number], [number, number]];
    const l = Math.hypot(x2 - x1, y2 - y1);
    cx += ((x1 + x2) / 2) * l;
    cy += ((y1 + y2) / 2) * l;
    total += l;
  }
  cx /= total;
  cy /= total;
  // The signed area around the middle, and the radius at each angle.
  let area = 0;
  for (const s of best) {
    const [[x1, y1], [x2, y2]] = s.p as [[number, number], [number, number]];
    area += Math.abs((x1 - cx) * (y2 - cy) - (x2 - cx) * (y1 - cy)) / 2;
  }
  const radii: number[] = [];
  for (let k = 0; k < ANGLES; k++) {
    const th = (2 * Math.PI * k) / ANGLES;
    const dx = Math.cos(th);
    const dy = Math.sin(th);
    let hit = Infinity;
    for (const s of best) {
      const [[x1, y1], [x2, y2]] = s.p as [[number, number], [number, number]];
      const ex = x2 - x1;
      const ey = y2 - y1;
      const den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-12) continue;
      const t = ((x1 - cx) * ey - (y1 - cy) * ex) / den;
      const u = ((x1 - cx) * dy - (y1 - cy) * dx) / den;
      if (t > 0 && u >= 0 && u <= 1) hit = Math.min(hit, t);
    }
    radii.push(hit * 100);
  }
  return {
    name: '',
    s: 0,
    area,
    rMax: Math.max(...radii),
    rMin: Math.min(...radii),
    radii,
    points: best.length,
  };
}

function measure(state: State): Cut[] {
  const { shoulder: S, elbow: E, wrist: W } = state;
  const u = E.clone().sub(S);
  const lu = u.length();
  u.normalize();
  const f = W.clone().sub(E);
  const lf = f.length();
  f.normalize();
  // The angle 0 is the inner side of the elbow, 90 the normal of the bend plane, 180 the outer
  // side (the point of the elbow).
  let n = new Vector3().crossVectors(u, f);
  if (n.length() < 0.05) n = new Vector3().crossVectors(u, state.out);
  n.normalize();
  const inU = new Vector3().crossVectors(n, u).normalize();
  const inF = new Vector3().crossVectors(n, f).normalize();
  const out: Cut[] = [];
  const steps = Number(process.env.STEPS ?? 20);
  for (let k = 2; k < steps; k++) {
    const t = k / steps;
    const c = cut(state, S.clone().addScaledVector(u, lu * t), u, inU);
    if (c) out.push({ ...c, name: `u${t.toFixed(2)}`, s: lu * t * 100 });
  }
  for (let k = 0; k <= 6; k++) {
    const t = k / 6;
    const normal = u.clone().multiplyScalar(1 - t).addScaledVector(f, t).normalize();
    const ref = inU.clone().multiplyScalar(1 - t).addScaledVector(inF, t).normalize();
    const c = cut(state, E.clone(), normal, ref);
    if (c) out.push({ ...c, name: `e${t.toFixed(2)}`, s: lu * 100 });
  }
  for (let k = 1; k < steps; k++) {
    const t = k / steps;
    const c = cut(state, E.clone().addScaledVector(f, lf * t), f, inF);
    if (c) out.push({ ...c, name: `f${t.toFixed(2)}`, s: (lu + lf * t) * 100 });
  }
  return out;
}

function report(label: string, cuts: Cut[]): void {
  console.log(`${label}`);
  console.log('  cut     s cm  rA cm  rMax  rMin  bump+ (angle)  bump- (angle)  pts | r at 0 (inner) 45 90 135 180 (outer) 225 270 315');
  const rA = cuts.map((c) => Math.sqrt(c.area / Math.PI) * 100);
  let worstStep = { v: 0, at: '' };
  let worstBump = { v: 0, at: '' };
  let worstDent = { v: 0, at: '' };
  for (let i = 0; i < cuts.length; i++) {
    const c = cuts[i]!;
    let bp = { v: 0, a: 0 };
    let bm = { v: 0, a: 0 };
    if (i > 0 && i + 1 < cuts.length && cuts[i - 1]!.name[0] === c.name[0] && cuts[i + 1]!.name[0] === c.name[0]) {
      for (let k = 0; k < ANGLES; k++) {
        const b = c.radii[k]! - (cuts[i - 1]!.radii[k]! + cuts[i + 1]!.radii[k]!) / 2;
        if (!Number.isFinite(b)) continue;
        if (b > bp.v) bp = { v: b, a: (k * 360) / ANGLES };
        if (b < bm.v) bm = { v: b, a: (k * 360) / ANGLES };
      }
      if (bp.v > worstBump.v) worstBump = { v: bp.v, at: `${c.name}@${bp.a}` };
      if (-bm.v > worstDent.v) worstDent = { v: -bm.v, at: `${c.name}@${bm.a}` };
    }
    if (i > 0) {
      const step = Math.abs(rA[i]! - rA[i - 1]!);
      if (step > worstStep.v) worstStep = { v: step, at: `${cuts[i - 1]!.name}-${c.name}` };
    }
    if (args.includes('--lines') || true) {
      console.log(
        `  ${c.name.padEnd(6)} ${c.s.toFixed(1).padStart(5)} ${rA[i]!.toFixed(2).padStart(6)} ${c.rMax.toFixed(2).padStart(5)} ${c.rMin.toFixed(2).padStart(5)} ${bp.v.toFixed(2).padStart(6)} (${String(bp.a).padStart(3)}) ${bm.v.toFixed(2).padStart(7)} (${String(bm.a).padStart(3)}) ${String(c.points).padStart(4)} | ${[0, 3, 6, 9, 12, 15, 18, 21].map((k) => c.radii[k]!.toFixed(2).padStart(5)).join(' ')}`,
      );
    }
  }
  console.log(
    `  largest area radius step ${worstStep.v.toFixed(2)} cm at ${worstStep.at}, largest bump ${worstBump.v.toFixed(2)} cm at ${worstBump.at}, largest dent ${worstDent.v.toFixed(2)} cm at ${worstDent.at}`,
  );
}

let result: { state: State; label: string };
if (args.includes('--glb')) {
  const path = opt('--glb', '');
  result = { state: glbState(path, opt('--joints', 'config')), label: `glb ${path}` };
} else {
  result = await appState(args.includes('--at') ? opt('--at', '') : null);
}
const cuts = measure(result.state);
report(`${result.label}, side ${side}`, cuts);
if (args.includes('--json')) writeFileSync(opt('--json', ''), JSON.stringify({ label: result.label, cuts }));

/** The color of a bone for the OBJ file of `--obj`. */
function boneColor(name: string): [number, number, number] {
  const seg = /_seg(\d)_/.exec(name);
  if (name.startsWith('upper_arm_seg')) return [[1, 0.2, 0.2], [1, 0.55, 0.1], [1, 0.9, 0.1], [0.7, 0.35, 0.1]][Number(seg![1])] as [number, number, number];
  if (name.startsWith('forearm_seg')) return [[0.1, 0.4, 1], [0.1, 0.8, 1], [0.5, 0.3, 1], [0.8, 0.5, 1]][Number(seg![1])] as [number, number, number];
  if (name.startsWith('elbow')) return [0.1, 0.9, 0.2];
  if (name.startsWith('wrist')) return [0.9, 0.2, 0.9];
  if (name.startsWith('clavicle')) return [0.2, 0.2, 0.2];
  if (name.startsWith('upper_arm') || name.startsWith('forearm')) return [0, 0, 0];
  if (name.startsWith('hand') || name.startsWith('fingers')) return [1, 1, 1];
  if (name === 'chest') return [0.55, 0.75, 0.55];
  if (name === 'neck' || name === 'head') return [0.75, 0.75, 0.9];
  return [0.7, 0.7, 0.7];
}

if (args.includes('--obj') && !args.includes('--glb')) {
  const role = SWEEP_ROLES.violist!;
  const demos = await probeDemos();
  const scene = sceneOf(demos.find((d) => role.hasRole(sceneOf(d.bytes).score))!.bytes);
  const sm = role.players(scene)[0]!.model.studio!.mesh;
  const mode = opt('--color', 'bone');
  const lines: string[] = [];
  const faces: string[] = [];
  const nt = sm.corners.length / 3;
  let k = 1;
  const armShare = (v: number): number => {
    let a = 0;
    for (let j = 0; j < 4; j++) {
      const b = STUDIO_BONES[sm.joints[v * 4 + j]!]!;
      if (/^(upper_arm|forearm|elbow|wrist|hand|fingers)/.test(b)) a += sm.weights[v * 4 + j]!;
    }
    return a;
  };
  for (let t = 0; t < nt; t++) {
    if (args.includes('--noarm') && [0, 1, 2].some((i) => armShare(sm.corners[t * 3 + i]!) > 0.5)) continue;
    for (let i = 0; i < 3; i++) {
      const v = sm.corners[t * 3 + i]!;
      let c: number[] = [0, 0, 0];
      if (mode === 'bone') {
        for (let j = 0; j < 4; j++) {
          const w = sm.weights[v * 4 + j]!;
          const bc = boneColor(STUDIO_BONES[sm.joints[v * 4 + j]!]!);
          c = c.map((x, q) => x + w * bc[q]!);
        }
      } else c = [0, 1, 2].map((q) => Math.pow(sm.colors[t * 3 + q]!, 1 / 2.2));
      const p = result.state.pos;
      lines.push(`v ${p[v * 3]!.toFixed(5)} ${p[v * 3 + 1]!.toFixed(5)} ${p[v * 3 + 2]!.toFixed(5)} ${c.map((x) => x.toFixed(3)).join(' ')}`);
    }
    faces.push(`f ${k} ${k + 1} ${k + 2}`);
    k += 3;
  }
  writeFileSync(opt('--obj', ''), [...lines, ...faces].join('\n') + '\n');
  const { shoulder: S, elbow: E, wrist: W } = result.state;
  console.log(`obj ${opt('--obj', '')}: shoulder ${S.toArray().map((x) => x.toFixed(4))} elbow ${E.toArray().map((x) => x.toFixed(4))} wrist ${W.toArray().map((x) => x.toFixed(4))}`);
}

if (args.includes('--obj') && args.includes('--glb')) {
  // The GLB faces +z with its left side at +x: turn it to the app axes (front -z, left -x).
  const { pos, tris } = result.state;
  const lines: string[] = [];
  for (let v = 0; v < pos.length / 3; v++) {
    lines.push(`v ${(-pos[v * 3]!).toFixed(5)} ${pos[v * 3 + 1]!.toFixed(5)} ${(-pos[v * 3 + 2]!).toFixed(5)} 0.7 0.7 0.7`);
  }
  for (let t = 0; t < tris.length / 3; t++) {
    const c = [tris[t * 3]!, tris[t * 3 + 1]!, tris[t * 3 + 2]!];
    if (c[0] === c[1] || c[1] === c[2] || c[0] === c[2]) continue;
    lines.push(`f ${c[0]! + 1} ${c[1]! + 1} ${c[2]! + 1}`);
  }
  writeFileSync(opt('--obj', ''), lines.join('\n') + '\n');
  const { shoulder: S, elbow: E, wrist: W } = result.state;
  const app = (p: Vector3): string => [-p.x, p.y, -p.z].map((x) => x.toFixed(4)).join(',');
  console.log(`obj ${opt('--obj', '')}: shoulder ${app(S)} elbow ${app(E)} wrist ${app(W)}`);
}

if (args.includes('--plane')) {
  // The cut of the mesh by the plane through the shoulder, the elbow, and the wrist (the bend
  // plane), in its own axes: x along the upper arm from the shoulder, y square to it in the
  // plane, toward the wrist side. Writes the segments as JSON for `plane.py`.
  const { pos, tris, shoulder: S, elbow: E, wrist: W } = result.state;
  const u = E.clone().sub(S).normalize();
  let n = new Vector3().crossVectors(u, W.clone().sub(E));
  if (n.length() < 1e-6) n = new Vector3(0, 0, 1);
  n.normalize();
  const y = new Vector3().crossVectors(n, u).normalize();
  const segs: number[][] = [];
  const d = (v: number): number =>
    (pos[v * 3]! - S.x) * n.x + (pos[v * 3 + 1]! - S.y) * n.y + (pos[v * 3 + 2]! - S.z) * n.z;
  for (let t = 0; t < tris.length / 3; t++) {
    const c = [tris[t * 3]!, tris[t * 3 + 1]!, tris[t * 3 + 2]!];
    const pts: number[] = [];
    for (let e = 0; e < 3; e++) {
      const i = c[e]!;
      const j = c[(e + 1) % 3]!;
      const di = d(i);
      const dj = d(j);
      if (di < 0 !== dj < 0) {
        const f = di / (di - dj);
        const q = new Vector3(
          pos[i * 3]! + (pos[j * 3]! - pos[i * 3]!) * f,
          pos[i * 3 + 1]! + (pos[j * 3 + 1]! - pos[i * 3 + 1]!) * f,
          pos[i * 3 + 2]! + (pos[j * 3 + 2]! - pos[i * 3 + 2]!) * f,
        ).sub(S);
        pts.push(q.dot(u), q.dot(y));
      }
    }
    if (pts.length === 4) segs.push(pts);
  }
  const joint = (p: Vector3): number[] => [p.clone().sub(S).dot(u), p.clone().sub(S).dot(y)];
  writeFileSync(
    opt('--plane', ''),
    JSON.stringify({ label: result.label, segs, joints: [joint(S), joint(E), joint(W)] }),
  );
}

if (args.includes('--rays')) {
  // The near surface along rays from the upper arm line, square to the bone, at 24 angles (0 is
  // the inner side of the elbow, 90 the normal of the bend plane, 180 the point of the elbow),
  // from the shoulder joint (u0) to the elbow (u1), with no closed loop: the outer side of the
  // root shows its step there. Prints the radius table in cm and the largest bump of each line.
  const { pos, tris, shoulder: S, elbow: E, wrist: W } = result.state;
  const u = E.clone().sub(S);
  const lu = u.length();
  u.normalize();
  const f = W.clone().sub(E).normalize();
  let n = new Vector3().crossVectors(u, f);
  if (n.length() < 0.05) n = new Vector3().crossVectors(u, result.state.out);
  n.normalize();
  const inU = new Vector3().crossVectors(n, u).normalize();
  const across = new Vector3().crossVectors(u, inU);
  const from = Number(process.env.FROM ?? -0.1);
  const rows: number[][] = [];
  const names: string[] = [];
  for (let t = from; t <= 1.0001; t += 0.05) {
    const P = S.clone().addScaledVector(u, lu * t);
    const row: number[] = [];
    for (let k = 0; k < ANGLES; k++) {
      const th = (2 * Math.PI * k) / ANGLES;
      const dir = inU.clone().multiplyScalar(Math.cos(th)).addScaledVector(across, Math.sin(th));
      // The ray from P along dir, in the plane square to u: the nearest crossing of a triangle edge
      // cut by the plane.
      let best = Infinity;
      for (let i = 0; i < tris.length / 3; i++) {
        const c = [tris[i * 3]!, tris[i * 3 + 1]!, tris[i * 3 + 2]!];
        const pts: Vector3[] = [];
        for (let e = 0; e < 3; e++) {
          const a = c[e]!;
          const b = c[(e + 1) % 3]!;
          const da = (pos[a * 3]! - P.x) * u.x + (pos[a * 3 + 1]! - P.y) * u.y + (pos[a * 3 + 2]! - P.z) * u.z;
          const db = (pos[b * 3]! - P.x) * u.x + (pos[b * 3 + 1]! - P.y) * u.y + (pos[b * 3 + 2]! - P.z) * u.z;
          if (da < 0 !== db < 0) {
            const g = da / (da - db);
            pts.push(
              new Vector3(
                pos[a * 3]! + (pos[b * 3]! - pos[a * 3]!) * g,
                pos[a * 3 + 1]! + (pos[b * 3 + 1]! - pos[a * 3 + 1]!) * g,
                pos[a * 3 + 2]! + (pos[b * 3 + 2]! - pos[a * 3 + 2]!) * g,
              ).sub(P),
            );
          }
        }
        if (pts.length !== 2) continue;
        const [p1, p2] = pts as [Vector3, Vector3];
        const x1 = p1.dot(dir);
        const y1 = p1.dot(across.clone().cross(u).negate().cross(u).length() ? new Vector3().crossVectors(u, dir) : dir);
        const perp = new Vector3().crossVectors(u, dir);
        const ya = p1.dot(perp);
        const yb = p2.dot(perp);
        if (ya < 0 === yb < 0) continue;
        const x = x1 + ((p2.dot(dir) - x1) * (0 - ya)) / (yb - ya);
        void y1;
        if (x > 0 && x < best) best = x;
      }
      row.push(best * 100);
    }
    rows.push(row);
    names.push(`u${t.toFixed(2)}`);
  }
  const shown = [0, 3, 6, 9, 12, 15, 18, 21];
  console.log(`rays ${result.label}: radius cm at the angles ${shown.map((k) => (k * 360) / ANGLES).join(' ')}`);
  for (let i = 0; i < rows.length; i++) {
    console.log(`  ${names[i]!.padEnd(6)} ${shown.map((k) => (rows[i]![k]! > 50 ? '    -' : rows[i]![k]!.toFixed(2).padStart(5))).join(' ')}`);
  }
  const lines: string[] = [];
  for (let k = 0; k < ANGLES; k++) {
    let worst = { v: 0, at: '' };
    for (let i = 1; i + 1 < rows.length; i++) {
      const [a, b, c] = [rows[i - 1]![k]!, rows[i]![k]!, rows[i + 1]![k]!];
      if (![a, b, c].every((x) => x < 50)) continue;
      const bump = b - (a + c) / 2;
      if (Math.abs(bump) > Math.abs(worst.v)) worst = { v: bump, at: names[i]! };
    }
    lines.push(`${(k * 360) / ANGLES}: ${worst.v.toFixed(2)}@${worst.at}`);
  }
  console.log(`  largest bump of each line (cm): ${lines.join(', ')}`);
}

if (args.includes('--edges')) {
  // The angles between the normals of neighbor faces of the left arm and its root: the faces
  // near the line from the shoulder to the wrist (within 8 cm, from 0.2 of the upper arm above
  // the shoulder joint). Prints the count over 30 and 45 degrees, and the sharpest edges with
  // their place: the share along the upper arm (u) or the forearm (f) and the angle around it.
  const { pos, tris, shoulder: S, elbow: E, wrist: W } = result.state;
  const u = E.clone().sub(S);
  const lu = u.length();
  u.normalize();
  const fw = W.clone().sub(E);
  const lf = fw.length();
  fw.normalize();
  let n = new Vector3().crossVectors(u, fw);
  if (n.length() < 0.05) n = new Vector3().crossVectors(u, result.state.out);
  n.normalize();
  const P = (v: number): Vector3 => new Vector3(pos[v * 3]!, pos[v * 3 + 1]!, pos[v * 3 + 2]!);
  const place = (p: Vector3): { at: string; d: number; ang: number } => {
    const tu = p.clone().sub(S).dot(u) / lu;
    const tf = p.clone().sub(E).dot(fw) / lf;
    const onU = tu < 1 || tf < 0;
    const axis = onU ? u : fw;
    const base = onU ? S.clone().addScaledVector(u, Math.max(-0.2, Math.min(1, tu)) * lu) : E.clone().addScaledVector(fw, Math.min(1.1, tf) * lf);
    const r = p.clone().sub(base);
    r.addScaledVector(axis, -r.dot(axis));
    const inner = new Vector3().crossVectors(n, axis).normalize();
    const side = new Vector3().crossVectors(axis, inner);
    const ang = ((Math.atan2(r.dot(side), r.dot(inner)) * 180) / Math.PI + 360) % 360;
    return { at: onU ? `u${tu.toFixed(2)}` : `f${tf.toFixed(2)}`, d: r.length(), ang };
  };
  const near = (p: Vector3): boolean => {
    const tu = p.clone().sub(S).dot(u) / lu;
    if (tu < -0.2) return false;
    const pl = place(p);
    return pl.d < 0.08 && Number(pl.at.slice(1)) <= (pl.at[0] === 'u' ? 1 : 1.0);
  };
  const normals: Vector3[] = [];
  const edgeFaces = new Map<string, number[]>();
  for (let t = 0; t < tris.length / 3; t++) {
    const [a, b, c] = [tris[t * 3]!, tris[t * 3 + 1]!, tris[t * 3 + 2]!];
    const nn = new Vector3().crossVectors(P(b).sub(P(a)), P(c).sub(P(a)));
    normals.push(nn.length() > 0 ? nn.normalize() : nn);
    for (const [x, y] of [[a, b], [b, c], [c, a]] as const) {
      const k = x < y ? `${x},${y}` : `${y},${x}`;
      edgeFaces.set(k, [...(edgeFaces.get(k) ?? []), t]);
    }
  }
  const out: { angle: number; at: string; ang: number; e: string }[] = [];
  for (const [k, fs] of edgeFaces) {
    if (fs.length !== 2) continue;
    const [a, b] = k.split(',').map(Number) as [number, number];
    const mid = P(a).add(P(b)).multiplyScalar(0.5);
    if (!near(mid)) continue;
    const angle = (Math.acos(Math.max(-1, Math.min(1, normals[fs[0]!]!.dot(normals[fs[1]!]!)))) * 180) / Math.PI;
    const pl = place(mid);
    out.push({ angle, at: pl.at, ang: pl.ang, e: k });
  }
  out.sort((x, y) => y.angle - x.angle);
  const over = (lim: number): number => out.filter((x) => x.angle > lim).length;
  console.log(`edges ${result.label}: ${out.length} edges, over 30 deg ${over(30)}, over 45 deg ${over(45)}, over 60 deg ${over(60)}`);
  console.log(`  sharpest: ${out.slice(0, Number(process.env.TOP ?? 15)).map((x) => `${x.angle.toFixed(0)}@${x.at}/${x.ang.toFixed(0)}`).join(' ')}`);
}
