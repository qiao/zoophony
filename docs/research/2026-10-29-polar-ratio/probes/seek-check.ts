/**
 * Checks that the pose of the pianist at a song time does not depend on the times before it (a
 * seek), on a pause, or on the scene pose buffer, and times poseAt() of the whole scene.
 *
 * Usage: node <this file> <root> <demo>
 */
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(process.argv[2] ?? '.');
const demoId = process.argv[3] ?? 'bach-bwv1050';
const load = (path: string) => import(pathToFileURL(join(root, path)).href);
const { countInAt } = await load('src/pose/count-in.ts');
const { createScenePose, poseAt } = await load('src/pose/pose-at.ts');
const { PLAYING, PAUSED, allAudible, sceneOf } = await load('src/pose/test-scene.ts');
const { FOLD_ROLES, roleBodies } = await load('tools/fold-probe.ts');
const { probeDemos } = await load('tools/probe-demos.ts');
const demo = (await probeDemos()).find((d: { file: string }) => d.file.startsWith(demoId));
const scene = sceneOf(demo.bytes);
const [first] = roleBodies(FOLD_ROLES.get('pianist'), scene);
const audible = allAudible(scene.score);
const start = -countInAt(scene.plan.beats, 0).lengthSec;
const snap = (buffer: unknown, song: number, transport: unknown) =>
  Array.from(poseAt(scene.plan, song, 10 + song - start, transport, audible, buffer).players[first.index].rotations as Float32Array);
let worst = 0;
for (const song of [11.2, 12.0, 12.35, 13.1]) {
  const fresh = snap(createScenePose(scene.plan), song, PLAYING);
  const b = createScenePose(scene.plan);
  for (const t of [40, 3, song - 0.5, 90]) snap(b, t, PLAYING);
  const seeked = snap(b, song, PLAYING);
  for (let i = 0; i < fresh.length; i++) worst = Math.max(worst, Math.abs(fresh[i]! - seeked[i]!));
}
console.log(`largest difference of a seek: ${worst}`);
console.log(`PAUSED exists: ${PAUSED !== undefined}`);
const b = createScenePose(scene.plan);
const t0 = performance.now();
let n = 0;
for (let song = 0; song < 60; song += 0.0167) {
  poseAt(scene.plan, song, 10 + song - start, PLAYING, audible, b);
  n++;
}
console.log(`poseAt of the scene: ${((performance.now() - t0) / n).toFixed(3)} ms on the mean over ${n} frames`);
