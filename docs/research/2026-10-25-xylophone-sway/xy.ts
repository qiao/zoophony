// Strike errors of the xylophone mallets, by hand and by bar: node docs/research/2026-10-25-xylophone-sway/xy.ts <midi|percussion-test> [geo]
import { readFile } from 'node:fs/promises';
import { Vector3 } from 'three';
import { setHolds } from '../../../tools/hold-sets.ts';
if (process.env['SET']) setHolds(process.env['SET']);
import { probeDemos } from '../../../tools/probe-demos.ts';
import { sceneOf, PLAYING, allAudible } from '../../../src/pose/test-scene.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { poseSkeleton, posedPiecePoint } from '../../../src/pose/test-kinematics.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { boneIndex } from '../../../src/models/rig.ts';

const f = process.argv[2] ?? 'percussion-test';
const bytes = f.includes('/')
  ? new Uint8Array(await readFile(f))
  : (await probeDemos()).find((d) => d.file === `${f}.mid`)!.bytes;
const s = sceneOf(bytes);
const lead = countInAt(s.plan.beats, 0).lengthSec;
const cm = (v: number): string => (v * 100).toFixed(1);
for (const [index, pl] of s.layout.players.entries()) {
  if (pl.cast.instrument !== 'xylophone') continue;
  const model = s.models.get(pl.cast.species, 'xylophone', pl.cast.kettles, pl.cast.support);
  if (process.argv[3] === 'geo') {
    const p = model.skeleton.positions;
    for (const b of ['hips', 'spine', 'chest', 'shoulderL', 'upperArmL', 'forearmL', 'handL', 'thighL', 'shinL', 'footL', 'thighR', 'footR'] as const) {
      console.log(b, (p[boneIndex(b)] ?? []).map((v) => v.toFixed(3)).join(' '));
    }
    console.log('H', model.body.headHeight.toFixed(3));
    process.exit(0);
  }
  const plan = s.plan.players[index]!;
  const layer = plan.note as unknown as Record<'left' | 'right', { starts: Float64Array; points: Float64Array }>;
  for (const [side, tr] of [['L', layer.left], ['R', layer.right]] as const) {
    const bone = side === 'L' ? 'malletL' : 'malletR';
    const head = model.instrument.targets.find((t) => t.kind === 'mallet-head' && t.bone === bone)!;
    const errs: number[] = [];
    const rows: string[] = [];
    for (let i = 0; i < tr.starts.length; i++) {
      const start = tr.starts[i]! + plan.timeOffset;
      const posed = poseSkeleton(model, poseAt(s.plan, start, 10 + start + lead, PLAYING, allAudible(s.score), createScenePose(s.plan)).players[index]!);
      const target = new Vector3(tr.points[3 * i], tr.points[3 * i + 1], tr.points[3 * i + 2]);
      const e = new Vector3(...posedPiecePoint(posed, { bone, at: head.from })).distanceTo(target);
      errs.push(e);
      rows.push(`${start.toFixed(2)} x ${cm(target.x)} z ${cm(target.z)} err ${cm(e)}`);
    }
    const sorted = errs.toSorted((a, b) => a - b);
    const med = sorted[Math.floor(sorted.length / 2)] ?? 0;
    const share = (lim: number): string => ((100 * errs.filter((e) => e < lim).length) / Math.max(1, errs.length)).toFixed(0);
    console.log(`player ${index} ${side}: ${errs.length} strikes, median ${(med * 1000).toFixed(0)} mm, max ${(sorted.at(-1)! * 1000).toFixed(0)} mm, within 5 mm ${share(0.005)}%, within 2 cm ${share(0.02)}%`);
    if (process.env['ROWS']) console.log(rows.join('\n'));
  }
}
