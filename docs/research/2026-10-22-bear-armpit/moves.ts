/** Prints the worst move twist of each arm of the conductor in one demo, and a hash of the poses. */
import { writeFileSync } from "node:fs";

import { probeMoves } from '../tools/arm-check.ts';
import { FOLD_ROLES, roleBodies } from '../tools/fold-probe.ts';
import { patchedDemo } from '../tools/patch-demos.ts';
import { createScenePose, poseAt } from '../src/pose/pose-at.ts';
import { PLAYING, allAudible, sceneOf } from '../src/pose/test-scene.ts';

const role = FOLD_ROLES.get('conductor')!;
const demo = await patchedDemo('mozart-k191.mid');
const s = probeMoves(role, [demo]);
for (const side of ['L', 'R'] as const) {
  const v = s.values[side].moveTwist;
  let k = 0;
  for (let i = 1; i < v.length; i++) if (v[i]! > v[k]!) k = i;
  console.log(side, v[k]!.toFixed(2), s.labels[k]);
}
const scene = sceneOf(demo.bytes);
const [body] = roleBodies(role, scene);
void body;
const frame = poseAt(scene.plan, 74.83, 10.13, { ...PLAYING, changedAtWall: 10, startSec: 74.83 }, allAudible(scene.score), createScenePose(scene.plan));
writeFileSync(process.env.OUT ?? 'scratch/rot.json', JSON.stringify(Array.from(frame.conductor!.rotations as unknown as ArrayLike<number>)));
