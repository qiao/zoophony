/**
 * Measures the side motion of the polar bear pianist over a span of a demo: the x of the hips,
 * the chest, the head, and each paw (the bone frame positions of `poseSkeleton()`), in the axes
 * of the player, at steps of 0.01 s of the song time. It prints a summary for each part: the
 * range, the largest speed, and the count of the turns of direction for each second (a turn
 * counts when the motion goes at least 2 mm the other way). With `--csv <file>`, it writes each
 * sample.
 *
 * Usage, from the root of a tree: node <this file> <root> <demo> <from s> <to s> [--csv <file>]
 */
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(process.argv[2] ?? '.');
const demoId = process.argv[3] ?? 'bach-bwv1050';
const from = Number(process.argv[4] ?? 10);
const to = Number(process.argv[5] ?? 14);
const csvAt = process.argv.indexOf('--csv');
const csv = csvAt > 0 ? process.argv[csvAt + 1] : undefined;
const load = (path: string) => import(pathToFileURL(join(root, path)).href);
const { boneIndex } = await load('src/models/rig.ts');
const { countInAt } = await load('src/pose/count-in.ts');
const { createScenePose, poseAt } = await load('src/pose/pose-at.ts');
const { poseSkeleton } = await load('src/pose/test-kinematics.ts');
const { PLAYING, allAudible, sceneOf } = await load('src/pose/test-scene.ts');
const { FOLD_ROLES, roleBodies } = await load('tools/fold-probe.ts');
const { probeDemos } = await load('tools/probe-demos.ts');

const PARTS = ['hips', 'chest', 'head', 'handL', 'handR'] as const;
const demo = (await probeDemos()).find((d: { file: string }) => d.file.startsWith(demoId));
const scene = sceneOf(demo.bytes);
const [first] = roleBodies(FOLD_ROLES.get('pianist'), scene);
const { index, model } = first;
const buffer = createScenePose(scene.plan);
const audible = allAudible(scene.score);
const start = -countInAt(scene.plan.beats, 0).lengthSec;
const rows: number[][] = [];
for (let k = 0; from + k * 0.01 <= to + 1e-9; k++) {
  const song = from + k * 0.01;
  const pose = poseAt(scene.plan, song, 10 + song - start, PLAYING, audible, buffer).players[index];
  const posed = poseSkeleton(model, pose);
  rows.push([song, ...PARTS.map((b) => posed.frames[boneIndex(b)].position.x)]);
}
if (csv) {
  writeFileSync(csv, ['song,' + PARTS.join(','), ...rows.map((r) => r.map((v) => v.toFixed(5)).join(','))].join('\n'));
}
console.log(`${demo.file} ${from} s to ${to} s, ${rows.length} samples at 0.01 s, x in the axes of the player`);
console.log('| Part | Range cm | Largest speed cm/s | Turns for each s |');
console.log('|---|---|---|---|');
PARTS.forEach((name, p) => {
  const xs = rows.map((r) => r[p + 1]!);
  let fast = 0;
  for (let k = 1; k < xs.length; k++) fast = Math.max(fast, Math.abs(xs[k]! - xs[k - 1]!) / 0.01);
  let turns = 0;
  let dir = 0;
  let anchor = xs[0]!;
  for (const x of xs) {
    const d = x - anchor;
    if (dir >= 0 && d < -0.002) {
      if (dir > 0) turns++;
      dir = -1;
      anchor = x;
    } else if (dir <= 0 && d > 0.002) {
      if (dir < 0) turns++;
      dir = 1;
      anchor = x;
    } else if ((dir > 0 && x > anchor) || (dir < 0 && x < anchor)) {
      anchor = x;
    }
  }
  const range = Math.max(...xs) - Math.min(...xs);
  console.log(
    `| ${name} | ${(range * 100).toFixed(1)} | ${(fast * 100).toFixed(1)} | ${(turns / (to - from)).toFixed(2)} |`,
  );
});
