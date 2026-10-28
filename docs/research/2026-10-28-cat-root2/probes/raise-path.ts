/** Prints, for each sample of the sets of the cat violist, the angle of the turn of the upper arm
 * of a side from the turn of each rule of `raise` (degrees) and the weight of each shape.
 * Usage: node scratch/raise-path.ts [--side L|R] [--demo <id>] [--sets rest,lift,lower,play] */
import { probeDemos } from '../tools/probe-demos.ts';
import { sceneOf } from '../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../src/pose/test-sweep-roles.ts';
import { poseSkeleton } from '../src/pose/test-kinematics.ts';
import { createStudioPose, poseStudioBones, studioOffsets } from '../src/models/studio-rig.ts';
import { CLOSED_EYE_SCALE } from '../src/scene/player.ts';
import type { SweepSample } from '../src/pose/test-sweep.ts';
const args = process.argv.slice(2);
const opt = (n: string, f: string): string => (args.includes(n) ? args[args.indexOf(n) + 1]! : f);
const side = opt('--side', 'L');
const demoId = opt('--demo', 'boulanger-matin');
const sets = opt('--sets', 'rest,lift,lower').split(',');
const every = Number(opt('--every', '1'));
const role = SWEEP_ROLES.violist!;
const demos = await probeDemos();
const demo = demos.find((d) => d.file.replace(/\.mid$/, '') === demoId)!;
const scene = sceneOf(demo.bytes);
const player = role.players(scene)[0]!;
const rig = player.model.studio!;
const raises = rig.body.raises ?? [];
const mine = raises.map((r, k) => ({ r, k })).filter(({ r }) => r.side === side);
// A copy of the rig whose shapes fade over 0 to pi: the weight then gives the angle.
const wide = { ...rig, body: { ...rig.body, raises: raises.map((r) => ({ ...r, fade: [0, Math.PI] as [number, number] })) } };
const angleOf = (w: number): number => {
  let lo = 0, hi = 1;
  for (let i = 0; i < 50; i++) { const t = (lo + hi) / 2; if (t * t * (3 - 2 * t) < w) lo = t; else hi = t; }
  return (1 - lo) * 180;
};
console.log(`side ${side}, rules: ${mine.map(({ r, k }) => `#${k} fade ${r.fade.map((x) => ((x * 180) / Math.PI).toFixed(0)).join('-')}`).join(', ')}. Each row: the angle to each rule, and the weight of each shape.`);
for (const set of role.sampleSets(scene).filter((s) => sets.includes(s.name))) {
  for (const [i, sample] of [...set.samples].entries()) {
    if (i % every) continue;
    const posed = poseSkeleton(player.model, player.poseAt(sample as SweepSample));
    const args5 = [posed.model.skeleton, posed.pose.rotations, studioOffsets(posed.pose), Math.max(CLOSED_EYE_SCALE, 1 - posed.pose.blink)] as const;
    const pose = poseStudioBones(rig, ...args5, createStudioPose());
    const wpose = poseStudioBones(wide as typeof rig, ...args5, createStudioPose());
    const cells = mine.map(({ k }) => `${angleOf(wpose.correctives[2 + k]!).toFixed(1).padStart(5)}° w${pose.correctives[2 + k]!.toFixed(2)}`);
    console.log(`${(set.name + '#' + i).padEnd(9)} t${(sample as SweepSample)[1].toFixed(2).padStart(7)}  ${cells.join('   ')}`);
  }
}
