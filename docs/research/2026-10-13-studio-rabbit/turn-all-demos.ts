// Measures the largest turn of the bow paw and of the bow of each violinist of each demo in the
// lift, at a step of 1 ms, with the song held at 0. A copy of `limits-probe.ts` from the review of
// round 4, with a loop over the demos. It keeps the unused helpers of `limits-probe.ts`.
// Usage: node docs/research/2026-10-13-studio-rabbit/turn-all-demos.ts
import { Vector3 } from 'three';
import { note, programChange, tempo, timeSignature, track } from '../../../src/midi/test-smf.ts';
import type { TestFile } from '../../../src/midi/test-smf.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import type { BoneName } from '../../../src/models/rig.ts';
import type { PosePlan } from '../../../src/pose/plan.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { posedPart, signedDistance } from '../../../src/pose/test-clearance.ts';
import { posedAt } from '../../../src/pose/test-kinematics.ts';
import type { PosedSkeleton } from '../../../src/pose/test-kinematics.ts';
import { NOT_STARTED, PLAYING, demoSceneOf, firstPlayers, sceneOf } from '../../../src/pose/test-scene.ts';
import { setHolds } from '../../../tools/hold-sets.ts';

const changes = setHolds(process.argv[2] ?? '');
console.log(`set: ${changes.text || 'none'}`);

function section(channel: number, program: number, keys: readonly number[]) {
  return track(
    [programChange(0, channel, program)],
    ...keys.map((key, i) => note(i * 480, channel, key)),
    [programChange(3840, channel, 45)],
    ...keys.map((key, i) => note(3840 + i * 480, channel, key)),
  );
}

const FILE: TestFile = {
  tracks: [
    [tempo(0, 120), timeSignature(0, 4, 4)],
    section(0, 40, [55, 62, 69, 76, 88, 60, 79, 57]),
    section(1, 41, [48, 55, 62, 69, 81, 52, 72, 50]),
    section(2, 42, [36, 43, 50, 57, 69, 40, 64, 38]),
    section(3, 43, [28, 33, 38, 43, 55, 31, 50, 29]),
    section(4, 40, [55, 62, 69, 76, 88, 60, 79, 57]),
  ],
};

function bowEdgePoints(posed: PosedSkeleton): Vector3[] {
  const points: Vector3[] = [];
  for (const t of posedPart(posed, ['bow']).triangles) {
    for (const [from, to] of [
      [t.a, t.b],
      [t.b, t.c],
      [t.c, t.a],
    ] as const) {
      const steps = Math.max(1, Math.ceil(from.distanceTo(to) / 0.005));
      for (let i = 0; i < steps; i++) {
        points.push(new Vector3().lerpVectors(from, to, i / steps));
      }
    }
  }
  return points;
}

function deepestIn(posed: PosedSkeleton, bones: readonly BoneName[], points: readonly Vector3[]) {
  const part = posedPart(posed, bones);
  let deepest = 0;
  for (const point of points) {
    if (part.box.containsPoint(point)) {
      deepest = Math.max(deepest, -signedDistance(part, point));
    }
  }
  return deepest;
}

function turnBetween(a: Float32Array, b: Float32Array, bone: number): number {
  let dot = 0;
  for (let k = 0; k < 4; k++) {
    dot += (a[bone * 4 + k] ?? 0) * (b[bone * 4 + k] ?? 0);
  }
  return (2 * Math.acos(Math.min(1, Math.abs(dot))) * 180) / Math.PI;
}

for (const file of ['bach-bwv1048.mid','beethoven-8.mid','beethoven-9.mid','boulanger-matin.mid','mozart-k315.mid','mozart-k525.mid']) {
const demo = await demoSceneOf(file);
console.log(file);
const bones = [boneIndex('handR'), boneIndex('bow')];
const step = 0.001;
const seen = new Set<string>();
for (const [index, { cast }] of demo.layout.players.entries()) {
  const player = demo.plan.players[index];
  const label = `${cast.species} ${cast.instrument} ${cast.seatIndex}`;
  if (!player || cast.instrument !== 'violin' || seen.has(label)) {
    continue;
  }
  seen.add(label);
  const one: PosePlan = { ...demo.plan, players: [player] };
  let last = createScenePose(one);
  let next = createScenePose(one);
  poseAt(one, 0, 0, PLAYING, [], last);
  let worst = 0;
  let at = 0;
  for (let wall = step; wall < 2.5; wall += step) {
    poseAt(one, 0, wall, PLAYING, [], next);
    const a = last.players[0]?.rotations ?? new Float32Array(0);
    const b = next.players[0]?.rotations ?? new Float32Array(0);
    for (const bone of bones) {
      const turn = turnBetween(a, b, bone) / step;
      if (turn > worst) {
        worst = turn;
        at = wall;
      }
    }
    [last, next] = [next, last];
  }
  console.log(`${label}: bow paw turn ${worst.toFixed(0)}° a second at wall ${at.toFixed(3)} s`);
}
}
changes.undo();
