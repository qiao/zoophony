// Root, shoulder, wrist, and error at the first strikes of a hand: node docs/research/2026-10-25-xylophone-sway/dbg.ts <midi> [L|R] [count]
import { readFile } from 'node:fs/promises';
import { Vector3 } from 'three';
import { setHolds } from '../../../tools/hold-sets.ts';
if (process.env['SET']) setHolds(process.env['SET']);
import { probeDemos } from '../../../tools/probe-demos.ts';
import { sceneOf, PLAYING, allAudible } from '../../../src/pose/test-scene.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { poseSkeleton, posedPiecePoint } from '../../../src/pose/test-kinematics.ts';
import { boneIndex } from '../../../src/models/rig.ts';

const f = process.argv[2] ?? 'percussion-test';
const side = process.argv[3] === 'R' ? 'R' : 'L';
const count = Number(process.argv[4] ?? 12);
const bytes = f.includes('/')
  ? new Uint8Array(await readFile(f))
  : (await probeDemos()).find((d) => d.file === `${f}.mid`)!.bytes;
const s = sceneOf(bytes);
const fmt = (v: readonly number[]): string => v.map((x) => x.toFixed(3)).join(',');
for (const [index, pl] of s.layout.players.entries()) {
  if (pl.cast.instrument !== 'xylophone') continue;
  const model = s.models.get(pl.cast.species, 'xylophone', pl.cast.kettles, pl.cast.support);
  const plan = s.plan.players[index]!;
  const layer = plan.note as unknown as Record<'left' | 'right', { starts: Float64Array; points: Float64Array }>;
  const tr = side === 'L' ? layer.left : layer.right;
  const bone = side === 'L' ? 'malletL' : 'malletR';
  const head = model.instrument.targets.find((t) => t.kind === 'mallet-head' && t.bone === bone)!;
  for (let i = 0; i < Math.min(count, tr.starts.length); i++) {
    const start = tr.starts[i]! + plan.timeOffset;
    const pose = poseAt(s.plan, start, 10 + start, PLAYING, allAudible(s.score), createScenePose(s.plan)).players[index]!;
    const posed = poseSkeleton(model, pose);
    const sh = posed.frames[boneIndex(side === 'L' ? 'upperArmL' : 'upperArmR')]!.position;
    const wr = posed.frames[boneIndex(side === 'L' ? 'handL' : 'handR')]!.position;
    const h = new Vector3(...posedPiecePoint(posed, { bone, at: head.from }));
    const t = new Vector3(tr.points[3 * i], tr.points[3 * i + 1], tr.points[3 * i + 2]);
    console.log(start.toFixed(2), 'root', fmt(pose.rootOffset), 'sh', fmt(sh.toArray()), 'wrist', fmt(wr.toArray()), 'reach', wr.distanceTo(sh).toFixed(3), 'target', fmt(t.toArray()), 'head', fmt(h.toArray()), 'err', h.distanceTo(t).toFixed(3));
  }
  break;
}
