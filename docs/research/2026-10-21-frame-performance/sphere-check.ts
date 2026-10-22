/**
 * Checks the fitted spheres of the player meshes (`fitPoseSphere()` of `scene/bounds.ts`, the
 * report `2026-10-21-frame-performance.md`): for each player of a demo at many song times, the
 * probe skins each vertex on the CPU with three.js (`SkinnedMesh.getVertexPosition()`, with the
 * morph targets), and prints the largest distance of a vertex outside its sphere. It must be at
 * most 0. Run from the repository root:
 * `node docs/research/2026-10-21-frame-performance/sphere-check.ts [<demo file>] [<times>]`.
 *
 * The default demo is `perf-60.mid` (the 60 players of the frame target). The times are song
 * times in seconds, separated by commas.
 */
import { readFile } from 'node:fs/promises';

import { Sphere, Vector3 } from 'three';

import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { PLAYING, allAudible, sceneOf } from '../../../src/pose/test-scene.ts';
import { boneSpheres, fitPoseSphere } from '../../../src/scene/bounds.ts';
import { createMaterials } from '../../../src/scene/geometry.ts';
import { applyScenePose, createPlayers, holdSkeletons } from '../../../src/scene/player.ts';
import { playerSpots } from '../../../src/scene/stage-scene.ts';

const [file = 'perf/perf-60.mid', timesArg = '0,2,5,9,13,17,21,25,29,33,37,41,45,49,53,57'] =
  process.argv.slice(2);
const scene = sceneOf(new Uint8Array(await readFile(file)));
const meshes = createPlayers(playerSpots(scene.layout), createMaterials(), scene.models);
const spheres = new Map(
  meshes.map((mesh) => [mesh, boneSpheres(mesh.geometry, mesh.skeleton.bones.length)]),
);
const culled = meshes.filter((mesh) => spheres.get(mesh));
console.log(`${meshes.length} meshes, ${culled.length} with bone spheres.`);

const buffer = createScenePose(scene.plan);
const audible = allAudible(scene.score);
const vertex = new Vector3();
const sphere = new Sphere();
let worst = -Infinity;
let checked = 0;
for (const time of timesArg.split(',').map(Number)) {
  const pose = poseAt(scene.plan, time, time, PLAYING, audible, buffer);
  applyScenePose(meshes, pose);
  for (const mesh of meshes) {
    mesh.updateMatrixWorld(true);
  }
  holdSkeletons(meshes);
  for (const mesh of culled) {
    const bones = spheres.get(mesh);
    if (!bones) {
      continue;
    }
    fitPoseSphere(mesh, bones, sphere);
    const count = mesh.geometry.getAttribute('position').count;
    for (let v = 0; v < count; v++) {
      mesh.getVertexPosition(v, vertex);
      const outside = vertex.distanceTo(sphere.center) - sphere.radius;
      worst = Math.max(worst, outside);
      checked += 1;
    }
  }
}
console.log(`${checked} skinned vertices. The largest distance outside a sphere: ${worst} m.`);
