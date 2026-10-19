/**
 * Prints the note-target errors of the mallets of the timpani player of each demo with timpani:
 * the distance from the head of each mallet to the target of its strike at the note start, the
 * share of the strikes within 5 mm, and the worst error of each hand. It reads no role of the
 * sweep, so it runs on a tree before the role. Usage, from the root of a tree:
 *
 *     node docs/research/2026-10-19-elephant-mesh/mallet-reach.ts
 */
import { Vector3 } from 'three';

import { patchedDemos } from '../../../tools/patch-demos.ts';
import { allAudible, PLAYING } from '../../../src/pose/test-scene.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { poseSkeleton, posedPiecePoint } from '../../../src/pose/test-kinematics.ts';

for (const demo of await patchedDemos()) {
  const scene = sceneOf(demo.bytes);
  const index = scene.layout.players.findIndex((p) => p.cast.instrument === 'timpani');
  const plan = scene.plan.players[index];
  const place = scene.layout.players[index];
  if (!plan || !place || plan.note.family !== 'percussion') {
    continue;
  }
  const { species, instrument, kettles, support } = place.cast;
  const model = scene.models.get(species, instrument, kettles, support);
  const buffer = createScenePose(scene.plan);
  const audible = allAudible(scene.score);
  const countIn = countInAt(scene.plan.beats, 0).lengthSec;
  const text: string[] = [];
  for (const side of ['L', 'R'] as const) {
    const track = side === 'L' ? plan.note.left : plan.note.right;
    const bone = side === 'L' ? 'malletL' : 'malletR';
    const head = model.instrument.targets.find((t) => t.kind === 'mallet-head' && t.bone === bone);
    if (!track || !head) {
      continue;
    }
    let near = 0;
    let worst = 0;
    for (const [i, start] of track.starts.entries()) {
      const song = start + plan.timeOffset;
      const pose = poseAt(scene.plan, song, 10 + song + countIn, PLAYING, audible, buffer).players[index];
      if (!pose) {
        continue;
      }
      const posed = poseSkeleton(model, pose);
      const point = new Vector3(track.points[3 * i], track.points[3 * i + 1], track.points[3 * i + 2]);
      const error = new Vector3(...posedPiecePoint(posed, { bone, at: head.from })).distanceTo(point);
      near += error <= 0.005 ? 1 : 0;
      worst = Math.max(worst, error);
    }
    text.push(`${side} ${near}/${track.starts.length} within 5 mm, worst ${(worst * 100).toFixed(1)} cm`);
  }
  console.log(`${demo.file.replace(/\.mid$/, '')} (${species}, ${kettles} kettles): ${text.join('; ')}`);
}
