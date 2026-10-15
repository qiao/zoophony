// The share of the kept cuts and shots of each demo when each player moves by 2 cm
// (the stability test of src/shots/prepare.test.ts).
import { mulberry32 } from '../../../src/pose/random.ts';
import { prepareShots } from '../../../src/shots/prepare.ts';
import { TEST_SEED, shotDemos, shotSceneOf } from '../../../src/shots/test-shots.ts';
import type { SceneLayout } from '../../../src/models/layout.ts';
import type { Shot } from '../../../src/shots/types.ts';
function movePlayers(layout: SceneLayout, seed: number, distance: number): SceneLayout {
  const random = mulberry32(seed);
  return { ...layout, players: layout.players.map((place) => {
    const angle = random() * 2 * Math.PI;
    const [x, y, z] = place.position;
    return { ...place, position: [x + distance * Math.cos(angle), y, z + distance * Math.sin(angle)] as [number, number, number] };
  }) };
}
const startOf = (s: Shot) => s.startSec.toFixed(2);
const labelOf = (s: Shot) => `${startOf(s)} ${s.kind} ${s.seats.toSorted((a, b) => a - b).join('+')}`;
let T = 0, KS = 0, KC = 0;
for (const demo of await shotDemos()) {
  const scene = shotSceneOf(demo.file, demo.bytes);
  const base = scene.plan.shots.slice(1, -1);
  let t = 0, ks = 0, kc = 0;
  for (const seed of [1, 2, 3, 4]) {
    const moved = prepareShots(scene.score, movePlayers(scene.layout, seed, 0.02), TEST_SEED, scene.models).shots.slice(1, -1);
    const labels = new Set(moved.map(labelOf));
    const starts = new Set(moved.map(startOf));
    t += base.length; ks += base.filter((s) => labels.has(labelOf(s))).length; kc += base.filter((s) => starts.has(startOf(s))).length;
  }
  T += t; KS += ks; KC += kc;
  console.log(`${demo.file}: shots ${base.length}, cuts kept ${(100 * kc / t).toFixed(1)}%, shots kept ${(100 * ks / t).toFixed(1)}%`);
}
console.log(`all: cuts kept ${(100 * KC / T).toFixed(1)}%, shots kept ${(100 * KS / T).toFixed(1)}%`);
