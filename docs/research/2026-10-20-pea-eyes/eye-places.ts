// For the left pea eye of a studio body: the form of the head surface at places around the eye,
// to find a place where a flat oval fits. For each move of the eye place up and to the side, in
// H of the eyes, it prints the up angle of the mean normal of the faces within 0.09 H, and the
// largest height of the surface over the oval from the plane through the place along that normal.
// Usage: node docs/research/2026-10-20-pea-eyes/eye-places.ts <animal> [<studio dir>]
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
  const onHead = (v: number) => [0, 1, 2, 3].reduce((w, k) => w + (mesh.joints[v * 4 + k] === HEAD ? (mesh.weights[v * 4 + k] ?? 0) : 0), 0) > 0.5;
  if (c.every(onHead)) {
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
const meanNormal = (p: Vector3) => {
  const sum = new Vector3();
  const n = new Vector3();
  for (const tri of head) if (tri.closestPointToPoint(p, near).distanceTo(p) <= 0.09 * h) sum.addScaledVector(tri.getNormal(n), tri.getArea());
  return sum.normalize();
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
console.log(`${animal} L eye, head height of the eyes ${h} m. Rows: the move up; columns: the move to the side (- in, + out), in H.`);
const sides = [-0.04, -0.02, 0, 0.02, 0.04];
console.log('up    ' + sides.map((s) => `side ${s.toFixed(2)}`.padEnd(22)).join(''));
for (const dy of [-0.02, 0, 0.02, 0.04, 0.06, 0.08]) {
  const cells: string[] = [];
  for (const dx of sides) {
    const place = nearest(eye.clone().add(new Vector3(-dx * h, dy * h, 0)));
    const n = meanNormal(place);
    const up = new Vector3(0, 1, 0).projectOnPlane(n).normalize();
    const across = new Vector3().crossVectors(up, n);
    let most = 0;
    // The twist of the surface: the mean of (t / h) over u v, for the u v term of a fit.
    let twist = 0;
    let norm = 0;
    for (let i = -4; i <= 4; i++) {
      for (let j = -4; j <= 4; j++) {
        if (i * i + j * j > 16) continue;
        const u = (i / 4) * 0.5 * EYE[0];
        const v = (j / 4) * 0.5 * EYE[1];
        const base = place.clone().addScaledVector(across, u * h).addScaledVector(up, v * h);
        const t = heightAt(base, n);
        if (t !== null) {
          most = Math.max(most, Math.abs(t) / h);
          twist += (t / h) * u * v;
          norm += (u * v) ** 2;
        }
      }
    }
    cells.push(`${((Math.asin(n.y) * 180) / Math.PI).toFixed(0)}° ${most.toFixed(3)} uv ${(twist / norm).toFixed(1)}`.padEnd(22));
  }
  console.log(`${dy.toFixed(2)}  ${cells.join('')}`);
}
