// For the left pea eye of a studio body: where on the head a flat oval fits. For each move of
// the eye place out to the side and up, in H of the eyes, from the eye bone of the module, the
// place goes to the nearest point of the head surface. A plane fit of the surface over the oval
// (with a margin of 10%) gives its normal. The probe prints the angle of that normal up from
// level and out from the front, and the spread of the surface over the oval about the plane:
// the most below (the rim of a flat oval on the plane stands out this far) and the most above
// (the head covers the oval this deep), in thousandths of H.
// Usage: node docs/research/2026-10-20-bear-eyes/eye-flat.ts <animal> [<studio dir>]
import { resolve } from 'node:path';
import { Ray, Triangle, Vector3 } from 'three';
import { EYE } from '../../../src/models/eyes.ts';
import { STUDIO_BONES, unpackStudioMesh } from '../../../src/models/studio-format.ts';
import type { StudioBody } from '../../../src/models/studio-format.ts';

const animal = process.argv[2] ?? 'bear';
const dir = resolve(process.argv[3] ?? 'src/models/studio');
const mod = (await import(resolve(dir, `${animal}.ts`))) as Record<string, StudioBody>;
const body = Object.values(mod)[0]!;
const mesh = unpackStudioMesh(body.mesh);
const HEAD = STUDIO_BONES.indexOf('head');
const head: Triangle[] = [];
for (let t = 0; t < mesh.corners.length / 3; t++) {
  const c = [0, 1, 2].map((k) => mesh.corners[t * 3 + k] ?? 0);
  const on = (v: number) => [0, 1, 2, 3].reduce((w, k) => w + (mesh.joints[v * 4 + k] === HEAD ? (mesh.weights[v * 4 + k] ?? 0) : 0), 0) > 0.5;
  if (c.every(on)) {
    const p = c.map((v) => new Vector3().fromArray(mesh.positions, v * 3));
    head.push(new Triangle(p[0], p[1], p[2]));
  }
}
const h = body.eyes.headHeight;
const eye = new Vector3(...body.heads.eye_L);
const near = new Vector3();
const nearest = (p: Vector3) => {
  let best = Infinity;
  const at = new Vector3();
  for (const tri of head) {
    tri.closestPointToPoint(p, near);
    if (near.distanceTo(p) < best) {
      best = near.distanceTo(p);
      at.copy(near);
    }
  }
  return at;
};
const heightAt = (base: Vector3, axis: Vector3) => {
  const ray = new Ray(base.clone().addScaledVector(axis, -0.3 * h), axis);
  const hit = new Vector3();
  const n = new Vector3();
  let best: number | null = null;
  for (const tri of head) {
    if (tri.getNormal(n).dot(axis) > 0 && ray.intersectTriangle(tri.a, tri.b, tri.c, false, hit)) {
      const t = hit.sub(base).dot(axis);
      if (Math.abs(t) < 0.3 * h && (best === null || Math.abs(t) < Math.abs(best))) best = t;
    }
  }
  return best;
};
const meanNormal = (p: Vector3) => {
  const sum = new Vector3();
  const n = new Vector3();
  for (const tri of head) if (tri.closestPointToPoint(p, near).distanceTo(p) <= 0.09 * h) sum.addScaledVector(tri.getNormal(n), tri.getArea());
  return sum.normalize();
};
/** The plane fit z = a u + b v + c of the heights over the oval, and the spread about it. */
function fit(place: Vector3, axis: Vector3) {
  const up = new Vector3(0, 1, 0).projectOnPlane(axis).normalize();
  const across = new Vector3().crossVectors(up, axis);
  const pts: [number, number, number][] = [];
  for (let i = -6; i <= 6; i++) {
    for (let j = -6; j <= 6; j++) {
      if (i * i + j * j > 36) continue;
      const u = (i / 6) * 0.55 * EYE[0] * h;
      const v = (j / 6) * 0.55 * EYE[1] * h;
      const z = heightAt(place.clone().addScaledVector(across, u).addScaledVector(up, v), axis);
      if (z !== null) pts.push([u, v, z]);
    }
  }
  const k = pts.length;
  const s = (f: (p: [number, number, number]) => number) => pts.reduce((t, p) => t + f(p), 0);
  const [mu, mv, mz] = [s((p) => p[0]) / k, s((p) => p[1]) / k, s((p) => p[2]) / k];
  const uu = s((p) => (p[0] - mu) ** 2), vv = s((p) => (p[1] - mv) ** 2), uv = s((p) => (p[0] - mu) * (p[1] - mv));
  const uz = s((p) => (p[0] - mu) * (p[2] - mz)), vz = s((p) => (p[1] - mv) * (p[2] - mz));
  const det = uu * vv - uv * uv;
  const a = (uz * vv - vz * uv) / det;
  const b = (vz * uu - uz * uv) / det;
  const res = pts.map((p) => p[2] - (mz + a * (p[0] - mu) + b * (p[1] - mv)));
  const normal = axis.clone().addScaledVector(across, -a).addScaledVector(up, -b).normalize();
  return { normal, below: -Math.min(...res) / h, above: Math.max(...res) / h, count: k };
}
console.log(`${animal} L eye, H of the eyes ${h} m. Rows: the move up; columns: the move out, in H. Each cell: up angle / out angle of the plane normal, most below / most above the plane in 0.001 H.`);
const outs = [-0.04, -0.02, 0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.12];
console.log('up     ' + outs.map((s) => `out ${s.toFixed(2)}`.padEnd(17)).join(''));
for (const dy of [0.16, 0.14, 0.12, 0.1, 0.08, 0.06, 0.04, 0.02, 0, -0.02, -0.04]) {
  const cells: string[] = [];
  for (const dx of outs) {
    const place = nearest(eye.clone().add(new Vector3(-dx * h, dy * h, 0)));
    let axis = meanNormal(place);
    let f = fit(place, axis);
    // Two rounds: the axis takes the plane normal.
    for (let r = 0; r < 2; r++) {
      axis = f.normal;
      f = fit(place, axis);
    }
    const upAngle = (Math.asin(axis.y) * 180) / Math.PI;
    const outAngle = (Math.atan2(-axis.x, -axis.z) * 180) / Math.PI;
    cells.push(`${upAngle.toFixed(0).padStart(3)}/${outAngle.toFixed(0).padStart(3)} ${String(Math.round(f.below * 1000)).padStart(2)}/${String(Math.round(f.above * 1000)).padStart(2)}${f.count < 100 ? '!' : ' '}`);
  }
  console.log(`${dy.toFixed(2).padStart(5)}  ${cells.join('  ')}`);
}
