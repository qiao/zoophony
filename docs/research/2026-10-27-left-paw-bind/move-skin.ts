// Follows the left forearm skin of a role over each lift and lowering of the gate demos at steps of
// 0.01 s: the forearm twist of the trace (measureArm() of tools/arm-check.ts), its largest change
// in 0.05 s, the flat share of the arm, and the wraps of the paw twist. Prints the worst move.
// Usage: node docs/research/2026-10-27-left-paw-bind/move-skin.ts [roles]
import { FOLD_ROLES, roleBodies } from '../../../tools/fold-probe.ts';
import { probeDemos } from '../../../tools/probe-demos.ts';
import { armBinds, demoMoves, measureArm, MOVE_STEP } from '../../../tools/arm-check.ts';
import { createStudioPose, poseStudioBones, skinStudioMesh, studioOffsets } from '../../../src/models/studio-rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { LIFT_FIT_SEC, LOWER_MAX_SEC } from '../../../src/pose/rest.ts';
import { PLAYING, allAudible, sceneOf } from '../../../src/pose/test-scene.ts';
import type { Transport } from '../../../src/pose/types.ts';

const roles = (process.argv[2] ?? 'violinist,fox-violinist,violist').split(',');
const demos = await probeDemos();
const wrap = (a: number): number => ((((a + 180) % 360) + 360) % 360) - 180;
const WINDOW = 5;
for (const role of roles) {
  const source = FOLD_ROLES.get(role);
  if (!source) continue;
  const studio = createStudioPose();
  let worstStep = { value: 0, label: '' };
  let worstFlat = { value: Infinity, label: '' };
  let wraps = 0;
  let moves = 0;
  let samples = 0;
  const steps: number[] = [];
  for (const demo of demos) {
    const scene = sceneOf(demo.bytes);
    const bodies = roleBodies(source, scene);
    const body = bodies[0];
    if (!body || !body.model.studio) continue;
    const rig = body.model.studio;
    const arm = armBinds(rig).L;
    const audible = allAudible(scene.score);
    const buffer = createScenePose(scene.plan);
    for (const move of demoMoves(scene.score.durationSec)) {
      moves++;
      const lead = countInAt(scene.plan.beats, move.at).lengthSec;
      const transport: Transport =
        move.kind === 'lift'
          ? { ...PLAYING, changedAtWall: 10, startSec: move.at }
          : { ...PLAYING, playing: false, changedAtWall: 10, before: PLAYING };
      const span = move.kind === 'lift' ? LIFT_FIT_SEC : transport.holdSec + LOWER_MAX_SEC;
      const from = move.kind === 'lift' ? 0 : transport.holdSec;
      const count = Math.round((span - from) / MOVE_STEP) + 1;
      const fore: number[] = [];
      let prevRoll: number | null = null;
      for (let k = 0; k < count; k++) {
        const wall = from + k * MOVE_STEP;
        const song = move.kind === 'lift' ? Math.min(move.at, move.at - lead + wall) : move.at;
        const frame = poseAt(scene.plan, song, 10 + wall, transport, audible, buffer);
        const pose = body.index === null ? frame.conductor : frame.players[body.index];
        if (!pose) continue;
        poseStudioBones(rig, body.model.skeleton, pose.rotations, studioOffsets(pose), 1, studio);
        const posed = skinStudioMesh(rig.mesh, studio);
        const s = measureArm(arm, studio.matrices, posed, [], null);
        samples++;
        fore.push(s.foreTwist);
        const label = `${demo.file} ${move.kind} ${move.at.toFixed(2)} s, wall ${(wall - from).toFixed(2)} s`;
        if (s.flat < worstFlat.value) worstFlat = { value: s.flat, label };
        if (prevRoll !== null && Math.abs(wrap(s.pawRoll - prevRoll)) > 90) wraps++;
        prevRoll = s.pawRoll;
        if (fore.length > WINDOW) {
          const window = fore.slice(-WINDOW - 1);
          const step = Math.max(...window) - Math.min(...window);
          steps.push(step);
          if (step > worstStep.value) worstStep = { value: step, label };
        }
      }
    }
  }
  const sorted = steps.toSorted((a, b) => a - b);
  const q = (p: number): number => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? NaN;
  console.log(
    `${role}: ${moves} moves, ${samples} samples. Left forearm twist, largest change in 0.05 s: p50 ${q(0.5).toFixed(1)}, p95 ${q(0.95).toFixed(1)}, max ${worstStep.value.toFixed(1)} at ${worstStep.label}; over 20: ${steps.filter((x) => x > 20).length}. Flat min ${worstFlat.value.toFixed(2)} at ${worstFlat.label}. Paw twist jumps over 90 in 0.01 s: ${wraps}.`,
  );
}
