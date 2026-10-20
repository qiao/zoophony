/**
 * Measures the seated tail of the wolf clarinetist against its chair and the floor: the lowest
 * point of the tail, and the smallest gap from a tail vertex to each part of the chair (the seat,
 * the two back posts, and the top rail), with a negative gap for a vertex inside a part. It takes
 * the rest pose before the first play over one sway period (wall 10 s to 15.5 s at steps of
 * 0.25 s), and the play at each 1 s of the demo. The chair boxes follow `buildChair()` of
 * `src/models/props.ts` in the model axes (the back at +z). Usage:
 *
 *     node docs/research/2026-10-20-wolf-mesh/tail-gap.ts [demo]
 */
import { Vector3 } from 'three';

import { CHAIR, CHAIR_LEG, chairBack, seatHeights } from '../../../src/models/props.ts';
import { SPECIES } from '../../../src/models/species.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { posedPart } from '../../../src/pose/test-clearance.ts';
import { NOT_STARTED, PLAYING, allAudible, sceneOf } from '../../../src/pose/test-scene.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';

interface Box {
  readonly name: string;
  readonly min: Vector3;
  readonly max: Vector3;
}

const want = process.argv[2] ?? 'boulanger-matin';
const demo = (await patchedDemos()).find((d) => d.file.startsWith(want));
if (!demo) {
  throw new Error(`No demo ${want}.`);
}
const scene = sceneOf(demo.bytes);
const index = scene.layout.players.findIndex(
  (p) => p.cast.species === 'wolf' && p.cast.support === 'chair',
);
const place = scene.layout.players[index];
if (!place) {
  throw new Error('No seated wolf.');
}
const { species, instrument, kettles, support } = place.cast;
const model = scene.models.get(species, instrument, kettles, support);
const seat = seatHeights('chair', SPECIES.wolf);
if (!seat) {
  throw new Error('No seat.');
}
const depth = seat.seatDepth ?? CHAIR.seatDepth;
const width = seat.seatWidth ?? CHAIR.seatWidth;
const center = (CHAIR.seatDepth - depth) / 2;
const boxes: Box[] = [
  {
    name: 'seat',
    min: new Vector3(-width / 2, seat.seatHeight - 0.04, center - depth / 2),
    max: new Vector3(width / 2, seat.seatHeight, center + depth / 2),
  },
  ...chairBack(seat.seatHeight, width).map((b, k) => ({
    name: ['left post', 'right post', 'top rail'][k] ?? `back ${k}`,
    min: new Vector3(...b.min),
    max: new Vector3(...b.max),
  })),
];
const gap = (p: Vector3, b: Box): number => {
  const d = new Vector3(
    Math.max(b.min.x - p.x, 0, p.x - b.max.x),
    Math.max(b.min.y - p.y, 0, p.y - b.max.y),
    Math.max(b.min.z - p.z, 0, p.z - b.max.z),
  );
  const outside = d.length();
  if (outside > 0) {
    return outside;
  }
  return -Math.min(
    p.x - b.min.x,
    b.max.x - p.x,
    p.y - b.min.y,
    b.max.y - p.y,
    p.z - b.min.z,
    b.max.z - p.z,
  );
};
const buffer = createScenePose(scene.plan);
const audible = allAudible(scene.score);
const countIn = countInAt(scene.plan.beats, 0).lengthSec;
const worst = new Map<string, { gap: number; at: string; p: Vector3 }>();
let lowest = { y: Infinity, at: '' };
const sample = (song: number, wall: number, label: string, playing: boolean): void => {
  const pose = poseAt(scene.plan, song, wall, playing ? PLAYING : NOT_STARTED, audible, buffer)
    .players[index];
  if (!pose) {
    return;
  }
  const part = posedPart(poseSkeleton(model, pose), ['tail1', 'tail2']);
  for (const t of part.triangles) {
    for (const p of [t.a, t.b, t.c]) {
      if (p.y < lowest.y) {
        lowest = { y: p.y, at: label };
      }
      for (const b of boxes) {
        const g = gap(p, b);
        const old = worst.get(b.name);
        if (!old || g < old.gap) {
          worst.set(b.name, { gap: g, at: label, p: p.clone() });
        }
      }
    }
  }
};
for (let wall = 10; wall <= 15.5; wall += 0.25) {
  sample(-countIn, wall, `rest, wall ${wall.toFixed(2)} s`, false);
}
for (let song = 0; song <= scene.score.durationSec; song += 1) {
  sample(song, 10 + song + countIn, `play, song ${song.toFixed(0)} s`, true);
}
console.log(`${demo.file}, wolf ${index}, seat ${seat.seatHeight.toFixed(3)} m, chair ${depth.toFixed(3)} m deep, ${width.toFixed(3)} m wide (leg ${CHAIR_LEG} m)`);
console.log(`lowest point of the tail: ${(lowest.y * 100).toFixed(1)} cm above the floor (${lowest.at})`);
for (const [name, w] of worst) {
  console.log(`smallest gap to the ${name}: ${(w.gap * 100).toFixed(1)} cm (${w.at}), at ${w.p.toArray().map((x) => x.toFixed(3)).join(", ")} m`);
}
