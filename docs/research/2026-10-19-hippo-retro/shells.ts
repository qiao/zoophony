// Counts the closed and the open shells of the instrument of each held role.
import { openLoops, posedPart } from '../../../src/pose/test-clearance.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../../../src/pose/test-sweep-roles.ts';
import { scoreOf } from '../../../src/score/test-score.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';

const demos = await patchedDemos();
for (const name of ['violinist', 'violist', 'cellist', 'bassist', 'flutist', 'oboist', 'trombonist'] as const) {
  const role = SWEEP_ROLES[name];
  const demo = demos.find((d) => role.hasRole(scoreOf(d.bytes)));
  if (!demo) { console.log(name, 'no demo'); continue; }
  const scene = sceneOf(demo.bytes);
  const [player] = role.players(scene);
  if (!player) { console.log(name, 'no player'); continue; }
  const [set] = role.sampleSets(scene);
  const first = [...(set?.samples ?? [])][40];
  if (!first) continue;
  const posed = poseSkeleton(player.model, player.poseAt(first));
  const part = posedPart(posed, ['instrument', 'slide']);
  const shells = part.closed?.() ?? [part];
  const open = shells.filter((s) => openLoops(s.triangles) > 0);
  console.log(`${name} ${demo.file}: ${part.triangles.length} triangles, ${shells.length} shells, ${open.length} open (${open.map((s) => s.triangles.length).join(',')} triangles)`);
}
