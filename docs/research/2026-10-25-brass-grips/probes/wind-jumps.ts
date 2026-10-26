// Counts the turns of each paw of a wind player over 30 degrees in one step of 0.01 s of song
// time, over the whole play of a demo, with the wall time far after the start (no lift).
// Usage, from the root of the tree: [SET=<changes>] node docs/research/2026-10-25-brass-grips/probes/wind-jumps.ts <demo prefix> <species> <instrument>
import { Quaternion } from 'three';

import { setHolds } from '../../../../tools/hold-sets.ts';
import { probeDemos } from '../../../../tools/probe-demos.ts';
import { boneIndex } from '../../../../src/models/rig.ts';
import { poseSkeleton } from '../../../../src/pose/test-kinematics.ts';
import { createScenePose, poseAt } from '../../../../src/pose/pose-at.ts';
import { allAudible, sceneOf } from '../../../../src/pose/test-scene.ts';

if (process.env.SET) {
  setHolds(process.env.SET);
}
const [demoName, species, instrument] = process.argv.slice(2);
const demo = (await probeDemos()).find((d) => d.file.startsWith(demoName ?? ''));
if (!demo) {
  throw new Error('no demo');
}
const scene = sceneOf(demo.bytes);
const index = scene.layout.players.findIndex(
  (p) => p.cast.species === species && p.cast.instrument === instrument,
);
const place = scene.layout.players[index];
if (!place) {
  throw new Error('no player');
}
const model = scene.models.get(
  place.cast.species,
  place.cast.instrument,
  place.cast.kettles,
  place.cast.support,
);
const buffer = createScenePose(scene.plan);
const audible = allAudible(scene.score);
const end = scene.score.durationSec;
const step = 0.01;
for (const side of ['L', 'R'] as const) {
  let last: Quaternion | null = null;
  let jumps = 0;
  let worst = 0;
  let worstAt = 0;
  let steps = 0;
  for (let t = 0; t <= end; t += step) {
    const pose = poseAt(
      scene.plan,
      t,
      t + 100,
      { playing: true, changedAtWall: 0, previous: null },
      audible,
      buffer,
    ).players[index];
    if (!pose) {
      continue;
    }
    const posed = poseSkeleton(model, pose);
    const hand = posed.frames[boneIndex(`hand${side}`)];
    if (!hand) {
      continue;
    }
    const q = hand.rotation.clone();
    if (last) {
      const angle = (2 * Math.acos(Math.min(1, Math.abs(last.dot(q)))) * 180) / Math.PI;
      if (angle > 30) {
        jumps++;
      }
      if (angle > worst) {
        worst = angle;
        worstAt = t;
      }
    }
    last = q;
    steps++;
  }
  console.log(
    `${demo.file} ${species} ${instrument} ${side}: ${steps} steps of ${step} s, turns over 30 deg in one step ${jumps}, largest step ${worst.toFixed(1)} deg at ${worstAt.toFixed(2)} s`,
  );
}
