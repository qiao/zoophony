// The soles of the xylophone badger over the play: SET='<changes>' node docs/research/2026-10-25-xylophone-reach/soles.ts <midi|percussion-test> [step]
// The sole corners are the skin corners of the foot parts that lie at most 5 mm above the floor
// in the bind pose. Sink is the depth of the lowest posed sole corner below the floor, float the
// height of the highest posed sole corner above the floor, for each foot, as p50, p95, and max.
import { readFile } from 'node:fs/promises';
import { setHolds } from '../../../tools/hold-sets.ts';
import { probeDemos } from '../../../tools/probe-demos.ts';
import { sceneOf, PLAYING, allAudible } from '../../../src/pose/test-scene.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { posedPart } from '../../../src/pose/test-clearance.ts';

if (process.env['SET']) setHolds(process.env['SET']);
const f = process.argv[2] ?? 'percussion-test';
const step = Number(process.argv[3] ?? 0.1);
const bytes = f.includes('/') ? new Uint8Array(await readFile(f)) : (await probeDemos()).find((d) => d.file === `${f}.mid`)!.bytes;
const s = sceneOf(bytes);
const audible = allAudible(s.score);
const buffer = createScenePose(s.plan);
const q = (v: number[], p: number): string => ((v.toSorted((a, b) => a - b)[Math.floor(p * (v.length - 1))] ?? 0) * 1000).toFixed(1);
for (const [index, pl] of s.layout.players.entries()) {
  if (pl.cast.instrument !== 'xylophone') continue;
  const model = s.models.get(pl.cast.species, 'xylophone', pl.cast.kettles, pl.cast.support);
  const plan = s.plan.players[index]!;
  const layer = plan.note as unknown as Record<'left' | 'right', { starts: Float64Array }>;
  const first = Math.min(layer.left.starts[0]!, layer.right.starts[0]!) + plan.timeOffset;
  const last = Math.max(layer.left.starts.at(-1)!, layer.right.starts.at(-1)!) + plan.timeOffset;
  const bind = poseSkeleton(model, poseAt(s.plan, -100, 0, PLAYING, audible, createScenePose(s.plan)).players[index]!);
  const out: string[] = [];
  for (const foot of ['footL', 'footR'] as const) {
    const corners = (p: typeof bind) => posedPart(p, [foot]).triangles.flatMap((tr) => [tr.a, tr.b, tr.c]);
    const b = corners(bind);
    const floor = Math.min(...b.map((p) => p.y));
    const sole = b.flatMap((p, i) => (p.y <= floor + 0.005 ? [i] : []));
    const sink: number[] = [];
    const float: number[] = [];
    for (let t = first; t <= last; t += step) {
      const c = corners(poseSkeleton(model, poseAt(s.plan, t, 10 + t, PLAYING, audible, buffer).players[index]!));
      const ys = sole.map((i) => c[i]!.y - floor);
      sink.push(Math.max(0, -Math.min(...ys)));
      float.push(Math.max(...ys.map((y, k) => y - (b[sole[k]!]!.y - floor))));
    }
    out.push(`${foot}: sink mm p50 ${q(sink, 0.5)} p95 ${q(sink, 0.95)} max ${q(sink, 1)}; lift of a sole corner mm p50 ${q(float, 0.5)} p95 ${q(float, 0.95)} max ${q(float, 1)}`);
  }
  console.log(`${f.split('/').at(-1)} player ${index} (${Math.round((last - first) / step)} samples): ${out.join('; ')}`);
  break;
}
