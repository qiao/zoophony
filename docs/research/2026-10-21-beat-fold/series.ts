// Prints the spine sway in degrees, each 0.01 s, of the player with the largest sway in a window.
import { readFileSync } from 'node:fs';
import { Quaternion, Vector3 } from 'three';
import { boneIndex } from '../src/models/rig.ts';
import { createScenePose, poseAt } from '../src/pose/pose-at.ts';
import { PLAYING, allAudible, sceneOf } from '../src/pose/test-scene.ts';
const [path, from, to, who] = process.argv.slice(2);
const scene = sceneOf(new Uint8Array(readFileSync(path!)));
const { plan, score, layout } = scene;
const buf = createScenePose(plan); const q = new Quaternion(); const ax = new Vector3();
const spine = boneIndex('spine');
const series = layout.players.map(() => [] as number[]);
const times: number[] = [];
for (let t = Number(from); t <= Number(to) + 1e-9; t += 0.01) {
  times.push(t);
  const pose = poseAt(plan, t, 10 + t, PLAYING, allAudible(score), buf);
  for (const [p, pl] of pose.players.entries()) {
    q.fromArray(pl.rotations, spine * 4); ax.set(1, 0, 0).applyQuaternion(q);
    series[p]!.push(Math.asin(ax.y) * 180 / Math.PI);
  }
}
const best = who !== undefined ? Number(who) : series.map((s, p) => [Math.max(...s.map(Math.abs)), p] as const).reduce((a, b) => (b[0] > a[0] ? b : a))[1];
console.log(`# player ${best} ${layout.players[best]!.cast.instrument}`);
console.log(times.map((t, i) => `${t.toFixed(2)} ${series[best]![i]!.toFixed(4)}`).join('\n'));
