// For each studio body and each pea eye: how far the rim of the oval stands out of the head, the
// angle between the axis of the oval and the mean normal of the head surface under it, the front
// corners inside the head (the rule of eyePush()), and the visible area of the eye in a front, a
// 60° and a 90° view, by orthographic rays against the head faces and the eye faces.
// Usage: node docs/research/2026-10-20-pea-eyes/eye-fit.ts [<studio dir>] [--variants]
// <studio dir> holds the modules of the bodies (src/models/studio by default), so the modules of
// another commit can be read: git show <ref>:src/models/studio/<x>.ts > <dir>/<x>.ts.
// --variants also prints the measures of axis blends from the normal (w 0) to the direction of
// the body (w 1), each with the push of eyePush() along that axis.
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Ray, Triangle, Vector3 } from 'three';
import { EYE, addEye } from '../../../src/models/eyes.ts';
import type { EyeBend } from '../../../src/models/eyes.ts';
import { MeshBuilder } from '../../../src/models/mesh.ts';
import { STUDIO_BONES, unpackStudioMesh } from '../../../src/models/studio-format.ts';
import type { StudioBody, StudioMesh } from '../../../src/models/studio-format.ts';

type Vec3 = [number, number, number];
const args = process.argv.slice(2);
const dir = resolve(args.find((a) => !a.startsWith('--')) ?? 'src/models/studio');
const variants = args.includes('--variants');
const only = process.env['ONLY']?.split(',');

const HEAD = STUDIO_BONES.indexOf('head');
const EARS = [STUDIO_BONES.indexOf('ear_L'), STUDIO_BONES.indexOf('ear_R')];

interface Measure {
  rim: number;
  rimTilt: number;
  closed: number;
  frontIn: number;
  frontWorst: number;
  angle: number;
  middle: number;
  views: number[];
  shares: number[];
}

/** The triangles of the head: each corner more than half on the head and the ear bones. */
function headTriangles(body: StudioBody, posed?: StudioMesh): Triangle[] {
  const mesh = posed ?? unpackStudioMesh(body.mesh);
  const onHead = (v: number): boolean => {
    let w = 0;
    for (let k = 0; k < 4; k++) {
      const j = mesh.joints[v * 4 + k] ?? 0;
      if (j === HEAD || EARS.includes(j)) w += mesh.weights[v * 4 + k] ?? 0;
    }
    return w > 0.5;
  };
  const out: Triangle[] = [];
  for (let t = 0; t < mesh.corners.length / 3; t++) {
    const c = [0, 1, 2].map((k) => mesh.corners[t * 3 + k] ?? 0);
    if (c.every(onHead)) {
      const p = c.map((v) => new Vector3().fromArray(mesh.positions, v * 3));
      out.push(new Triangle(p[0], p[1], p[2]));
    }
  }
  return out;
}

const near = new Vector3();
const normal = new Vector3();
/** The signed distance of a point from the head: positive outside, by the nearest face. */
function signed(tris: readonly Triangle[], p: Vector3): number {
  let best = Infinity;
  let side = 1;
  for (const tri of tris) {
    tri.closestPointToPoint(p, near);
    const d = near.distanceTo(p);
    if (d < best) {
      best = d;
      side = p.clone().sub(near).dot(tri.getNormal(normal)) >= 0 ? 1 : -1;
    }
  }
  return side * best;
}

/** The point of the head surface on the axis line of the eye, nearest to the middle. */
function surfaceOnAxis(tris: readonly Triangle[], middle: Vector3, axis: Vector3, h: number): Vector3 {
  let best = Infinity;
  let at = middle.clone();
  const hit = new Vector3();
  for (const sign of [1, -1]) {
    const ray = new Ray(middle.clone().addScaledVector(axis, sign * -0.3 * h), axis.clone().multiplyScalar(sign));
    for (const tri of tris) {
      if (ray.intersectTriangle(tri.a, tri.b, tri.c, false, hit)) {
        const t = hit.clone().sub(middle).dot(axis);
        if (tri.getNormal(normal).dot(axis) > 0 && Math.abs(t) < best) {
          best = Math.abs(t);
          at = hit.clone();
        }
      }
    }
  }
  return at;
}

/** The area mean normal of the head faces within the radius of a point. */
function meanNormal(tris: readonly Triangle[], p: Vector3, radius: number): Vector3 {
  const sum = new Vector3();
  for (const tri of tris) {
    if (tri.closestPointToPoint(p, near).distanceTo(p) <= radius) {
      sum.addScaledVector(tri.getNormal(normal), tri.getArea());
    }
  }
  return sum.normalize();
}

/** A bend of the oval: the move along the axis at a place across the axis, from the middle. */
type Bend = (across: number, up: number) => number;

/** The frame of an eye: across and up in its plane, as addEye() makes them. */
function frame(axis: Vector3): [Vector3, Vector3] {
  const up = new Vector3(0, 1, 0).projectOnPlane(axis).normalize();
  return [new Vector3().crossVectors(up, axis), up];
}

/** The triangles of a pea eye, and its corners with their depths along the axis. */
function eyeParts(middle: Vector3, axis: Vector3, h: number, bendBy?: Bend | EyeBend) {
  // A tuple is the bend of a body, which addEye() applies as the app does.
  const own = Array.isArray(bendBy) ? (bendBy as EyeBend) : undefined;
  const bend = typeof bendBy === 'function' ? bendBy : undefined;
  const b = new MeshBuilder();
  addEye(b, { eye: [0, 0, 0], eyeLight: [1, 1, 1] }, { point: middle.toArray() as Vec3, normal: axis.toArray() as Vec3 }, h, 0, own);
  const flat = new MeshBuilder();
  addEye(flat, { eye: [0, 0, 0], eyeLight: [1, 1, 1] }, { point: middle.toArray() as Vec3, normal: axis.toArray() as Vec3 }, h, 0);
  const unbent = flat.build();
  const m = b.build();
  const corners: { p: Vector3; z: number; dark: boolean }[] = [];
  const tris: Triangle[] = [];
  for (let c = 0; c < m.positions.length / 3; c++) {
    const p = new Vector3().fromArray(m.positions, c * 3);
    // The depth along the axis before the bend selects the rim and the front.
    const z = new Vector3().fromArray(unbent.positions, c * 3).sub(middle).dot(axis);
    if (bend) {
      const [across, up] = frame(axis);
      const d = p.clone().sub(middle);
      p.addScaledVector(axis, bend(d.dot(across), d.dot(up)));
    }
    corners.push({ p, z, dark: (m.colors[c * 3] ?? 0) === 0 });
  }
  for (let t = 0; t < corners.length / 3; t++) {
    tris.push(new Triangle(corners[t * 3]!.p, corners[t * 3 + 1]!.p, corners[t * 3 + 2]!.p));
  }
  return { corners, tris };
}

/** The visible area of the eye along a view direction (from the camera to the eye), in H². */
function visible(head: readonly Triangle[], eye: readonly Triangle[], middle: Vector3, view: Vector3, h: number): [number, number] {
  const right = new Vector3(0, 1, 0).cross(view).normalize();
  const up = view.clone().cross(right).normalize();
  const span = 0.14 * h;
  const step = 0.004 * h;
  // Only the faces whose projection meets the window take part.
  const inWindow = (tris: readonly Triangle[]) =>
    tris.filter((tri) => {
      const xs = [tri.a, tri.b, tri.c].map((p) => p.clone().sub(middle));
      const u = xs.map((x) => x.dot(right));
      const v = xs.map((x) => x.dot(up));
      return Math.max(...u) >= -span && Math.min(...u) <= span && Math.max(...v) >= -span && Math.min(...v) <= span;
    });
  const heads = inWindow(head);
  const eyes = inWindow(eye);
  let shown = 0;
  let all = 0;
  const hit = new Vector3();
  let line = '';
  for (let j = span; j >= -span; j -= 2 * step) {
    for (let i = -span; i <= span; i += step) {
      const origin = middle.clone().addScaledVector(right, i).addScaledVector(up, j).addScaledVector(view, -2 * h);
      const ray = new Ray(origin, view);
      let eyeT = Infinity;
      for (const tri of eyes) {
        if (ray.intersectTriangle(tri.a, tri.b, tri.c, false, hit)) eyeT = Math.min(eyeT, hit.distanceTo(origin));
      }
      if (eyeT === Infinity) {
        line += ' ';
        continue;
      }
      all++;
      let headT = Infinity;
      for (const tri of heads) {
        if (ray.intersectTriangle(tri.a, tri.b, tri.c, false, hit)) headT = Math.min(headT, hit.distanceTo(origin));
      }
      if (eyeT < headT) shown++;
      if (process.env['MAP']) line += eyeT < headT ? '#' : '.';
    }
    if (process.env['MAP']) { console.log('      ' + line); line = ''; }
  }
  const cell = (2 * step * step) / (h * h);
  return [shown * cell, all > 0 ? shown / all : 0];
}

/** The views of an eye: front (+z), 60°, 90°, and 120° toward its side, as directions from the camera. */
function viewsOf(side: 'L' | 'R'): Vector3[] {
  const s = side === 'L' ? -1 : 1;
  return [0, 60, 90, 120].map((deg) => {
    const a = (deg * Math.PI) / 180;
    return new Vector3(s * Math.sin(a), 0, -Math.cos(a)).negate();
  });
}

function measure(head: readonly Triangle[], middle: Vector3, axis: Vector3, h: number, side: 'L' | 'R', surface: Vector3, bend?: Bend | EyeBend): Measure {
  const { corners, tris } = eyeParts(middle, axis, h, bend);
  const dark = corners.filter((c) => c.dark);
  const rim = Math.max(...dark.filter((c) => Math.abs(c.z) < 0.012 * h).map((c) => signed(head, c.p))) / h;
  if (process.env['DEBUG'] && bend) {
    const [across, up] = frame(axis);
    for (const c of dark.filter((k) => Math.abs(k.z) < 0.012 * h)) {
      const d = c.p.clone().sub(middle);
      console.log(`    rim corner u ${(d.dot(across) / h).toFixed(3)} v ${(d.dot(up) / h).toFixed(3)} z ${(d.dot(axis) / h).toFixed(3)} out ${(signed(head, c.p) / h).toFixed(3)}`);
    }
  }
  const front = dark.filter((c) => c.z > 0.25 * EYE[2] * h).map((c) => signed(head, c.p));
  // A closed eye: the eye bone scales y to 0.05 around the middle (the blink of scene/player.ts).
  const closed = Math.max(...dark.map((c) => signed(head, new Vector3(c.p.x, middle.y + 0.05 * (c.p.y - middle.y), c.p.z)))) / h;
  const n = meanNormal(head, surface, 0.09 * h);
  const angle = (Math.acos(Math.min(1, n.dot(axis))) * 180) / Math.PI;
  // The tilt of the rim against the face: the angle between a plane fit z = a u + b v + c of the
  // rim corners in the frame of the eye, and the same fit of the head surface at their places.
  const [across, up] = frame(axis);
  const rimPlaces = dark.filter((c) => Math.abs(c.z) < 0.012 * h).map((c) => {
    const d = c.p.clone().sub(middle);
    return [d.dot(across), d.dot(up), d.dot(axis)] as const;
  });
  const planeNormal = (points: readonly (readonly [number, number, number])[]): Vector3 => {
    const k = points.length;
    const sum = (f: (r: readonly [number, number, number]) => number) => points.reduce((t, r) => t + f(r), 0);
    const [su, sv, sz] = [sum((r) => r[0]), sum((r) => r[1]), sum((r) => r[2])];
    const uu = sum((r) => r[0] * r[0]) - (su * su) / k;
    const vv = sum((r) => r[1] * r[1]) - (sv * sv) / k;
    const uv = sum((r) => r[0] * r[1]) - (su * sv) / k;
    const uz = sum((r) => r[0] * r[2]) - (su * sz) / k;
    const vz = sum((r) => r[1] * r[2]) - (sv * sz) / k;
    const det = uu * vv - uv * uv;
    const a = (uz * vv - vz * uv) / det;
    const b = (vz * uu - uz * uv) / det;
    return axis.clone().addScaledVector(across, -a).addScaledVector(up, -b).normalize();
  };
  const under = rimPlaces.map(([u, v]) => [u, v, heightAt(head, surface, axis, u, v, h)] as const);
  const rimTilt = (Math.acos(Math.min(1, planeNormal(under).dot(planeNormal(rimPlaces)))) * 180) / Math.PI;
  const vis = viewsOf(side).map((v) => visible(head, tris, middle, v, h));
  return {
    rim,
    rimTilt,
    closed,
    frontIn: front.filter((d) => d < 0).length,
    frontWorst: Math.min(...front) / h,
    angle,
    middle: middle.clone().sub(surface).dot(axis) / h,
    views: vis.map((x) => x[0]),
    shares: vis.map((x) => x[1]),
  };
}

/** The push of eyePush(): the smallest move along the axis that puts each front corner outside. */
function push(head: readonly Triangle[], start: Vector3, axis: Vector3, h: number): number {
  const front = eyeParts(start, axis, h).corners.filter((c) => c.dark && c.z > 0.25 * EYE[2] * h);
  for (let step = 0; step <= 100; step++) {
    const d = step * 0.001 * h;
    if (front.every((c) => signed(head, c.p.clone().addScaledVector(axis, d)) >= 0)) return d;
  }
  return NaN;
}

/** The height of the head surface along the axis at a place across it, from the surface point. */
function heightAt(head: readonly Triangle[], surface: Vector3, axis: Vector3, u: number, v: number, h: number): number {
  const [across, up] = frame(axis);
  const base = surface.clone().addScaledVector(across, u).addScaledVector(up, v);
  return surfaceOnAxis(head, base, axis, h).sub(base).dot(axis);
}

/** The exact bend at each place, by a cast along the axis. */
function exactBend(head: readonly Triangle[], surface: Vector3, axis: Vector3, h: number): Bend {
  return (u, v) => heightAt(head, surface, axis, u, v, h);
}

/** A least squares fit a u + b v + c u² + d u v + e v² of the heights over the oval, in H. */
function quadBend(head: readonly Triangle[], surface: Vector3, axis: Vector3, h: number): { bend: Bend; k: number[] } {
  const rows: number[][] = [];
  const ys: number[] = [];
  for (let i = -6; i <= 6; i++) {
    for (let j = -6; j <= 6; j++) {
      const u = (i / 6) * 0.5 * EYE[0] * 1.1;
      const v = (j / 6) * 0.5 * EYE[1] * 1.1;
      if ((u / (0.55 * EYE[0])) ** 2 + (v / (0.55 * EYE[1])) ** 2 > 1) continue;
      rows.push([u, v, u * u, u * v, v * v]);
      ys.push(heightAt(head, surface, axis, u * h, v * h, h) / h);
    }
  }
  // Normal equations, solved by Gauss elimination.
  const n = 5;
  const a = Array.from({ length: n }, (_, r) => Array.from({ length: n + 1 }, (_, c) => rows.reduce((sum, row, k) => sum + row[r]! * (c < n ? row[c]! : ys[k]!), 0)));
  for (let c = 0; c < n; c++) {
    let pivot = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r]![c]!) > Math.abs(a[pivot]![c]!)) pivot = r;
    [a[c], a[pivot]] = [a[pivot]!, a[c]!];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = a[r]![c]! / a[c]![c]!;
      for (let k = c; k <= n; k++) a[r]![k]! -= f * a[c]![k]!;
    }
  }
  const k = a.map((row, r) => row[n]! / row[r]!);
  const bend: Bend = (u, v) => {
    const x = u / h;
    const y = v / h;
    return h * (k[0]! * x + k[1]! * y + k[2]! * x * x + k[3]! * x * y + k[4]! * y * y);
  };
  return { bend, k };
}

const fmt = (m: Measure) =>
  `rim ${m.rim.toFixed(3)} H, rim tilt ${m.rimTilt.toFixed(0)}°, closed ${m.closed.toFixed(3)} H, angle ${m.angle.toFixed(0)}°, middle ${m.middle.toFixed(3)} H, front in ${m.frontIn} (worst ${m.frontWorst.toFixed(3)} H), seen 0/60/90/120 ${m.views.map((v) => v.toFixed(4)).join('/')} H² (${m.shares.map((s) => (100 * s).toFixed(0)).join('/')}%)`;

if (process.env['FLAT']) {
  // A pea eye of a parametric body on one flat face of the head: the plane y z through the origin.
  const h = 1;
  const axis = new Vector3(-1, 0, 0);
  const big = 1;
  const a = new Vector3(0, -big, -big);
  const b = new Vector3(0, big, -big);
  const c = new Vector3(0, big, big);
  const d = new Vector3(0, -big, big);
  const plane = [new Triangle(a, c, b), new Triangle(a, d, c)];
  if (plane[0]!.getNormal(new Vector3()).x > 0) plane.splice(0, 2, new Triangle(a, b, c), new Triangle(a, c, d));
  const surface = new Vector3();
  const middle = surface.clone().addScaledVector(axis, -0.01 * h);
  for (const turn of [0, 30, 45]) {
    // The face turns from the side toward the front by the angle, as an eye between the front and the side.
    const t = (turn * Math.PI) / 180;
    const k = new Vector3(-Math.cos(t), 0, -Math.sin(t));
    const rot = new Vector3(0, 1, 0);
    const q = new (await import('three')).Quaternion().setFromUnitVectors(axis, k);
    const tris = plane.map((tri) => new Triangle(tri.a.clone().applyQuaternion(q), tri.b.clone().applyQuaternion(q), tri.c.clone().applyQuaternion(q)));
    const m = measure(tris, middle.clone().applyQuaternion(q), k, h, 'L', surface);
    console.log(`flat face turned ${turn}° from the side: ${fmt(m)}`);
    void rot;
  }
  process.exit(0);
}

const files = readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.includes('.test.'));
for (const file of files.sort()) {
  const animal = file.replace(/\.ts$/, '');
  if (only && !only.includes(animal)) continue;
  const mod = (await import(resolve(dir, file))) as Record<string, StudioBody>;
  const seated = Object.values(mod)[0]!;
  // STAND measures the standing body of a body that also stands (studioRig() of the app).
  const stand = process.env['STAND'] !== undefined;
  if (stand && !seated.standing) continue;
  const rig = stand ? (await import('../../../src/models/studio-rig.ts')).studioRig(seated, true) : null;
  const body = rig ? rig.body : seated;
  const head = headTriangles(body, rig?.mesh);
  const h = body.eyes.headHeight;
  for (const side of ['L', 'R'] as const) {
    const middle = new Vector3(...body.heads[`eye_${side}`]);
    const axis = new Vector3(...body.eyes.directions[side]);
    const surface = surfaceOnAxis(head, middle, axis, h);
    const own = (body.eyes as { bends?: Record<'L' | 'R', EyeBend> }).bends?.[side];
    // LIFT moves a bent eye out along its axis, in H, to try a smaller depth under the fur.
    const lift = Number(process.env['LIFT'] ?? '0') * h;
    const m = measure(head, middle.clone().addScaledVector(axis, lift), axis, h, side, surface, own);
    console.log(`${animal} ${side}: ${fmt(m)}${own ? ` bend [${own.join(', ')}]` : ''}`);
    if (variants) {
      const n = meanNormal(head, surface, 0.09 * h);
      const up = (v: Vector3) => ((Math.asin(v.y) * 180) / Math.PI).toFixed(0);
      console.log(`  normal ${n.toArray().map((x) => x.toFixed(2)).join(', ')} (up ${up(n)}°), direction up ${up(axis)}°`);
      for (const w of (process.env['WS'] ?? '0,0.25,0.5,0.75,1').split(',').map(Number)) {
        const a = n.clone().lerp(axis, w).normalize();
        const start = surface.clone().addScaledVector(a, -0.01 * h);
        const d = push(head, start, a, h);
        const v = measure(head, start.clone().addScaledVector(a, d), a, h, side, surface);
        console.log(`  w ${w}: push ${(d / h).toFixed(3)} H, ${fmt(v)}`);
        if (process.env['BEND']) {
          const mid = surface.clone().addScaledVector(a, -0.01 * h);
          const e = measure(head, mid, a, h, side, surface, exactBend(head, surface, a, h));
          console.log(`    exact bend: ${fmt(e)}`);
          const q = quadBend(head, surface, a, h);
          const f = measure(head, mid, a, h, side, surface, q.bend);
          console.log(`    quad bend [${q.k.map((x) => x.toFixed(2)).join(', ')}]: ${fmt(f)}`);
        }
      }
    }
  }
}
