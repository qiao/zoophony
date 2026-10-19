// Prints the face of the bassist body whose bind middle is nearest to each given point, in meters.
// The round found the faces 617, 618, and 323 of 16f16e44 at the bind middles of their corners
// in docs/research/2026-10-19-hippo-chest/fold-probe-base.txt and hold-fit-lean8-forward5.txt.
// Usage: node docs/research/2026-10-19-hippo-arms/face-near.ts <x>,<y>,<z>...
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { BASSIST_SWEEP } from '../../../src/pose/test-sweep-roles.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';

const points = process.argv.slice(2).map((p) => p.split(',').map(Number));
const demo = (await patchedDemos()).find((d) => d.file.startsWith('boulanger-matin'));
if (!demo) throw new Error('no demo');
const [player] = BASSIST_SWEEP.players(sceneOf(demo.bytes));
if (!player) throw new Error('no player');
const pos = player.model.mesh.positions;
for (const p of points) {
  let best = -1;
  let bestD = Infinity;
  for (let f = 0; f < pos.length / 9; f++) {
    let d = 0;
    for (let a = 0; a < 3; a++) {
      const m = (pos[f * 9 + a]! + pos[f * 9 + 3 + a]! + pos[f * 9 + 6 + a]!) / 3;
      d += (m - p[a]!) ** 2;
    }
    if (d < bestD) {
      bestD = d;
      best = f;
    }
  }
  console.log(`${p.join(',')}: face ${best}, ${(Math.sqrt(bestD) * 100).toFixed(2)} cm`);
}
