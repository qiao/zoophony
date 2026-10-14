/**
 * Finds the deepest corners of the left upper arm of the seated rabbit violinist in its closed
 * body in the rest pose of the Boulanger demo, as the sweep measures them, with their places in
 * the bind pose of the player. Usage:
 *
 *     node docs/research/2026-10-13-rabbit-mesh/deep-probe.ts
 */
import { Vector3 } from 'three';
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
const d = closedDepth(points, surface);
const c = corners[d.index]!;
console.log(
  'deepest',
  (d.depth * 100).toFixed(2),
  'cm corner',
  c,
  'posed',
  points[d.index]!.toArray().map((x) => x.toFixed(3)),
  'bind',
  [0, 1, 2].map((k) => model.mesh.positions[c * 3 + k]!.toFixed(3)),
);
// All corners deeper than 1.5 cm.
let n = 0;
for (const [i, p] of points.entries()) {
  const dd = closedDepth([p], surface);
  if (dd.depth > 0.015) {
    n++;
    if (n < 12)
      console.log(
        '  corner',
        corners[i],
        (dd.depth * 100).toFixed(2),
        'bind',
        [0, 1, 2].map((k) => model.mesh.positions[corners[i]! * 3 + k]!.toFixed(3)).join(','),
      );
  }
}
console.log('corners over 1.5 cm:', n);
