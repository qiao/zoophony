// Measures the turn of the bow paw of the first rabbit violinist of a demo in the lift, at a
// step of 1 ms: the largest turn, its wall time, and the count of steps above 1,000° a second.
// It runs with the song held at 0 and with the real count-in. From the review of round 4.
// Usage: node docs/research/2026-10-13-studio-rabbit/turn-profile.ts
import { boneIndex } from '../../../src/models/rig.ts';
import type { PosePlan } from '../../../src/pose/plan.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { PLAYING, demoSceneOf } from '../../../src/pose/test-scene.ts';

function turnBetween(a: Float32Array, b: Float32Array, bone: number): number {
  let dot = 0;
  for (let k = 0; k < 4; k++) dot += (a[bone * 4 + k] ?? 0) * (b[bone * 4 + k] ?? 0);
  return (2 * Math.acos(Math.min(1, Math.abs(dot))) * 180) / Math.PI;
}
for (const file of ['bach-bwv1048.mid', 'beethoven-9.mid', 'boulanger-matin.mid']) {
  const demo = await demoSceneOf(file);
  const index = demo.layout.players.findIndex((p) => p.cast.species === 'rabbit' && p.cast.instrument === 'violin');
  const one: PosePlan = { ...demo.plan, players: [demo.plan.players[index]!] };
  const start = -countInAt(demo.plan.beats, 0).lengthSec;
  for (const mode of ['song 0', 'count-in']) {
    let last = createScenePose(one);
    let next = createScenePose(one);
    const song = (wall: number) => (mode === 'song 0' ? 0 : Math.min(0, start + wall));
    poseAt(one, song(0), 0, PLAYING, [], last);
    const step = 0.001;
    let worst = 0, at = 0, over = 0;
    const bones = [boneIndex('handR'), boneIndex('bow')];
    for (let wall = step; wall < 2.5; wall += step) {
      poseAt(one, song(wall), wall, PLAYING, [], next);
      const t = Math.max(...bones.map((b) => turnBetween(last.players[0]!.rotations, next.players[0]!.rotations, b))) / step;
      if (t > 1000) over += 1;
      if (t > worst) { worst = t; at = wall; }
      [last, next] = [next, last];
    }
    console.log(`${file} ${mode} (count-in ${(-start).toFixed(2)} s): worst ${worst.toFixed(0)}°/s at wall ${at.toFixed(3)}, ${over} ms above 1000°/s`);
  }
}
