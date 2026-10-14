// Measures two accepted limits of the rabbit violinist (a copy of
// docs/research/2026-10-13-studio-rabbit/limits-probe.ts): the depth of the rest bow in the
// trunk and in the arms (the test of `pose/bowed.test.ts`), and the largest turn of the bow paw
// and the bow in the lift of the Boulanger, Bach, and Beethoven 9 demos. Usage:
// node docs/research/2026-10-13-rabbit-mesh/limits-probe.ts ['violin@rabbit.<path>=<value>;...']
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
import {
  NOT_STARTED,
  PLAYING,
  demoSceneOf,
  firstPlayers,
  sceneOf,
} from '../../../src/pose/test-scene.ts';
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

const scene = sceneOf(FILE);
const [violin] = firstPlayers(scene, ['violin'] as const);
if (!violin) {
  throw new Error('no violin');
}
console.log(
  `species ${scene.layout.players[violin.index]?.cast.species}, studio ${Boolean(violin.model.studio)}`,
);
for (const wall of [0, 4]) {
  const posed = posedAt(scene, violin, 1, wall, NOT_STARTED);
  const points = bowEdgePoints(posed);
  const trunk = deepestIn(posed, ['hips', 'spine', 'chest', 'neck', 'head'], points);
  const arms = deepestIn(
    posed,
    ['upperArmL', 'forearmL', 'handL', 'upperArmR', 'forearmR'],
    points,
  );
  const legs = deepestIn(posed, ['thighL', 'thighR', 'shinL', 'shinR'], points);
  const h = violin.model.body.headHeight;
  console.log(
    `rest bow at wall ${wall}: trunk ${(trunk * 1000).toFixed(2)} mm, arms ${(arms * 1000).toFixed(2)} mm, legs ${(legs / h).toFixed(4)} H`,
  );
}

function turnBetween(a: Float32Array, b: Float32Array, bone: number): number {
  let dot = 0;
  for (let k = 0; k < 4; k++) {
    dot += (a[bone * 4 + k] ?? 0) * (b[bone * 4 + k] ?? 0);
  }
  return (2 * Math.acos(Math.min(1, Math.abs(dot))) * 180) / Math.PI;
}

for (const file of ['boulanger-matin.mid', 'bach-bwv1048.mid', 'beethoven-9.mid']) {
  const demo = await demoSceneOf(file);
  const bones = [boneIndex('handR'), boneIndex('bow')];
  const step = 0.001;
  const seen = new Set<string>();
  for (const [index, { cast }] of demo.layout.players.entries()) {
    const player = demo.plan.players[index];
    const label = `${cast.species} ${cast.instrument} ${cast.seatIndex}`;
    if (!player || cast.species !== 'rabbit' || cast.instrument !== 'violin' || seen.has(label)) {
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
    console.log(
      `${file} ${label}: bow paw turn ${worst.toFixed(0)}° a second at wall ${at.toFixed(3)} s`,
    );
  }
}
changes.undo();
