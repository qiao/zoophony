import { sceneOf, NOT_STARTED, allAudible } from '../../../src/pose/test-scene.ts';
import { poseAt } from '../../../src/pose/pose-at.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { bowedRig, holdOf } from '../../../src/pose/bowed-rig.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
const demos = await patchedDemos();
const scene = sceneOf(demos.find((d) => d.file === 'mozart-k525.mid')!.bytes);
const index = scene.layout.players.findIndex((p) => p.cast.species === 'rabbit');
const model = scene.models.get('rabbit', 'violin', 4, 'chair');
const rig = bowedRig(model, 'violin', holdOf('rabbit', 'violin'));
console.log('restPivot', rig.restPivot.map((v) => v.toFixed(3)).join(' '), 'restBow grip', rig.restBow.grip.map((v) => v.toFixed(3)).join(' '), 'pivot bind', rig.pivot.map((v) => v.toFixed(3)).join(' '));
const pose = poseAt(scene.plan, -1, 10, NOT_STARTED, allAudible(scene.score)).players[index]!;
const posed = poseSkeleton(model, pose);
for (const b of ['hips', 'thighL', 'shinL', 'instrument', 'handL', 'handR', 'bow', 'upperArmR', 'forearmR']) {
  console.log(b, posed.frames[boneIndex(b as never)]!.position.toArray().map((v) => v.toFixed(3)).join(' '));
}
import { posedPart } from '../../../src/pose/test-clearance.ts';
import { Box3 } from 'three';
const part = posedPart(posed, ['instrument']);
const box = new Box3();
for (const t of part.triangles) box.expandByPoint(t.a).expandByPoint(t.b).expandByPoint(t.c);
console.log('violin box at rest', box.min.toArray().map((v) => v.toFixed(3)).join(' '), '..', box.max.toArray().map((v) => v.toFixed(3)).join(' '));
const head = posedPart(posed, ['head']);
const hb = new Box3();
for (const t of head.triangles) hb.expandByPoint(t.a).expandByPoint(t.b).expandByPoint(t.c);
console.log('head box at rest', hb.min.toArray().map((v) => v.toFixed(3)).join(' '), '..', hb.max.toArray().map((v) => v.toFixed(3)).join(' '));
