/**
 * Rasterizes the posed studio body of a role into a face id image, with the camera of
 * `pnpm close-views play --at <species> --azimuth <a>` (elevation 20, zoom 1), at 1440 x 900.
 * Writes <out>.bin: Int32 face id of each pixel (-1 none), and <out>.json: the faces with pixels,
 * whether each faces the camera, and the posed and bind places of the vertices.
 * Usage: node scratch/id-raster.ts <role> <demo> <song time> <azimuth> <out>
 */
import { writeFileSync } from 'node:fs';
import { PerspectiveCamera, Vector3 } from 'three';

import { AIM_ELEVATION, PLAY_FRAME, aimPose, aimTarget, shotSubject } from '../tools/close-views.ts';
import { FOLD_ROLES, roleBodies } from '../tools/fold-probe.ts';
import { patchedDemo } from '../tools/patch-demos.ts';
import {
  createStudioPose,
  poseStudioBones,
  skinStudioMesh,
  studioOffsets,
} from '../src/models/studio-rig.ts';
import { countInAt } from '../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../src/pose/pose-at.ts';
import { PLAYING, allAudible, sceneOf } from '../src/pose/test-scene.ts';

const [roleName = 'violinist', demo = 'brahms-2', timeText = '678.63', azText = '120', out = 'scratch/id'] =
  process.argv.slice(2);
const time = Number(timeText);
const azimuth = Number(azText);
const source = FOLD_ROLES.get(roleName)!;
const scene = sceneOf((await patchedDemo(`${demo}.mid`)).bytes);
const [body] = roleBodies(source, scene);
const rig = body!.model.studio!;
const start = -countInAt(scene.plan.beats, 0).lengthSec;
const poses = poseAt(scene.plan, time, 10 + time - start, PLAYING, allAudible(scene.score), createScenePose(scene.plan));
const pose = poses.players[body!.index!]!;
const studio = poseStudioBones(rig, body!.model.skeleton, pose.rotations, studioOffsets(pose), 1, createStudioPose());
const posed = skinStudioMesh(rig.mesh, studio);
const target = await aimTarget(demo as never, shotSubject('rabbit'));
const aim = aimPose(target.place, target.box, { azimuth, elevation: AIM_ELEVATION, zoom: 1 });
const camera = new PerspectiveCamera(aim.fov, PLAY_FRAME.width / PLAY_FRAME.height, 0.05, 100);
camera.position.set(...aim.position);
camera.lookAt(...aim.target);
camera.updateMatrixWorld();
camera.updateProjectionMatrix();
const { facing, position } = target.place;
const cos = Math.cos(facing);
const sin = Math.sin(facing);
const n = posed.length / 3;
const W = PLAY_FRAME.width;
const H = PLAY_FRAME.height;
const sx = new Float64Array(n);
const sy = new Float64Array(n);
const sz = new Float64Array(n);
const world: number[][] = [];
const p = new Vector3();
for (let v = 0; v < n; v++) {
  const x = posed[v * 3]!;
  const y = posed[v * 3 + 1]!;
  const z = posed[v * 3 + 2]!;
  const w = [position[0] + x * cos + z * sin, position[1] + y, position[2] - x * sin + z * cos];
  world.push(w);
  p.set(w[0]!, w[1]!, w[2]!);
  const d = p.distanceTo(camera.position);
  p.project(camera);
  sx[v] = ((p.x + 1) / 2) * W + Number(process.env.DX ?? 0);
  sy[v] = ((1 - p.y) / 2) * H + Number(process.env.DY ?? -34);
  sz[v] = d;
}
const ids = new Int32Array(W * H).fill(-1);
const depth = new Float64Array(W * H).fill(Infinity);
const corners = rig.mesh.corners;
const faces = corners.length / 3;
const front = new Uint8Array(faces);
for (let f = 0; f < faces; f++) {
  const [a, b, c] = [corners[f * 3]!, corners[f * 3 + 1]!, corners[f * 3 + 2]!];
  const area = (sx[b]! - sx[a]!) * (sy[c]! - sy[a]!) - (sx[c]! - sx[a]!) * (sy[b]! - sy[a]!);
  // Screen y points down, so a counter-clockwise face of the world has a negative area here.
  front[f] = area < 0 ? 1 : 0;
  const x0 = Math.max(0, Math.floor(Math.min(sx[a]!, sx[b]!, sx[c]!)));
  const x1 = Math.min(W - 1, Math.ceil(Math.max(sx[a]!, sx[b]!, sx[c]!)));
  const y0 = Math.max(0, Math.floor(Math.min(sy[a]!, sy[b]!, sy[c]!)));
  const y1 = Math.min(H - 1, Math.ceil(Math.max(sy[a]!, sy[b]!, sy[c]!)));
  if (Math.abs(area) < 1e-9) continue;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const w0 = ((sx[b]! - px) * (sy[c]! - py) - (sx[c]! - px) * (sy[b]! - py)) / area;
      const w1 = ((sx[c]! - px) * (sy[a]! - py) - (sx[a]! - px) * (sy[c]! - py)) / area;
      const w2 = 1 - w0 - w1;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;
      const d = w0 * sz[a]! + w1 * sz[b]! + w2 * sz[c]!;
      const i = y * W + x;
      if (d < depth[i]!) {
        depth[i] = d;
        ids[i] = f;
      }
    }
  }
}
writeFileSync(`${out}.bin`, Buffer.from(ids.buffer));
const count = new Map<number, number>();
for (const id of ids) if (id >= 0) count.set(id, (count.get(id) ?? 0) + 1);
writeFileSync(
  `${out}.json`,
  JSON.stringify({
    width: W,
    height: H,
    front: Array.from(front),
    pixels: Object.fromEntries(count),
    screen: Array.from({ length: n }, (_, v) => [sx[v], sy[v]]),
    posed: Array.from(posed),
    bind: Array.from(rig.mesh.positions),
    corners: Array.from(corners),
    joints: Array.from(rig.mesh.joints),
    weights: Array.from(rig.mesh.weights),
    caps: rig.body.caps ?? [],
  }),
);
console.log(`${faces} faces, ${count.size} with pixels, camera ${aim.position.map((x) => x.toFixed(3))}`);
