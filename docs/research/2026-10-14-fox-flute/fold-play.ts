// Counts the folded faces of the tan fox flutist in play at some song times of Beethoven 8, for
// hold variants given as arguments (each a --set list).
import { patchedDemo } from '../../../tools/patch-demos.ts';
import { foldedFaces, mainBone } from '../../../tools/fold-probe.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { sceneOf, allAudible, PLAYING } from '../../../src/pose/test-scene.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { createStudioPose, poseStudioBones, skinStudioMesh, studioOffsets } from '../../../src/models/studio-rig.ts';

const { bytes } = await patchedDemo('beethoven-8.mid');
for (const sets of ['', ...process.argv.slice(2)]) {
  const { undo } = setHolds(sets);
  try {
    const scene = sceneOf(bytes);
    const index = scene.layout.players.findIndex((p) => p.cast.species === 'fox-tan' && p.cast.instrument === 'flute');
    const cast = scene.layout.players[index]!.cast;
    const model = scene.models.get(cast.species, cast.instrument, cast.kettles, cast.support);
    const buffer = createScenePose(scene.plan);
    const counts = new Map<number, number>();
    let withFold = 0;
    const times = [10, 30, 50, 70, 90];
    for (const t of times) {
      const pose = poseAt(scene.plan, t, 10 + t + 3, PLAYING, allAudible(scene.score), buffer).players[index]!;
      const rig = model.studio!;
      const studio = poseStudioBones(rig, model.skeleton, pose.rotations, studioOffsets(pose), 1, createStudioPose());
      const folded = foldedFaces(rig.mesh, studio.matrices, skinStudioMesh(rig.mesh, studio));
      if (folded.length) withFold++;
      for (const f of folded) counts.set(f, (counts.get(f) ?? 0) + 1);
    }
    const rig = model.studio!;
    console.log(`${sets.replace(/flute@fox-tan\.play=[^;]*;?/, '') || 'base'}: ${withFold}/${times.length} samples, faces ${[...counts].map(([f, n]) => `${f}(${mainBone(rig.mesh, f)})x${n}`).join(' ')}`);
  } finally {
    undo();
  }
}
