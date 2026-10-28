// The front profile of the wolf body in the rest pose: the front-most z of the trunk and the thighs
// for each height above the seat, near the middle plane, and the shoulder joints.
import { Vector3 } from 'three';
import { probeDemos } from '../../../../tools/probe-demos.ts';
import { BONE_NAMES, boneIndex } from '../../../../src/models/rig.ts';
import { CHAIR, seatHeights } from '../../../../src/models/props.ts';
import { SPECIES } from '../../../../src/models/species.ts';
import { poseSkeleton } from '../../../../src/pose/test-kinematics.ts';
import { posedCorner } from '../../../../src/pose/test-skin.ts';
import { createScenePose, poseAt } from '../../../../src/pose/pose-at.ts';
import { countInAt } from '../../../../src/pose/count-in.ts';
import { NOT_STARTED, allAudible, sceneOf } from '../../../../src/pose/test-scene.ts';
const demos = await probeDemos();
const demo = demos.find((d) => d.file === 'beethoven-1.mid')!;
const scene = sceneOf(demo.bytes);
const index = scene.layout.players.findIndex((p) => p.cast.species === 'wolf' && p.cast.support === 'chair');
const place = scene.layout.players[index]!;
const model = scene.models.get(place.cast.species, place.cast.instrument, place.cast.kettles, place.cast.support);
const seat = seatHeights('chair', SPECIES.wolf)!;
const seatDepth = seat.seatDepth ?? CHAIR.seatDepth;
const seatFront = (CHAIR.seatDepth - seatDepth) / 2 - seatDepth / 2;
const start = -countInAt(scene.plan.beats, 0).lengthSec;
const pose = poseAt(scene.plan, start, 10, NOT_STARTED, allAudible(scene.score), createScenePose(scene.plan)).players[index]!;
const posed = poseSkeleton(model, pose);
const corners = new Float32Array(model.mesh.bones.length * 3); for (let c = 0; c < model.mesh.bones.length; c++) { const v = posedCorner(posed, c); corners[c*3]=v[0]; corners[c*3+1]=v[1]; corners[c*3+2]=v[2]; }
const keep = new Set(['hips', 'spine', 'chest', 'thighL', 'thighR', 'shinL', 'shinR', 'neck']);
const bins = new Map<number, { z: number; xl: number; xr: number }>();
for (let c = 0; c < model.mesh.bones.length; c++) {
  const name = BONE_NAMES[model.mesh.bones[c] ?? 0] ?? '';
  if (!keep.has(name)) continue;
  const p = new Vector3(corners[c * 3], corners[c * 3 + 1], corners[c * 3 + 2]);
  const y = Math.round((p.y - seat.seatHeight) * 100 / 3) * 3;
  const b = bins.get(y) ?? { z: Infinity, xl: Infinity, xr: Infinity };
  if (Math.abs(p.x) < 0.06) b.z = Math.min(b.z, p.z - seatFront);
  bins.set(y, b);
}
for (const [y, b] of [...bins].toSorted((a, b) => a[0] - b[0])) {
  if (y < -10 || y > 70) continue;
  console.log(`y-seat ${y} cm: front z-front ${(b.z * 100).toFixed(1)} cm`);
}
for (const n of ['shoulderL', 'shoulderR', 'upperArmL', 'forearmL', 'handL', 'handR', 'chest', 'hips', 'thighL', 'shinL'] as const) {
  try {
    const f = posed.frames[boneIndex(n)]!;
    console.log(n, ((f.position.x) * 100).toFixed(1), ((f.position.y - seat.seatHeight) * 100).toFixed(1), ((f.position.z - seatFront) * 100).toFixed(1));
  } catch (e) { console.log(n, 'no'); }
}
console.log('H', model.body.headHeight);
// The top of the body under a vertical ray at each x and z: the highest hit on any triangle of
// the lower body (main bone hips, thighs, shins), in cm above the seat.
const xs = [-27, -24, -21, -18, -15, -12, -9, -6, -3, 0, 3, 6, 9, 12, 15, 18, 21, 24, 27];
const lower = new Set(['hips', 'thighL', 'thighR', 'shinL', 'shinR', 'spine']);
const tris: number[][] = [];
for (let c = 0; c + 2 < model.mesh.bones.length; c += 3) {
  const names = [c, c + 1, c + 2].map((k) => BONE_NAMES[model.mesh.bones[k] ?? 0] ?? '');
  if (!names.some((n) => lower.has(n))) continue;
  tris.push([c, c + 1, c + 2].flatMap((k) => [corners[k * 3]!, corners[k * 3 + 1]! - seat.seatHeight, corners[k * 3 + 2]! - seatFront]));
}
function topAt(x: number, z: number, maxY: number): number {
  let best = -Infinity;
  for (const t of tris) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = t as [number, number, number, number, number, number, number, number, number];
    const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
    if (Math.abs(d) < 1e-12) continue;
    const l1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d;
    const l2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d;
    const l3 = 1 - l1 - l2;
    if (l1 < 0 || l2 < 0 || l3 < 0) continue;
    const y = l1 * ay + l2 * by + l3 * cy;
    if (y < maxY && y > best) best = y;
  }
  return best;
}
console.log('top of the lower body under y-seat 0.25 m, cm above the seat; rows z-front cm, columns x cm: ' + xs.join(' '));
for (const z of [-21, -18, -15, -12, -9, -6, -3, 0, 3, 6, 9]) {
  console.log(`z ${String(z).padStart(3)}: ` + xs.map((x) => { const v = topAt(x / 100, z / 100, 0.25); return v === -Infinity ? '  .' : (v * 100).toFixed(0).padStart(3); }).join(' '));
}
function hitsAt(x: number, z: number): number[] {
  const out: number[] = [];
  for (const t of tris) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = t as [number, number, number, number, number, number, number, number, number];
    const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
    if (Math.abs(d) < 1e-12) continue;
    const l1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d;
    const l2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d;
    const l3 = 1 - l1 - l2;
    if (l1 < 0 || l2 < 0 || l3 < 0) continue;
    out.push(Math.round((l1 * ay + l2 * by + l3 * cy) * 1000) / 10);
  }
  return out.toSorted((a, b) => a - b);
}
for (const x of [0, 4, 8]) for (const z of [-9, -6, -3, 0, 3, 6]) console.log(`hits x ${x} z ${z}: ${hitsAt(x / 100, z / 100).join(' ')}`);
// Horizontal rays along x from the middle plane: the first hit on each side, at a height and a depth.
function sideHits(y: number, z: number): string {
  const hits: number[] = [];
  for (const t of tris) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = t as [number, number, number, number, number, number, number, number, number];
    const d = (by - cy) * (az - cz) + (cz - bz) * (ay - cy);
    if (Math.abs(d) < 1e-12) continue;
    const l1 = ((by - cy) * (z - cz) + (cz - bz) * (y - cy)) / d;
    const l2 = ((cy - ay) * (z - cz) + (ay - cy) * 0 + (az - cz) * (y - cy) * 0 + (cy - ay) * 0) / d;
    void l2;
    // Solve in the (z, y) plane: barycentric weights of (z, y).
    const det = (bz - az) * (cy - ay) - (cz - az) * (by - ay);
    if (Math.abs(det) < 1e-12) continue;
    const u = ((z - az) * (cy - ay) - (cz - az) * (y - ay)) / det;
    const v = ((bz - az) * (y - ay) - (z - az) * (by - ay)) / det;
    if (u < 0 || v < 0 || u + v > 1) continue;
    hits.push(ax + u * (bx - ax) + v * (cx - ax));
    void l1;
  }
  const left = hits.filter((x) => x < 0).toSorted((a, b) => b - a)[0];
  const right = hits.filter((x) => x > 0).toSorted((a, b) => a - b)[0];
  return `${left === undefined ? '-' : (left * 100).toFixed(1)} / ${right === undefined ? '-' : (right * 100).toFixed(1)}`;
}
for (const y of [0, 3, 6, 9]) for (const z of [-12, -9, -6, -3, 0]) console.log(`inner x at y ${y} z ${z}: ${sideHits(y / 100, z / 100)}`);
