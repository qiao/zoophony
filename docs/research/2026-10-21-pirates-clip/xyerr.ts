// Median and share of the strike errors of each mallet: node docs/research/2026-10-21-pirates-clip/xyerr.ts <midi|test>
import { readFile } from 'node:fs/promises';
import { Vector3 } from 'three';
import { setHolds } from '../../../tools/hold-sets.ts';
if (process.env['SET']) setHolds(process.env['SET']);
import { probeDemos } from '../../../tools/probe-demos.ts';
import { sceneOf, PLAYING, allAudible } from '../../../src/pose/test-scene.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { poseSkeleton, posedPiecePoint } from '../../../src/pose/test-kinematics.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
const f = process.argv[2]!;
const bytes = f.includes('/') ? new Uint8Array(await readFile(f)) : (await probeDemos()).find((d) => d.file === `${f}.mid`)!.bytes;
const s = sceneOf(bytes);
const lead = countInAt(s.plan.beats, 0).lengthSec;
for (const [index, pl] of s.layout.players.entries()) {
  if (pl.cast.instrument !== 'xylophone') continue;
  const model = s.models.get(pl.cast.species, 'xylophone', pl.cast.kettles, pl.cast.support);
  const plan = s.plan.players[index]!;
  const layer = plan.note as unknown as Record<'left' | 'right', { starts: Float64Array; points: Float64Array }>;
  for (const [side, tr] of [['L', layer.left], ['R', layer.right]] as const) {
    const bone = side === 'L' ? 'malletL' : 'malletR';
    const head = model.instrument.targets.find((t) => t.kind === 'mallet-head' && t.bone === bone)!;
    const errs: number[] = [];
    for (let i = 0; i < tr.starts.length; i++) {
      const start = tr.starts[i]! + plan.timeOffset;
      const posed = poseSkeleton(model, poseAt(s.plan, start, 10 + start + lead, PLAYING, allAudible(s.score), createScenePose(s.plan)).players[index]!);
      errs.push(new Vector3(...posedPiecePoint(posed, { bone, at: head.from })).distanceTo(new Vector3(tr.points[3 * i], tr.points[3 * i + 1], tr.points[3 * i + 2])));
    }
    const sorted = errs.toSorted((a, b) => a - b);
    const med = sorted[Math.floor(sorted.length / 2)] ?? 0;
    console.log(`player ${index} ${side}: ${errs.length} strikes, median ${(med * 1000).toFixed(0)} mm, within 2 cm ${((100 * errs.filter((e) => e < 0.02).length) / Math.max(1, errs.length)).toFixed(0)}%`);
  }
}
