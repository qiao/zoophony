// Eye line of the xylophone badger in the front view: node docs/research/2026-10-25-xylophone-sway/eyes.ts <midi|percussion-test> [step]
// The angle is the turn of the line from the left eye to the right eye in the x-y plane (the front
// view), in degrees: 0 is level. The probe gives the largest and the p95 of its size, and the
// worst time.
import { readFile } from 'node:fs/promises';
import { setHolds } from '../../../tools/hold-sets.ts';
if (process.env['SET']) setHolds(process.env['SET']);
import { probeDemos } from '../../../tools/probe-demos.ts';
import { sceneOf, PLAYING, allAudible } from '../../../src/pose/test-scene.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { boneIndex } from '../../../src/models/rig.ts';

const f = process.argv[2] ?? 'percussion-test';
const step = Number(process.argv[3] ?? 0.05);
const bytes = f.includes('/')
  ? new Uint8Array(await readFile(f))
  : (await probeDemos()).find((d) => d.file === `${f}.mid`)!.bytes;
const s = sceneOf(bytes);
const audible = allAudible(s.score);
const buffer = createScenePose(s.plan);
for (const [index, pl] of s.layout.players.entries()) {
  if (pl.cast.instrument !== 'xylophone') continue;
  const model = s.models.get(pl.cast.species, 'xylophone', pl.cast.kettles, pl.cast.support);
  const angles: number[] = [];
  let worst = 0;
  let worstAt = 0;
  for (let t = 0; t <= s.score.durationSec; t += step) {
    const posed = poseSkeleton(model, poseAt(s.plan, t, 10 + t, PLAYING, audible, buffer).players[index]!);
    const l = posed.frames[boneIndex('eyeL')]!.position;
    const r = posed.frames[boneIndex('eyeR')]!.position;
    const a = Math.abs((Math.atan2(r.y - l.y, r.x - l.x) * 180) / Math.PI);
    angles.push(a);
    if (process.env["FROM"] && t >= Number(process.env["FROM"]) && t <= Number(process.env["TO"])) console.log(t.toFixed(2), a.toFixed(1), "root", posed.pose.rootOffset.map((v) => v.toFixed(3)).join(","));
    if (a > worst) {
      worst = a;
      worstAt = t;
    }
  }
  const sorted = angles.toSorted((a, b) => a - b);
  const q = (p: number): string => (sorted[Math.floor(p * (sorted.length - 1))] ?? 0).toFixed(1);
  console.log(`${f.split('/').at(-1)} player ${index}: ${angles.length} samples, eye line p50 ${q(0.5)}°, p95 ${q(0.95)}°, max ${worst.toFixed(1)}° at ${worstAt.toFixed(2)} s`);
  break;
}
