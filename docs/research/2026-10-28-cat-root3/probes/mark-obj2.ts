/** Writes the posed cat violist body as an OBJ file with vertex colors (app axes), with marked
 * vertices in colors, for scratch/armviews.py.
 * Usage: node scratch/mark-obj.ts <out.obj> [--at <demo>:<set>:<time>] [--mark <v,v,...>]... */
import { writeFileSync } from 'node:fs';
import { probeDemos } from '../tools/probe-demos.ts';
import { sceneOf } from '../src/pose/test-scene.ts';
import { SWEEP_ROLES, playSample } from '../src/pose/test-sweep-roles.ts';
import { poseSkeleton } from '../src/pose/test-kinematics.ts';
import { createStudioPose, poseStudioBones, skinStudioMesh, studioOffsets } from '../src/models/studio-rig.ts';
import { CLOSED_EYE_SCALE } from '../src/scene/player.ts';
import type { SweepSample } from '../src/pose/test-sweep.ts';
const args = process.argv.slice(2);
const out = args[0]!;
const opt = (n: string, f: string): string => (args.includes(n) ? args[args.indexOf(n) + 1]! : f);
const marks = args.flatMap((a, i) => (a === '--mark' ? [args[i + 1]!.split(',').map(Number)] : []));
const COLORS = [[1, 0.1, 0.1], [0.1, 0.9, 0.1], [0.2, 0.4, 1], [1, 0.9, 0.1], [1, 0.2, 1], [0.1, 1, 1]];
const role = SWEEP_ROLES.violist!;
const demos = await probeDemos();
const spec = opt('--at', '');
const [demoId = '', setName = 'play', timeText = '0'] = spec.split(':');
const demo = spec ? demos.find((d) => d.file.replace(/\.mid$/, '') === demoId)! : demos.find((d) => role.hasRole(sceneOf(d.bytes).score))!;
const scene = sceneOf(demo.bytes);
const player = role.players(scene)[0]!;
const rig = player.model.studio!;
const sm = rig.mesh;
let pos: ArrayLike<number> = sm.positions;
if (spec) {
  const time = Number(timeText.replace('#', ''));
  const sample = (setName === 'play' ? playSample(scene, time) : [...role.sampleSets(scene).find((s) => s.name === setName)!.samples].find((s, i) => (timeText.startsWith('#') ? i === time : Math.abs((s as SweepSample)[1] - time) < 0.06))) as SweepSample;
  const posed = poseSkeleton(player.model, player.poseAt(sample));
  const pose = poseStudioBones(rig, posed.model.skeleton, posed.pose.rotations, studioOffsets(posed.pose), Math.max(CLOSED_EYE_SCALE, 1 - posed.pose.blink), createStudioPose());
  pos = skinStudioMesh(sm, pose);
}
const key = (v: number): string => [0, 1, 2].map((a) => sm.positions[v * 3 + a]!.toFixed(5)).join(',');
const colorOf = new Map<string, number[]>();
marks.forEach((list, k) => list.forEach((v) => colorOf.set(key(v), COLORS[k % COLORS.length]!)));
const lines: string[] = [];
const faces: string[] = [];
let n = 1;
for (let t = 0; t < sm.corners.length / 3; t++) {
  for (let i = 0; i < 3; i++) {
    const v = sm.corners[t * 3 + i]!;
    const c = colorOf.get(key(v)) ?? [0.75, 0.72, 0.7];
    lines.push(`v ${pos[v * 3]!.toFixed(5)} ${pos[v * 3 + 1]!.toFixed(5)} ${pos[v * 3 + 2]!.toFixed(5)} ${c.join(' ')}`);
  }
  faces.push(`f ${n} ${n + 1} ${n + 2}`);
  n += 3;
}
writeFileSync(out, [...lines, ...faces].join('\n') + '\n');
const h = rig.body.heads as Record<string, number[]>;
console.log(`wrote ${out}; bind shoulder L ${h.upper_arm_L!.map((x) => x.toFixed(3))}`);
// The welded posed places (the lowest index of each place), for scratch/labels.py.
{
  const seen = new Map<string, number>();
  const outPos: Record<number, number[]> = {};
  for (let v = 0; v < sm.positions.length / 3; v++) {
    const k = key(v);
    if (seen.has(k)) continue;
    seen.set(k, v);
    outPos[v] = [pos[v * 3]!, pos[v * 3 + 1]!, pos[v * 3 + 2]!];
  }
  writeFileSync(out.replace(/\.obj$/, '.json'), JSON.stringify(outPos));
}
