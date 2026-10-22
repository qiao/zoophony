// Prints where the corners of a bone go into the contrabass at some song times: the place in the
// frame of the contrabass (along the strings from the contact point, toward the top, and across).
// Usage: node docs/research/2026-10-21-hippo-bass/inbass.ts <bone> <song>,... [--set <changes>] [--demo <id>]
import { Quaternion, Vector3 } from 'three';
import { boneIndex } from '../../../src/models/rig.ts';
import type { BoneName } from '../../../src/models/rig.ts';
import { bowedRig, holdOf } from '../../../src/pose/bowed-rig.ts';
import { closedDepth } from '../../../src/pose/test-clearance.ts';
import { poseSkeleton, posedPoint } from '../../../src/pose/test-kinematics.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { posedCorner } from '../../../src/pose/test-skin.ts';
import { BASSIST_SWEEP, playSample } from '../../../src/pose/test-sweep-roles.ts';
import { scoreOf } from '../../../src/score/test-score.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
const args = process.argv.slice(2);
const opt = (n: string, d: string): string => { const i = args.indexOf(n); return i >= 0 ? (args[i + 1] ?? d) : d; };
const bone = args[0] as BoneName;
const songs = (args[1] ?? '0').split(',').map(Number);
const set = opt('--set', '');
if (set) setHolds(set);
const role = BASSIST_SWEEP;
const bass = role.obstacles.find((o) => o.name === 'contrabass')!;
const demo = (await patchedDemos()).find((d) => d.file.startsWith(opt('--demo', 'beethoven-1')))!;
const scene = sceneOf(demo.bytes);
const [player] = role.players(scene);
const model = player!.model;
const rig = bowedRig(model, 'contrabass', holdOf('hippo', 'contrabass'));
const b = boneIndex(bone);
const inst = boneIndex('instrument');
const corners: number[] = [];
for (let c = 0; c < model.mesh.bones.length; c++) if (model.mesh.bones[c] === b) corners.push(c);
for (const song of songs) {
  const sample = playSample(scene, song);
  const posed = poseSkeleton(model, player!.poseAt(sample));
  const surface = bass.surface(posed);
  const pts = corners.map((c) => new Vector3(...posedCorner(posed, c)));
  const f = posed.frames[inst]!;
  const inv = f.rotation.clone().invert();
  const toBind = (p: Vector3): Vector3 => p.clone().sub(f.position).applyQuaternion(inv).add(new Vector3(...rig.pivot));
  const c0 = new Vector3(...rig.contact), axis = new Vector3(...rig.axis), top = new Vector3(...rig.top);
  const across = new Vector3().crossVectors(top, axis);
  const out: string[] = [];
  let deepest = 0;
  for (const p of pts) {
    const d = closedDepth([p], surface).depth;
    if (d <= 0) continue;
    deepest = Math.max(deepest, d);
    const q = toBind(p).sub(c0);
    out.push(`${(d * 100).toFixed(1)}@[${q.dot(axis).toFixed(2)},${q.dot(top).toFixed(2)},${q.dot(across).toFixed(2)}]`);
  }
  out.sort((x, y) => parseFloat(y) - parseFloat(x));
  for (const j of ['upperArmR', 'forearmR', 'handR', 'upperArmL', 'forearmL', 'handL'] as const) {
    const q = toBind(new Vector3(...posedPoint(posed, j, model.skeleton.positions[boneIndex(j)] as [number, number, number]))).sub(c0);
    console.log(`  joint ${j}: [${q.dot(axis).toFixed(2)},${q.dot(top).toFixed(2)},${q.dot(across).toFixed(2)}]`);
  }
  console.log(`song ${song}: ${out.length} corners in, deepest ${(deepest * 100).toFixed(1)} cm (axis, top, across from the contact): ${out.slice(0, 6).join(' ')}`);
}
void Quaternion;
