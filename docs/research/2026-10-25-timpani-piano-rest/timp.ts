// Measures the timpani mallets of the elephant over each demo with a timpani part: the head of
// each mallet above the plane of the kettle heads, the direction of the shaft (degrees in from
// forward, seen from above, and up from the level), at rest, between strikes, and at the peak of
// the lift, and the largest turn of each paw in one step of 0.01 s.
// Usage: [SET=<changes>] node docs/research/2026-10-25-timpani-piano-rest/timp.ts [demo prefix]
import { Quaternion, Vector3 } from 'three';
import { probeDemos } from '../../../tools/probe-demos.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
if (process.env.SET) setHolds(process.env.SET);
import { boneIndex } from '../../../src/models/rig.ts';
import { posedPiecePoint, poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { NOT_STARTED, PLAYING, allAudible, sceneOf } from '../../../src/pose/test-scene.ts';
import { percussionRig } from '../../../src/pose/percussion-rig.ts';

const prefix = process.argv[2] ?? '';
const quantile = (xs: number[], q: number): number => {
  const s = xs.toSorted((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))] ?? NaN;
};
for (const demo of await probeDemos()) {
  if (!demo.file.startsWith(prefix)) continue;
  const scene = sceneOf(demo.bytes);
  const index = scene.layout.players.findIndex((p) => p.cast.instrument === 'timpani');
  const place = scene.layout.players[index];
  if (!place) continue;
  const model = scene.models.get(place.cast.species, place.cast.instrument, place.cast.kettles, place.cast.support);
  const rig = percussionRig(model, 'timpani');
  const plane = rig.restL.point[1];
  const buffer = createScenePose(scene.plan);
  const audible = allAudible(scene.score);
  const heads = (['malletL', 'malletR'] as const).map((bone) => {
    const t = model.instrument.targets.find((x) => x.kind === 'mallet-head' && x.bone === bone);
    if (!t) throw new Error('no head');
    return t.from;
  });
  const measure = (time: number, transport: typeof PLAYING) => {
    const pose = poseAt(scene.plan, time, time + 100, transport, audible, buffer).players[index];
    if (!pose) throw new Error('no pose');
    const posed = poseSkeleton(model, pose);
    return (['L', 'R'] as const).map((side, i) => {
      const bone = side === 'L' ? 'malletL' : 'malletR';
      const head = new Vector3(...posedPiecePoint(posed, { bone, at: heads[i] ?? [0, 0, 0] }));
      const grip = new Vector3(...posedPiecePoint(posed, { bone, at: [0, 0, 0] }));
      const axis = head.clone().sub(grip).normalize();
      // In from forward (-z): positive toward the middle of the body.
      const inward = (Math.atan2(side === 'L' ? axis.x : -axis.x, -axis.z) * 180) / Math.PI;
      const up = (Math.asin(axis.y) * 180) / Math.PI;
      const hand = posed.frames[boneIndex(`hand${side}`)];
      return { height: head.y - plane, inward, up, hand: hand ? hand.rotation.clone() : new Quaternion() };
    });
  };
  const rest = measure(0, NOT_STARTED);
  console.log(`length ${rig.left.kind === "mallet" ? rig.left.length.toFixed(3) : "-"} m`);
  const f = (x: number) => x.toFixed(1);
  console.log(`${demo.file}: rest L height ${f(rest[0]!.height * 100)} cm, in ${f(rest[0]!.inward)}°, up ${f(rest[0]!.up)}°; R ${f(rest[1]!.height * 100)} cm, in ${f(rest[1]!.inward)}°, up ${f(rest[1]!.up)}°`);
  const notes = scene.score.notes.filter((n) => n.seatIndex === place.cast.seatIndex && n.player === place.cast.player);
  const end = Math.min(scene.score.durationSec, (notes.at(-1)?.startSec ?? 0) + 2);
  const step = 0.01;
  const last: (Quaternion | null)[] = [null, null];
  const worst = [0, 0];
  const worstAt = [0, 0];
  const jumps = [0, 0];
  const heights: number[][] = [[], []];
  const ins: number[][] = [[], []];
  const ups: number[][] = [[], []];
  for (let t = Math.max(0, (notes[0]?.startSec ?? 0) - 1); t <= end; t += step) {
    const m = measure(t, PLAYING);
    for (const i of [0, 1]) {
      const s = m[i]!;
      const before = last[i];
      if (before) {
        const a = (s.hand.angleTo(before) * 180) / Math.PI;
        if (a > worst[i]!) {
          worst[i] = a;
          worstAt[i] = t;
        }
        if (a > 30) jumps[i]!++;
      }
      last[i] = s.hand;
      heights[i]!.push(s.height);
      ins[i]!.push(s.inward);
      ups[i]!.push(s.up);
    }
  }
  for (const i of [0, 1]) {
    const h = heights[i]!;
    console.log(
      `  ${i ? 'R' : 'L'}: height cm p5 ${f(quantile(h, 0.05) * 100)} p50 ${f(quantile(h, 0.5) * 100)} p95 ${f(quantile(h, 0.95) * 100)} max ${f(Math.max(...h) * 100)}; in p50 ${f(quantile(ins[i]!, 0.5))}°, up p5 ${f(quantile(ups[i]!, 0.05))}° p50 ${f(quantile(ups[i]!, 0.5))}° p95 ${f(quantile(ups[i]!, 0.95))}°; turns over 30° ${jumps[i]}, largest step ${f(worst[i]!)}° at ${worstAt[i]!.toFixed(2)} s`,
    );
  }
}
