// Largest change of any bone rotation between two frames 1/60 s apart, near the pattern changes and elsewhere.
import { readFileSync } from 'node:fs';
import { createScenePose, poseAt } from '../src/pose/pose-at.ts';
import { PLAYING, allAudible, sceneOf } from '../src/pose/test-scene.ts';
const scene = sceneOf(new Uint8Array(readFileSync(process.argv[2]!)));
const { plan, score } = scene;
const changes = score.beats.filter((b, k) => k > 0 && b.indexInBar === 0 && b.pattern !== score.beats[k - 1]!.pattern).map((b) => b.timeSec);
console.log('pattern changes at', changes.map((t) => t.toFixed(2)).join(' '));
const audible = allAudible(score);
const a = createScenePose(plan), b = createScenePose(plan);
const dt = 1 / 60;
const angle = (p: Float32Array, q: Float32Array) => { let m = 0; for (let i = 0; i < p.length; i += 4) { const d = Math.abs(p[i]!*q[i]! + p[i+1]!*q[i+1]! + p[i+2]!*q[i+2]! + p[i+3]!*q[i+3]!); m = Math.max(m, 2 * Math.acos(Math.min(1, d))); } return m; };
let near = { v: 0, t: 0 }, far: number[] = [];
for (let t = 0; t + dt < score.durationSec; t += dt) {
  const pa = poseAt(plan, t, 10 + t, PLAYING, audible, a);
  const pb = poseAt(plan, t + dt, 10 + t + dt, PLAYING, audible, b);
  let m = 0;
  for (const [i, p] of pa.players.entries()) m = Math.max(m, angle(p.rotations, pb.players[i]!.rotations));
  if (pa.conductor && pb.conductor) m = Math.max(m, angle(pa.conductor.rotations, pb.conductor.rotations));
  const deg = m * 180 / Math.PI;
  if (changes.some((c) => Math.abs(c - t) < 0.5)) { if (deg > near.v) near = { v: deg, t }; } else far.push(deg);
}
far.sort((x, y) => x - y);
console.log(`near the changes (0.5 s): max ${near.v.toFixed(2)} deg/frame at ${near.t.toFixed(2)} s; elsewhere p50 ${far[Math.floor(far.length/2)]!.toFixed(2)}, p99 ${far[Math.floor(far.length*0.99)]!.toFixed(2)}, max ${far.at(-1)!.toFixed(2)}`);
