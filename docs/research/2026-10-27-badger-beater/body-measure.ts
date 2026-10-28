// Prints the bind joints of the badger bass drummer, the front and side profile of its trunk, and
// its head top.
// Usage: node docs/research/2026-10-27-badger-beater/body-measure.ts
import { Vector3 } from 'three';
import { percussionTestFile } from '../../../tools/probe-demos.ts';
import { boneIndex, BONE_NAMES } from '../../../src/models/rig.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { armRig } from '../../../src/pose/ik.ts';

const scene = sceneOf(percussionTestFile());
const index = scene.layout.players.findIndex((p) => p.cast.species === 'badger' && p.cast.instrument === 'bass-drum');
const place = scene.layout.players[index]!;
const model = scene.models.get('badger', 'bass-drum', place.cast.kettles, place.cast.support);
const cm = (v: number): string => (100 * v).toFixed(1);
const p = model.skeleton.positions;
for (const b of ['hips', 'spine', 'chest', 'neck', 'head', 'shoulderR', 'upperArmR', 'forearmR', 'handR', 'fingersR', 'thighR', 'footR'] as const) {
  console.log(b, p[boneIndex(b)]?.map(cm).join(', '));
}
const arm = armRig(model, 'R');
console.log('armRig R', JSON.stringify(arm.bind, (k, v) => (typeof v === 'number' ? Number((100 * v).toFixed(1)) : v)));
const { positions, bones } = model.mesh;
const trunk = new Set(['hips', 'spine', 'chest', 'neck'].map((b) => boneIndex(b as never)));
const rows: string[] = [];
for (let y = 0.1; y <= 0.95; y += 0.05) {
  let front = Infinity;
  let side = -Infinity;
  let back = -Infinity;
  for (let v = 0; v < positions.length / 3; v++) {
    const vy = positions[3 * v + 1] ?? 0;
    if (Math.abs(vy - y) > 0.025) continue;
    if (!trunk.has(bones[v] ?? -1)) continue;
    const vx = positions[3 * v] ?? 0;
    const vz = positions[3 * v + 2] ?? 0;
    front = Math.min(front, vz);
    back = Math.max(back, vz);
    side = Math.max(side, Math.abs(vx));
  }
  rows.push(`y ${cm(y)}: front z ${cm(front)}, back z ${cm(back)}, half width ${cm(side)}`);
}
console.log(rows.join('\n'));
console.log('mesh bones count', BONE_NAMES.length, 'vertices', positions.length / 3);
let skull = 0;
let ear = 0;
for (let v = 0; v < positions.length / 3; v++) {
  const vx = positions[3 * v] ?? 0;
  const vy = positions[3 * v + 1] ?? 0;
  if (Math.abs(vx) < 0.03) skull = Math.max(skull, vy);
  ear = Math.max(ear, vy);
}
console.log(`skull top on the middle line ${cm(skull)} cm, highest point ${cm(ear)} cm, H ${cm(model.body.headHeight)}`);
