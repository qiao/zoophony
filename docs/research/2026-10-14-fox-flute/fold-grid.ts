// Counts the folded faces of the tan fox flutist in the rest pose with the flute in its playing
// turn, moved by a grid of rest shifts, to find the places of the flute that fold the shoulders.
import { patchedDemo } from '../../../tools/patch-demos.ts';
import { foldedFaces, mainBone } from '../../../tools/fold-probe.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { sceneOf, allAudible, NOT_STARTED } from '../../../src/pose/test-scene.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { createStudioPose, poseStudioBones, skinStudioMesh, studioOffsets } from '../../../src/models/studio-rig.ts';
import { SPECIES_WIND_HOLDS } from '../../../src/pose/winds.ts';

const hold = SPECIES_WIND_HOLDS['fox-tan']?.flute;
if (!hold) throw new Error('no hold');
const play = hold.play.join(',');
const extra = process.argv[2] ?? '';
const { bytes } = await patchedDemo('beethoven-8.mid');
for (const x of (process.env.XS ?? "-0.3,0,0.3").split(",").map(Number)) for (const y of (process.env.YS ?? "-0.9,-0.5,0").split(",").map(Number)) for (const z of (process.env.ZS ?? "0,0.3,0.6").split(",").map(Number)) {
  const sets = `flute@fox-tan.rest=${play};flute@fox-tan.restShift=${x},${y},${z};flute@fox-tan.restPoleL=${hold.poleL.join(',')};flute@fox-tan.restPoleR=${hold.poleR.join(',')}${extra ? ';' + extra : ''}`;
  const { undo } = setHolds(sets);
  try {
    const scene = sceneOf(bytes);
    const index = scene.layout.players.findIndex((p) => p.cast.species === 'fox-tan' && p.cast.instrument === 'flute');
    const cast = scene.layout.players[index]!.cast;
    const model = scene.models.get(cast.species, cast.instrument, cast.kettles, cast.support);
    const start = -countInAt(scene.plan.beats, 0).lengthSec;
    const pose = poseAt(scene.plan, start, 10, NOT_STARTED, allAudible(scene.score), createScenePose(scene.plan)).players[index]!;
    const rig = model.studio!;
    const studio = poseStudioBones(rig, model.skeleton, pose.rotations, studioOffsets(pose), 1, createStudioPose());
    const folded = foldedFaces(rig.mesh, studio.matrices, skinStudioMesh(rig.mesh, studio));
    console.log(`shift ${x},${y},${z}: ${folded.length} folded: ${folded.map((f) => `${f}(${mainBone(rig.mesh, f)})`).join(' ')}`);
  } finally {
    undo();
  }
}
