/**
 * Prints the hanging paws of the elephant timpanist in the rest pose, and each kettle of the
 * model: its center, its angle from the front, and the distance of the paw from its axis.
 * Usage: node docs/research/2026-10-19-elephant-pose/rest-paw.ts [--set <changes>]
 */
import { Vector3 } from 'three';

import { setHolds } from '../../../tools/hold-sets.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { allAudible, NOT_STARTED, sceneOf } from '../../../src/pose/test-scene.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { poseSkeleton, posedPoint } from '../../../src/pose/test-kinematics.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { placePoint } from '../../../src/models/instruments/hold.ts';
import { kettleHeadRadius } from '../../../src/models/instruments/percussion.ts';

const i = process.argv.indexOf('--set');
const changes = i > 0 ? setHolds(process.argv[i + 1] ?? '') : null;
for (const demo of await patchedDemos()) {
  const scene = sceneOf(demo.bytes);
  const index = scene.layout.players.findIndex((p) => p.cast.instrument === 'timpani');
  if (index < 0) continue;
  const place = scene.layout.players[index]!;
  const { species, instrument, kettles, support } = place.cast;
  const model = scene.models.get(species, instrument, kettles, support);
  const pose = poseAt(scene.plan, 0, 0, NOT_STARTED, allAudible(scene.score), createScenePose(scene.plan)).players[index]!;
  const posed = poseSkeleton(model, pose);
  const heads = model.instrument.targets.filter((t) => t.kind === 'head');
  const text: string[] = [];
  for (const side of ['L', 'R'] as const) {
    const palm = new Vector3(...posedPoint(posed, `hand${side}`, side === 'L' ? model.body.palmL : model.body.palmR));
    const wrist = posed.frames[boneIndex(`hand${side}`)]!.position;
    text.push(`${side} palm ${palm.toArray().map((x) => x.toFixed(2))} wrist ${wrist.toArray().map((x) => x.toFixed(2))}`);
    for (const [k, t] of heads.entries()) {
      const c = placePoint(model.pieces, { bone: t.bone, at: t.from });
      const d = Math.hypot(palm.x - c[0], palm.z - c[2]) - kettleHeadRadius(k);
      if (d < 0.1) text.push(`  near kettle ${k}: ${(d * 100).toFixed(1)} cm outside the hoop radius, palm ${(palm.y - c[1]).toFixed(2)} m from the head plane`);
    }
  }
  const angles = heads.map((t, k) => {
    const c = placePoint(model.pieces, { bone: t.bone, at: t.from });
    return `k${k} ${((Math.atan2(c[0], -c[2]) * 180) / Math.PI).toFixed(0)}° at ${Math.hypot(c[0], c[2]).toFixed(2)} m`;
  });
  console.log(`${demo.file}: ${kettles} kettles: ${angles.join(', ')}`);
  for (const line of text) console.log(`  ${line}`);
}
changes?.undo();
