/**
 * Measures the form of the cat trunk at each step of the pipeline: the source GLB files
 * (`--glb <file>`), the seated bind of the app body (`--bind`), and the posed body of the violist
 * in the app (`--pose <set>[@<n-th>]`, in the bind frame of the hips bone).
 *
 * The frame: the origin at the hips joint, `t` along the line to the neck joint, `z` forward
 * square to it, and `x` to the left of the animal. Each cut of the trunk at a level `t` gives
 * four outlines: the left and the right sides (front view), and the belly front and the back (side
 * view). For each outline: the largest gap to its convex hull, the count of dents deeper than
 * 2 mm, the largest turn between neighbor cuts, and the largest distance from a fitted ellipse
 * arc (`none` when no ellipse fits). For the light patch (Oklab lightness 0.72 or more): the
 * same measures of its two sides (`patchL`, `patchR`) and of its soft width (`softL`, `softR`:
 * the light share of each face from 0.55 to 0.88 along the cut), and the angles between the
 * normals of neighbor light faces (`--edges` lists the largest). `--obj <prefix>` writes the mesh
 * with no arm faces for `objviews.py`. `pnpm trunk-form` gives the app measures as a tool.
 *
 * Usage: node scratch/belly.ts (--glb <file> | --bind | --pose <set>) [--from <f>] [--to <f>]
 *   [--levels <n>] [--profile] [--edges] [--obj <prefix>] [--demo <id>]
 */
import { readFileSync, writeFileSync } from 'node:fs';

import { Matrix4, Vector3 } from 'three';

import { readAccessor, readGlb } from '../tools/studio-body.ts';
import { probeDemos } from '../tools/probe-demos.ts';
import { sceneOf } from '../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../src/pose/test-sweep-roles.ts';
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

/** The source units of the GLB files to meters (`scale` of `src/models/studio/cat.ts`). */
const SCALE = 1.63916;
/** The joints of `tools/mesh-rigs/cat.json` in source units. */
const SRC_HIPS = new Vector3(0, 0.21, 0.045);
const SRC_NECK = new Vector3(0, 0.66, 0.065);

interface Mesh {
  pos: Float64Array;
  tris: Uint32Array;
  /** The trunk mask of each triangle, or null to take the loop around the axis. */
  trunk: Uint8Array | null;
  /** The luminance of each triangle, or null. */
  light: Float64Array | null;
}

interface Frame {
  o: Vector3;
  u: Vector3;
  f: Vector3;
  s: Vector3;
  len: number;
}

function frameOf(hips: Vector3, neck: Vector3, forward: number): Frame {
  const u = neck.clone().sub(hips);
  const len = u.length();
  u.normalize();
  const f = new Vector3(0, 0, forward).addScaledVector(u, -u.z * forward).normalize();
  const s = new Vector3().crossVectors(u, f).normalize();
  return { o: hips, u, f, s, len };
}

function glbMesh(path: string): { mesh: Mesh; frame: Frame } {
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
  // Weld at 1e-5 units, so that the loops close across the UV seams.
  const key = new Map<string, number>();
  const map = new Uint32Array(raw.length / 3);
  for (let v = 0; v < raw.length / 3; v++) {
    const k = [0, 1, 2].map((a) => Math.round(pos[v * 3 + a]! / (1e-5 * SCALE))).join(',');
    const old = key.get(k);
    if (old === undefined) {
      key.set(k, v);
      map[v] = v;
    } else map[v] = old;
  }
  const tris = new Uint32Array(idx.length);
  for (let i = 0; i < idx.length; i++) tris[i] = map[idx[i]!]!;
  return {
    mesh: { pos, tris, trunk: null, light: null },
    frame: frameOf(SRC_HIPS.clone().multiplyScalar(SCALE), SRC_NECK.clone().multiplyScalar(SCALE), 1),
  };
}

const TRUNK_BONES = new Set(['hips', 'spine', 'spine1', 'chest']);
const ARM_PREFIX = ['upper_arm', 'forearm', 'hand', 'fingers', 'clavicle'];

/** The arm mask: a triangle with more than half of its weight on the arm bones. */
function armMask(joints: Uint8Array, weights: Float32Array, corners: Uint32Array): Uint8Array {
  const nt = corners.length / 3;
  const arm = new Uint8Array(nt);
  for (let t = 0; t < nt; t++) {
    let share = 0;
    for (let k = 0; k < 3; k++) {
      const v = corners[t * 3 + k]!;
      for (let j = 0; j < 4; j++) {
        const b = STUDIO_BONES[joints[v * 4 + j]!]!;
        if (ARM_PREFIX.some((a) => b.startsWith(a)) && !b.startsWith('clavicle')) share += weights[v * 4 + j]! / 3;
      }
    }
    arm[t] = share > 0.5 ? 1 : 0;
  }
  return arm;
}

/** The trunk mask and the luminance of the triangles of the app mesh. */
function appMasks(
  joints: Uint8Array,
  weights: Float32Array,
  corners: Uint32Array,
  colors: Float32Array,
): { trunk: Uint8Array; light: Float64Array } {
  const nt = corners.length / 3;
  const trunk = new Uint8Array(nt);
  const light = new Float64Array(nt);
  for (let t = 0; t < nt; t++) {
    let share = 0;
    for (let k = 0; k < 3; k++) {
      const v = corners[t * 3 + k]!;
      for (let j = 0; j < 4; j++) {
        const b = STUDIO_BONES[joints[v * 4 + j]!]!;
        if (TRUNK_BONES.has(b)) share += weights[v * 4 + j]! / 3;
      }
    }
    trunk[t] = share > 0.5 ? 1 : 0;
    const [r, g, b] = [colors[t * 3]!, colors[t * 3 + 1]!, colors[t * 3 + 2]!];
    const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
    const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
    const sh = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
    // The Oklab lightness.
    light[t] = 0.2104542553 * Math.cbrt(l) + 0.793617785 * Math.cbrt(m) - 0.0040720468 * Math.cbrt(sh);
  }
  return { trunk, light };
}

interface Seg {
  a: [number, number];
  b: [number, number];
  ka: string;
  kb: string;
  tri: number;
}

/** Cuts the mesh at the level t: the segments in the (x, z) plane of the frame. */
function slice(mesh: Mesh, local: Float64Array, t: number): Seg[] {
  const out: Seg[] = [];
  const nt = mesh.tris.length / 3;
  for (let i = 0; i < nt; i++) {
    const c = [mesh.tris[i * 3]!, mesh.tris[i * 3 + 1]!, mesh.tris[i * 3 + 2]!];
    const d = c.map((v) => local[v * 3 + 1]! - t);
    const pts: [number, number][] = [];
    const keys: string[] = [];
    for (let e = 0; e < 3; e++) {
      const a = c[e]!;
      const b = c[(e + 1) % 3]!;
      const da = d[e]!;
      const db = d[(e + 1) % 3]!;
      if (da < 0 !== db < 0) {
        const r = da / (da - db);
        pts.push([
          local[a * 3]! + (local[b * 3]! - local[a * 3]!) * r,
          local[a * 3 + 2]! + (local[b * 3 + 2]! - local[a * 3 + 2]!) * r,
        ]);
        keys.push(a < b ? `${a},${b}` : `${b},${a}`);
      }
    }
    if (pts.length === 2) out.push({ a: pts[0]!, b: pts[1]!, ka: keys[0]!, kb: keys[1]!, tri: i });
  }
  return out;
}

/** The segments of the loop that holds the point (0, 0) of the slice, by a ray along +x. */
function axisLoop(segs: Seg[]): Seg[] {
  const parent = new Map<string, string>();
  const root = (k: string): string => {
    while (parent.get(k) !== k) k = parent.get(k)!;
    return k;
  };
  for (const s of segs) {
    if (!parent.has(s.ka)) parent.set(s.ka, s.ka);
    if (!parent.has(s.kb)) parent.set(s.kb, s.kb);
    parent.set(root(s.kb), root(s.ka));
  }
  const groups = new Map<string, Seg[]>();
  for (const s of segs) {
    const r = root(s.ka);
    groups.set(r, [...(groups.get(r) ?? []), s]);
  }
  let best: Seg[] = [];
  for (const g of groups.values()) {
    let crossings = 0;
    for (const s of g) {
      const [x1, z1] = s.a;
      const [x2, z2] = s.b;
      if (z1 > 0 !== z2 > 0) {
        const x = x1 + ((0 - z1) * (x2 - x1)) / (z2 - z1);
        if (x > 0) crossings++;
      }
    }
    if (crossings % 2 === 1 && g.length > best.length) best = g;
  }
  return best;
}

/** The largest gap of an outline to its upper hull, and the count of dents over 2 mm. */
function hullGap(ts: number[], ws: number[]): { gap: number; dents: number; at: number } {
  const n = ts.length;
  const hull: number[] = [];
  for (let i = 0; i < n; i++) {
    while (hull.length >= 2) {
      const a = hull[hull.length - 2]!;
      const b = hull[hull.length - 1]!;
      const cross = (ts[b]! - ts[a]!) * (ws[i]! - ws[a]!) - (ws[b]! - ws[a]!) * (ts[i]! - ts[a]!);
      if (cross >= 0) hull.pop();
      else break;
    }
    hull.push(i);
  }
  let gap = 0;
  let at = 0;
  let dents = 0;
  let inDent = false;
  for (let k = 0; k + 1 < hull.length; k++) {
    const a = hull[k]!;
    const b = hull[k + 1]!;
    for (let i = a; i <= b; i++) {
      const h = ws[a]! + ((ws[b]! - ws[a]!) * (ts[i]! - ts[a]!)) / (ts[b]! - ts[a]! || 1);
      const g = h - ws[i]!;
      if (g > gap) {
        gap = g;
        at = ts[i]!;
      }
      if (g > 0.002 && !inDent) {
        dents++;
        inDent = true;
      } else if (g <= 0.002 && i !== a) inDent = false;
    }
  }
  return { gap, dents, at };
}

/** The largest turn of the outline between neighbor segments, in degrees, and its level. */
function largestTurn(ts: number[], ws: number[]): { turn: number; at: number } {
  let turn = 0;
  let at = 0;
  for (let i = 1; i + 1 < ts.length; i++) {
    const a = Math.atan2(ws[i]! - ws[i - 1]!, ts[i]! - ts[i - 1]!);
    const b = Math.atan2(ws[i + 1]! - ws[i]!, ts[i + 1]! - ts[i]!);
    const d = (Math.abs(b - a) * 180) / Math.PI;
    if (d > turn) {
      turn = d;
      at = ts[i]!;
    }
  }
  return { turn, at };
}

/** Solves a 3x3 system. */
function solve3(m: number[][], r: number[]): number[] {
  const a = m.map((row, i) => [...row, r[i]!]);
  for (let i = 0; i < 3; i++) {
    let p = i;
    for (let k = i + 1; k < 3; k++) if (Math.abs(a[k]![i]!) > Math.abs(a[p]![i]!)) p = k;
    [a[i], a[p]] = [a[p]!, a[i]!];
    for (let k = 0; k < 3; k++) {
      if (k === i) continue;
      const f = a[k]![i]! / a[i]![i]!;
      for (let j = i; j < 4; j++) a[k]![j]! -= f * a[i]![j]!;
    }
  }
  return [0, 1, 2].map((i) => a[i]![3]! / a[i]![i]!);
}

/**
 * Fits an ellipse arc w = w0 + sqrt(a + b t + c t^2) to an outline, with w0 on a grid, and gives
 * the largest distance of the outline from it.
 */
function ellipseFit(ts: number[], ws: number[]): { dev: number; at: number } {
  const mean = ws.reduce((s, w) => s + Math.abs(w), 0) / ws.length;
  let best = { err: Infinity, dev: NaN, at: NaN };
  for (let k = -40; k <= 40; k++) {
    const w0 = (k / 40) * 0.8 * mean;
    const m = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    const r = [0, 0, 0];
    for (let i = 0; i < ts.length; i++) {
      const row = [1, ts[i]!, ts[i]! ** 2];
      const y = (ws[i]! - w0) ** 2;
      for (let p = 0; p < 3; p++) {
        r[p]! += row[p]! * y;
        for (let q = 0; q < 3; q++) m[p]![q]! += row[p]! * row[q]!;
      }
    }
    const [a, b, c] = solve3(m, r);
    if (c! >= 0) continue;
    let err = 0;
    let dev = 0;
    let at = 0;
    for (let i = 0; i < ts.length; i++) {
      const fit = w0 + Math.sqrt(Math.max(0, a! + b! * ts[i]! + c! * ts[i]! ** 2));
      const e = Math.abs(ws[i]! - fit);
      err += e * e;
      if (e > dev) {
        dev = e;
        at = ts[i]!;
      }
    }
    if (err < best.err) best = { err, dev, at };
  }
  return { dev: best.dev, at: best.at };
}

interface Report {
  outlines: Map<string, { gap: number; dents: number; dev: number; gapAt: number; devAt: number; turn: number; turnAt: number }>;
  facets: { p50: number; p90: number; max: number; over25: number; edges: number } | null;
  profile: string[];
}

function measure(mesh: Mesh, frame: Frame, from: number, to: number, levels: number): Report {
  const n = mesh.pos.length / 3;
  const local = new Float64Array(n * 3);
  const p = new Vector3();
  for (let v = 0; v < n; v++) {
    p.set(mesh.pos[v * 3]!, mesh.pos[v * 3 + 1]!, mesh.pos[v * 3 + 2]!).sub(frame.o);
    local[v * 3] = p.dot(frame.s);
    local[v * 3 + 1] = p.dot(frame.u);
    local[v * 3 + 2] = p.dot(frame.f);
  }
  const ts: number[] = [];
  const cols: Record<string, number[]> = { left: [], right: [], front: [], back: [], patchL: [], patchR: [], softL: [], softR: [] };
  const profile: string[] = [];
  const lightCut = 0.72;
  for (let k = 0; k <= levels; k++) {
    const t = (from + ((to - from) * k) / levels) * frame.len;
    const segs = slice(mesh, local, t);
    const trunk = mesh.trunk ? segs.filter((s) => mesh.trunk![s.tri]) : axisLoop(segs);
    if (trunk.length === 0) continue;
    const xs = trunk.flatMap((s) => [s.a[0], s.b[0]]);
    const zs = trunk.flatMap((s) => [s.a[1], s.b[1]]);
    ts.push(t);
    cols.left!.push(Math.max(...xs));
    cols.right!.push(-Math.min(...xs));
    cols.front!.push(Math.max(...zs));
    cols.back!.push(-Math.min(...zs));
    if (mesh.light) {
      const lit = trunk.filter((s) => mesh.light![s.tri]! > lightCut && s.a[1] + s.b[1] > 0);
      const lx = lit.flatMap((s) => [s.a[0], s.b[0]]);
      cols.patchL!.push(lx.length ? Math.max(...lx) : NaN);
      cols.patchR!.push(lx.length ? -Math.min(...lx) : NaN);
      // The soft width: the light share of each face (Oklab L 0.55 gray to 0.88 cream) times the
      // width of its segment across x, on each side of the front half.
      let soft = [0, 0];
      for (const sg of trunk) {
        if (sg.a[1] + sg.b[1] <= 0) continue;
        const share = Math.min(1, Math.max(0, (mesh.light![sg.tri]! - 0.55) / 0.33));
        for (const [side, k] of [[1, 0], [-1, 1]] as const) {
          const a = Math.max(0, side * sg.a[0]);
          const b = Math.max(0, side * sg.b[0]);
          soft[k]! += share * Math.abs(a - b);
        }
      }
      cols.softL!.push(soft[0]!);
      cols.softR!.push(soft[1]!);
    }
    profile.push(
      `t ${(t * 100).toFixed(1)} cm (f ${(t / frame.len).toFixed(3)}): L ${(cols.left!.at(-1)! * 100).toFixed(2)} R ${(cols.right!.at(-1)! * 100).toFixed(2)} F ${(cols.front!.at(-1)! * 100).toFixed(2)} B ${(cols.back!.at(-1)! * 100).toFixed(2)}` +
        (mesh.light ? ` patch L ${(cols.patchL!.at(-1)! * 100).toFixed(2)} R ${(cols.patchR!.at(-1)! * 100).toFixed(2)} soft L ${(cols.softL!.at(-1)! * 100).toFixed(2)} R ${(cols.softR!.at(-1)! * 100).toFixed(2)}` : ''),
    );
  }
  const outlines: Report['outlines'] = new Map();
  for (const [name, ws] of Object.entries(cols)) {
    const keep = ws.map((w, i) => [ts[i]!, w] as const).filter(([, w]) => Number.isFinite(w));
    if (keep.length < 5) continue;
    const tt = keep.map(([t]) => t);
    const ww = keep.map(([, w]) => w);
    const h = hullGap(tt, ww);
    const e = ellipseFit(tt, ww);
    const k = largestTurn(tt, ww);
    outlines.set(name, { gap: h.gap, dents: h.dents, gapAt: h.at, dev: e.dev, devAt: e.at, turn: k.turn, turnAt: k.at });
  }
  let facets: Report['facets'] = null;
  if (mesh.light) {
    // The light trunk faces of the front half in the range, and the angles over their edges.
    const nt = mesh.tris.length / 3;
    const normal = (i: number): Vector3 => {
      const [a, b, c] = [0, 1, 2].map((k) => {
        const v = mesh.tris[i * 3 + k]!;
        return new Vector3(local[v * 3], local[v * 3 + 1], local[v * 3 + 2]);
      });
      return new Vector3().subVectors(b!, a!).cross(new Vector3().subVectors(c!, a!)).normalize();
    };
    const inPatch = new Uint8Array(nt);
    for (let i = 0; i < nt; i++) {
      if (!mesh.trunk![i] || mesh.light[i]! <= lightCut) continue;
      let ty = 0;
      let tz = 0;
      for (let k = 0; k < 3; k++) {
        ty += local[mesh.tris[i * 3 + k]! * 3 + 1]! / 3;
        tz += local[mesh.tris[i * 3 + k]! * 3 + 2]! / 3;
      }
      if (ty >= from * frame.len && ty <= to * frame.len && tz > 0) inPatch[i] = 1;
    }
    const edges = new Map<string, number[]>();
    for (let i = 0; i < nt; i++) {
      if (!inPatch[i]) continue;
      for (let e = 0; e < 3; e++) {
        const a = mesh.tris[i * 3 + e]!;
        const b = mesh.tris[i * 3 + ((e + 1) % 3)]!;
        const k = a < b ? `${a},${b}` : `${b},${a}`;
        edges.set(k, [...(edges.get(k) ?? []), i]);
      }
    }
    const angles: number[] = [];
    const where: [number, string][] = [];
    for (const [key, faces] of edges.entries()) {
      if (faces.length !== 2) continue;
      const d = Math.min(1, Math.max(-1, normal(faces[0]!).dot(normal(faces[1]!))));
      const angle = (Math.acos(d) * 180) / Math.PI;
      angles.push(angle);
      const [a, b] = key.split(',').map(Number);
      const mid = [0, 1, 2].map((k) => ((local[a! * 3 + k]! + local[b! * 3 + k]!) / 2) * 100);
      where.push([angle, `${angle.toFixed(1)} deg at x ${mid[0]!.toFixed(1)} t ${mid[1]!.toFixed(1)} d ${mid[2]!.toFixed(1)} cm (f ${(mid[1]! / 100 / frame.len).toFixed(2)})`]);
    }
    if (args.includes('--edges')) for (const [, w] of where.sort((p, q) => q[0] - p[0]).slice(0, 12)) console.log(`    edge ${w}`);
    angles.sort((a, b) => a - b);
    const q = (f: number): number => angles[Math.min(angles.length - 1, Math.floor(f * angles.length))] ?? 0;
    facets = {
      p50: q(0.5),
      p90: q(0.9),
      max: angles.at(-1) ?? 0,
      over25: angles.filter((a) => a > 25).length,
      edges: angles.length,
    };
  }
  return { outlines, facets, profile };
}

/** Writes the mesh with no arm faces as an OBJ file with the vertex colors of each face. */
function writeObj(path: string, mesh: Mesh, arm: Uint8Array, colors: Float32Array): void {
  const lines: string[] = [];
  const nt = mesh.tris.length / 3;
  let k = 1;
  const faces: string[] = [];
  for (let t = 0; t < nt; t++) {
    if (arm[t]) continue;
    const c = [0, 1, 2].map((i) => Math.pow(colors[t * 3 + i]!, 1 / 2.2).toFixed(3)).join(' ');
    for (let i = 0; i < 3; i++) {
      const v = mesh.tris[t * 3 + i]!;
      lines.push(`v ${mesh.pos[v * 3]!.toFixed(5)} ${mesh.pos[v * 3 + 1]!.toFixed(5)} ${mesh.pos[v * 3 + 2]!.toFixed(5)} ${c}`);
    }
    faces.push(`f ${k} ${k + 1} ${k + 2}`);
    k += 3;
  }
  writeFileSync(path, [...lines, ...faces].join('\n') + '\n');
}

function print(label: string, r: Report): void {
  const cells = [...r.outlines].map(
    ([k, o]) =>
      `${k}: hull ${(o.gap * 100).toFixed(2)} cm @${(o.gapAt * 100).toFixed(0)} dents ${o.dents} turn ${o.turn.toFixed(1)} deg @${(o.turnAt * 100).toFixed(0)} ellipse ${Number.isNaN(o.dev) ? 'none' : `${(o.dev * 100).toFixed(2)} cm @${(o.devAt * 100).toFixed(0)}`}`,
  );
  console.log(`${label}\n  ${cells.join('\n  ')}`);
  if (r.facets) {
    const f = r.facets;
    console.log(
      `  patch facets: ${f.edges} edges, angle p50 ${f.p50.toFixed(1)} p90 ${f.p90.toFixed(1)} max ${f.max.toFixed(1)} deg, over 25 deg ${f.over25}`,
    );
  }
  if (args.includes('--profile')) for (const line of r.profile) console.log(`    ${line}`);
}

const from = Number(opt('--from', '0.1'));
const to = Number(opt('--to', '0.85'));
const levels = Number(opt('--levels', '40'));

if (args.includes('--glb')) {
  const { mesh, frame } = glbMesh(opt('--glb', ''));
  print(`glb ${opt('--glb', '')}`, measure(mesh, frame, from, to, levels));
} else {
  const role = SWEEP_ROLES['violist']!;
  const demoName = opt('--demo', '');
  const demos = (await probeDemos()).filter((d) => !demoName || d.file.startsWith(demoName));
  let done = false;
  for (const demo of demos) {
    if (done) break;
    const scene = sceneOf(demo.bytes);
    if (!role.hasRole(scene.score)) continue;
    const player = role.players(scene)[0]!;
    const rig = player.model.studio!;
    const sm = rig.mesh;
    const { trunk, light } = appMasks(sm.joints, sm.weights, sm.corners, sm.colors);
    const heads = rig.body.heads;
    const hips = new Vector3(...heads.hips);
    const neck = new Vector3(...heads.neck);
    const frame = frameOf(hips, neck, -1);
    if (args.includes('--bind')) {
      const mesh: Mesh = { pos: Float64Array.from(sm.positions), tris: sm.corners, trunk, light };
      if (args.includes('--obj')) writeObj(`${opt('--obj', '')}-bind.obj`, mesh, armMask(sm.joints, sm.weights, sm.corners), sm.colors);
      print(`bind (${demo.file})`, measure(mesh, frame, from, to, levels));
      done = true;
      break;
    }
    const setArg = opt('--pose', 'rest');
    const [setName, nth] = setArg.split('@');
    const set = role.sampleSets(scene).find((s) => s.name === setName)!;
    const every = Number(nth ?? '1');
    const samples = (set.samples as SweepSample[]).filter((_, i) => i % every === 0);
    for (const sample of samples) {
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
      // Back into the bind frame of the hips bone.
      const hipsIndex = STUDIO_BONES.indexOf('hips');
      const m = new Matrix4().fromArray(pose.matrices, hipsIndex * 16).invert();
      const pos = new Float64Array(verts.length);
      const q = new Vector3();
      for (let v = 0; v < verts.length / 3; v++) {
        q.set(verts[v * 3]!, verts[v * 3 + 1]!, verts[v * 3 + 2]!).applyMatrix4(m);
        pos[v * 3] = q.x;
        pos[v * 3 + 1] = q.y;
        pos[v * 3 + 2] = q.z;
      }
      const mesh: Mesh = { pos, tris: sm.corners, trunk, light };
      if (args.includes('--obj')) writeObj(`${opt('--obj', '')}-${setName}-${sample[1].toFixed(1)}.obj`, mesh, armMask(sm.joints, sm.weights, sm.corners), sm.colors);
      print(
        `${setName} ${demo.file} song ${sample[0].toFixed(2)} wall ${sample[1].toFixed(2)}`,
        measure(mesh, frame, from, to, levels),
      );
    }
    done = true;
  }
}
