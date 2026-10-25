// Strike misses of the xylophone mallets, by hand and by row, and the cross of the hands:
// SET='<changes>' node docs/research/2026-10-25-xylophone-reach/reach.ts <midi|percussion-test>
// A miss is the distance of the posed mallet head from its target at the note start. The cross is
// the largest distance along x of a strike of one hand past the middle of the player, toward the
// other side.
import { readFile } from 'node:fs/promises';
import { Vector3 } from 'three';
import { setHolds } from '../../../tools/hold-sets.ts';
import { probeDemos } from '../../../tools/probe-demos.ts';
import { sceneOf, PLAYING, allAudible } from '../../../src/pose/test-scene.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { poseSkeleton, posedPiecePoint } from '../../../src/pose/test-kinematics.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { XYLOPHONE } from '../../../src/models/instruments/percussion.ts';

if (process.env['SET']) setHolds(process.env['SET']);
const f = process.argv[2] ?? 'percussion-test';
const bytes = f.includes('/')
  ? new Uint8Array(await readFile(f))
  : (await probeDemos()).find((d) => d.file === `${f}.mid`)!.bytes;
const s = sceneOf(bytes);
const lead = countInAt(s.plan.beats, 0).lengthSec;
const q = (v: number[], p: number): number => v.toSorted((a, b) => a - b)[Math.floor(p * (v.length - 1))] ?? 0;
const mm = (v: number): string => (v * 1000).toFixed(0);
for (const [index, pl] of s.layout.players.entries()) {
  if (pl.cast.instrument !== 'xylophone') continue;
  const model = s.models.get(pl.cast.species, 'xylophone', pl.cast.kettles, pl.cast.support);
  const plan = s.plan.players[index]!;
  const layer = plan.note as unknown as Record<'left' | 'right', { starts: Float64Array; points: Float64Array }>;
  const all: number[] = [];
  const out: string[] = [];
  const near: number[] = [];
  const far: number[] = [];
  for (const [side, tr] of [['L', layer.left], ['R', layer.right]] as const) {
    const bone = side === 'L' ? 'malletL' : 'malletR';
    const head = model.instrument.targets.find((t) => t.kind === 'mallet-head' && t.bone === bone)!;
    const errs: number[] = [];
    let cross = 0;
    for (let i = 0; i < tr.starts.length; i++) {
      const start = tr.starts[i]! + plan.timeOffset;
      const posed = poseSkeleton(model, poseAt(s.plan, start, 10 + start + lead, PLAYING, allAudible(s.score), createScenePose(s.plan)).players[index]!);
      const target = new Vector3(tr.points[3 * i], tr.points[3 * i + 1], tr.points[3 * i + 2]);
      const e = new Vector3(...posedPiecePoint(posed, { bone, at: head.from })).distanceTo(target);
      errs.push(e);
      if (process.env["ROWS"] && e >= 0.005) console.log(`  ${side} ${start.toFixed(2)} x ${(target.x * 100).toFixed(1)} z ${(target.z * 100).toFixed(1)} miss ${mm(e)}`);
      all.push(e);
      // The back row stands higher than the front row.
      (target.y > XYLOPHONE.barHeight + 0.01 ? far : near).push(e);
      cross = Math.max(cross, side === 'L' ? target.x : -target.x);
    }
    out.push(`${side} ${errs.length} strikes: within 5 mm ${((100 * errs.filter((e) => e < 0.005).length) / Math.max(1, errs.length)).toFixed(0)}%, median ${mm(q(errs, 0.5))}, p90 ${mm(q(errs, 0.9))}, max ${mm(q(errs, 1))} mm, cross ${(cross * 100).toFixed(1)} cm`);
  }
  const row = (v: number[]): string => `${v.length} strikes, over 5 mm ${v.filter((e) => e >= 0.005).length}, max ${mm(q(v, 1))} mm`;
  console.log(`player ${index}: ${out.join('; ')}`);
  console.log(`  front row ${row(near)}; back row ${row(far)}; all over 5 mm ${all.filter((e) => e >= 0.005).length} of ${all.length}`);
  break;
}
