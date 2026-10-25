// Gap of the two xylophone mallet heads over the play: node docs/research/2026-10-25-xylophone-sway/heads.ts <midi|percussion-test> [step]
// The gap is the distance of the head centers minus two head radii (0.018 m). Only samples where
// the player plays (weight 1, inside the first and the last strike) count.
import { readFile } from 'node:fs/promises';
import { Vector3 } from 'three';
import { setHolds } from '../../../tools/hold-sets.ts';
if (process.env['SET']) setHolds(process.env['SET']);
import { probeDemos } from '../../../tools/probe-demos.ts';
import { sceneOf, PLAYING, allAudible } from '../../../src/pose/test-scene.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { poseSkeleton, posedPiecePoint } from '../../../src/pose/test-kinematics.ts';
import { posedPart, partDistance } from '../../../src/pose/test-clearance.ts';

const f = process.argv[2] ?? 'percussion-test';
const step = Number(process.argv[3] ?? 0.05);
const bytes = f.includes('/')
  ? new Uint8Array(await readFile(f))
  : (await probeDemos()).find((d) => d.file === `${f}.mid`)!.bytes;
const s = sceneOf(bytes);
const audible = allAudible(s.score);
const buffer = createScenePose(s.plan);
const RADIUS = 0.018;
for (const [index, pl] of s.layout.players.entries()) {
  if (pl.cast.instrument !== 'xylophone') continue;
  const model = s.models.get(pl.cast.species, 'xylophone', pl.cast.kettles, pl.cast.support);
  const plan = s.plan.players[index]!;
  const layer = plan.note as unknown as Record<'left' | 'right', { starts: Float64Array }>;
  const first = Math.min(layer.left.starts[0]!, layer.right.starts[0]!) + plan.timeOffset;
  const last = Math.max(layer.left.starts.at(-1)!, layer.right.starts.at(-1)!) + plan.timeOffset;
  const headOf = (bone: 'malletL' | 'malletR') =>
    model.instrument.targets.find((t) => t.kind === 'mallet-head' && t.bone === bone)!.from;
  const gaps: number[] = [];
  const heights: number[] = [];
  let shafts = 0;
  for (let t = first; t <= last; t += step) {
    const posed = poseSkeleton(model, poseAt(s.plan, t, 10 + t, PLAYING, audible, buffer).players[index]!);
    const l = new Vector3(...posedPiecePoint(posed, { bone: 'malletL', at: headOf('malletL') }));
    const r = new Vector3(...posedPiecePoint(posed, { bone: 'malletR', at: headOf('malletR') }));
    gaps.push(l.distanceTo(r) - 2 * RADIUS);
    heights.push(l.y - 0.4, r.y - 0.4);
    if (partDistance(posedPart(posed, ['malletL']), posedPart(posed, ['malletR']), 0.05) === 0) { shafts++; if (process.env["HITS"]) console.log("touch", t.toFixed(2), (l.distanceTo(r) - 2 * RADIUS).toFixed(3)); }
  }
  const sorted = gaps.toSorted((a, b) => a - b);
  const q = (p: number): string => ((sorted[Math.floor(p * (sorted.length - 1))] ?? 0) * 100).toFixed(1);
  const touch = gaps.filter((g) => g <= 0).length;
  console.log(`${f.split('/').at(-1)} player ${index}: ${gaps.length} samples, head gap min ${q(0)} cm, p5 ${q(0.05)} cm, median ${q(0.5)} cm, heads touch ${touch} (${((100 * touch) / gaps.length).toFixed(1)}%), mallets touch ${shafts} (${((100 * shafts) / gaps.length).toFixed(1)}%), head height p50 ${((heights.toSorted((a, b) => a - b)[Math.floor(heights.length / 2)] ?? 0) * 100).toFixed(1)} cm, p95 ${((heights.toSorted((a, b) => a - b)[Math.floor(heights.length * 0.95)] ?? 0) * 100).toFixed(1)} cm`);
}
