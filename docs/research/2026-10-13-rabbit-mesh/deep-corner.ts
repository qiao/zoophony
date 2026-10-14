/**
 * Finds the deepest corner of the left upper arm of the seated rabbit violinist in its closed
 * body in the rest pose of the Boulanger demo, as the sweep measures it (the review of
 * 2026-10-14). It prints the depth to the closed body, the distance to the nearest triangle of
 * the body and to the nearest cap, and the skin of the corner. Usage:
 *
 *     node docs/research/2026-10-13-rabbit-mesh/deep-corner.ts
 */
import { Triangle, Vector3 } from 'three';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { closedPart, closedDepth } from '../../../src/pose/test-clearance.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { posedCorner } from '../../../src/pose/test-skin.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { NOT_STARTED, allAudible, sceneOf } from '../../../src/pose/test-scene.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
const BODY = [
  'hips',
  'spine',
  'chest',
  'neck',
  'head',
  'jaw',
  'eyeL',
  'eyeR',
  'earL',
  'earR',
  'tail1',
  'tail2',
  'shoulderL',
  'shoulderR',
  'thighL',
  'thighR',
  'shinL',
  'shinR',
  'footL',
  'footR',
] as const;
const demo = (await patchedDemos()).find((d) => d.file.startsWith('boulanger'))!;
const scene = sceneOf(demo.bytes);
const index = scene.layout.players.findIndex(
  (p) => p.cast.species === 'rabbit' && p.cast.instrument === 'violin',
);
const { species, instrument, kettles, support } = scene.layout.players[index]!.cast;
const model = scene.models.get(species, instrument, kettles, support);
const start = -countInAt(scene.plan.beats, 0).lengthSec;
const pose = poseAt(
  scene.plan,
  start,
  10,
  NOT_STARTED,
  allAudible(scene.score),
  createScenePose(scene.plan),
).players[index]!;
const posed = poseSkeleton(model, pose);
const surface = closedPart(posed, BODY, 6);
const bone = boneIndex('upperArmL');
const corners: number[] = [];
for (let c = 0; c < model.mesh.bones.length; c++)
  if (model.mesh.bones[c - (c % 3)] === bone) corners.push(c);
const points = corners.map((c) => new Vector3(...posedCorner(posed, c)));
const deepest = closedDepth(points, surface);
const corner = corners[deepest.index]!;
const point = points[deepest.index]!;
const wanted = new Set(BODY.map((b) => boneIndex(b)));
let partCount = 0;
for (let t = 0; t < model.mesh.bones.length / 3; t++) {
  if (wanted.has(model.mesh.bones[t * 3]!)) partCount++;
}
const triangle = new Triangle();
const near = new Vector3();
let nearPart = Infinity;
let nearCap = Infinity;
for (const [i, t] of surface.triangles.entries()) {
  triangle.set(t.a, t.b, t.c);
  triangle.closestPointToPoint(point, near);
  const distance = near.distanceTo(point);
  if (i < partCount) nearPart = Math.min(nearPart, distance);
  else nearCap = Math.min(nearCap, distance);
}
const studio = model.studio!;
const vertex = studio.mesh.corners[corner]!;
const skin = [0, 1, 2, 3]
  .filter((j) => studio.mesh.weights[vertex * 4 + j]! > 0)
  .map((j) => `${STUDIO_BONES[studio.mesh.joints[vertex * 4 + j]!]}:${studio.mesh.weights[vertex * 4 + j]!.toFixed(2)}`);
console.log(`deepest corner ${corner}: ${(deepest.depth * 100).toFixed(2)} cm in the closed body`);
console.log(`nearest triangle of the body ${(nearPart * 100).toFixed(2)} cm, nearest cap ${(nearCap * 100).toFixed(2)} cm`);
console.log(`bind place ${[0, 1, 2].map((k) => model.mesh.positions[corner * 3 + k]!.toFixed(3)).join(', ')} m`);
console.log(`skin ${skin.join(' ')}`);
