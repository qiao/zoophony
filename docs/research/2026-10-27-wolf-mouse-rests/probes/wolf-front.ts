// The front of the wolf body at rest, by rays against the posed skin (diagnosis only). The first
// map gives the front-most skin of the trunk and the legs along a ray from the front, by the side
// place x and the height above the seat, in cm from the seat front (below 0 is in front of it).
// The second map gives the top of the legs by a ray from above, by x and z, in cm above the seat.
// The arms and the instrument do not count.
// Usage: node docs/research/2026-10-27-wolf-mouse-rests/probes/wolf-front.ts
import { Vector3 } from 'three';

import { probeDemos } from '../../../../tools/probe-demos.ts';
import { BONE_NAMES } from '../../../../src/models/rig.ts';
import { CHAIR, seatHeights } from '../../../../src/models/props.ts';
import { SPECIES } from '../../../../src/models/species.ts';
import { poseSkeleton } from '../../../../src/pose/test-kinematics.ts';
import { posedCorner } from '../../../../src/pose/test-skin.ts';
import { createScenePose, poseAt } from '../../../../src/pose/pose-at.ts';
import { countInAt } from '../../../../src/pose/count-in.ts';
import { NOT_STARTED, allAudible, sceneOf } from '../../../../src/pose/test-scene.ts';

const demos = await probeDemos();
const demo = demos.find((d) => d.file === 'beethoven-1.mid');
if (!demo) {
  throw new Error('no demo');
}
const scene = sceneOf(demo.bytes);
const index = scene.layout.players.findIndex(
  (p) => p.cast.species === 'wolf' && p.cast.instrument === 'clarinet' && p.cast.support === 'chair',
);
const place = scene.layout.players[index];
if (!place) {
  throw new Error('no wolf');
}
const model = scene.models.get(place.cast.species, place.cast.instrument, place.cast.kettles, place.cast.support);
const seat = seatHeights('chair', SPECIES.wolf);
if (!seat) {
  throw new Error('no seat');
}
const seatDepth = seat.seatDepth ?? CHAIR.seatDepth;
const seatFront = (CHAIR.seatDepth - seatDepth) / 2 - seatDepth / 2;
const start = -countInAt(scene.plan.beats, 0).lengthSec;
const pose = poseAt(scene.plan, start, 10, NOT_STARTED, allAudible(scene.score), createScenePose(scene.plan)).players[index];
if (!pose) {
  throw new Error('no pose');
}
const posed = poseSkeleton(model, pose);
const skip = /upperArm|forearm|hand|fingers|thumb|instrument|shoulder/;
const tris: Vector3[][] = [];
for (let c = 0; c + 2 < model.mesh.bones.length; c += 3) {
  const names = [c, c + 1, c + 2].map((k) => BONE_NAMES[model.mesh.bones[k] ?? 0] ?? '');
  if (names.some((n) => skip.test(n))) {
    continue;
  }
  tris.push([c, c + 1, c + 2].map((k) => new Vector3(...posedCorner(posed, k))));
}
const e1 = new Vector3();
const e2 = new Vector3();
const pv = new Vector3();
const tv = new Vector3();
const qv = new Vector3();
/** Gives the distances of the hits of a ray with the skin. */
function hits(origin: Vector3, dir: Vector3): number[] {
  const out: number[] = [];
  for (const [a, b, c] of tris) {
    if (!a || !b || !c) {
      continue;
    }
    e1.subVectors(b, a);
    e2.subVectors(c, a);
    pv.crossVectors(dir, e2);
    const det = e1.dot(pv);
    if (Math.abs(det) < 1e-12) {
      continue;
    }
    tv.subVectors(origin, a);
    const u = tv.dot(pv) / det;
    if (u < 0 || u > 1) {
      continue;
    }
    qv.crossVectors(tv, e1);
    const v = dir.dot(qv) / det;
    if (v < 0 || u + v > 1) {
      continue;
    }
    const t = e2.dot(qv) / det;
    if (t > 0) {
      out.push(t);
    }
  }
  return out;
}
const xs = [-24, -20, -16, -12, -8, -4, 0, 4, 8, 12, 16, 20, 24];
const cell = (v: number | undefined): string => (v === undefined || !Number.isFinite(v) ? '    .' : v.toFixed(0).padStart(5));
console.log('front z of the skin (cm from the seat front, below 0 in front), rows: cm above the seat; columns: x cm');
console.log(`   y ${xs.map((x) => String(x).padStart(5)).join('')}`);
for (let y = 72; y >= -12; y -= 3) {
  const row = xs.map((x) => {
    const o = new Vector3(x / 100, seat.seatHeight + y / 100, seatFront - 1);
    const h = hits(o, new Vector3(0, 0, 1));
    return h.length ? (Math.min(...h) - 1) * 100 : undefined;
  });
  console.log(`${String(y).padStart(4)} ${xs.map((_, i) => cell(row[i])).join('')}`);
}
console.log('\ntop of the legs below 20 cm (cm above the seat) by a ray from 20 cm down, rows: z cm from the seat front; columns: x cm');
console.log(`   z ${xs.map((x) => String(x).padStart(5)).join('')}`);
for (let z = -27; z <= 9; z += 3) {
  const row = xs.map((x) => {
    const o = new Vector3(x / 100, seat.seatHeight + 0.2, seatFront + z / 100);
    const h = hits(o, new Vector3(0, -1, 0));
    return h.length ? (0.2 - Math.min(...h)) * 100 : undefined;
  });
  console.log(`${String(z).padStart(4)} ${xs.map((_, i) => cell(row[i])).join('')}`);
}
console.log('\ninner x of the knees (cm) by a ray from x 0 to each side, rows: cm above the seat, z cm from the seat front');
for (const y of [0, 3, 6, 9]) {
  for (const z of [-18, -15, -12, -9, -6, -3]) {
    const o = new Vector3(0, seat.seatHeight + y / 100, seatFront + z / 100);
    const l = hits(o, new Vector3(-1, 0, 0));
    const r = hits(o, new Vector3(1, 0, 0));
    console.log(`y ${y} z ${z}: L ${l.length ? (-Math.min(...l) * 100).toFixed(1) : '-'} R ${r.length ? (Math.min(...r) * 100).toFixed(1) : '-'}`);
  }
}
