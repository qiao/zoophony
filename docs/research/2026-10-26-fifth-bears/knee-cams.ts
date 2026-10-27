/**
 * Prints camera JSONs of `close-views play --camera` aimed at the right and the left knee of the
 * polar bear pianist of a demo, from low views around each knee.
 *
 *     node docs/research/2026-10-26-fifth-bears/knee-cams.ts [demo] [distance] [height] [target]
 *
 * The distance and the height of the camera are in meters from the knee, and the target is the
 * height of the aim over the knee joint. Each line gives the side, the azimuth (0 looks at the
 * front of the bear, 90 at its right side), and the camera. The rounds used 1.0 0.08 -0.02.
 */
import { layoutScene } from '../../../src/models/layout-scene.ts';
import { ModelCache } from '../../../src/models/model-cache.ts';
import { STUDIO_POLAR_BEAR } from '../../../src/models/studio/polar-bear.ts';
import { buildScore } from '../../../src/score/score.ts';
import { probeDemos } from '../../../tools/probe-demos.ts';

const id = process.argv[2] ?? 'boulanger-matin';
const dist = Number(process.argv[3] ?? '1.1');
const height = Number(process.argv[4] ?? '0.12');
const demo = (await probeDemos()).find((d) => d.file === `${id}.mid`);
const result = demo ? buildScore(demo.bytes, 'auto') : null;
if (!result?.ok) {
  throw new Error('no score');
}
const layout = layoutScene(result.score, new ModelCache());
const p = layout.players.find((q) => JSON.stringify(q.cast).includes('polar-bear'));
if (!p) {
  throw new Error('no pianist');
}
const { position, facing } = p;
console.error('pianist', JSON.stringify(position), 'facing', facing, JSON.stringify(p.cast));
const world = (l: readonly number[]): number[] => {
  const [lx = 0, ly = 0, lz = 0] = l;
  const c = Math.cos(facing);
  const s = Math.sin(facing);
  return [position[0] + lx * c + lz * s, position[1] + ly, position[2] - lx * s + lz * c];
};
for (const side of ['L', 'R'] as const) {
  const knee = STUDIO_POLAR_BEAR.heads[`shin_${side}`];
  const target = world([knee[0], knee[1] + Number(process.argv[5] ?? "0.15"), knee[2]]);
  // Azimuth 0 looks at the front of the bear, 90 from its right side (+x of the body is its right).
  for (const az of [0, 30, 60, 90, 120, 150, 180, -30, -60, -90, -120, -150]) {
    const a = (az * Math.PI) / 180;
    const local = [knee[0] + dist * Math.sin(a), height, knee[2] - dist * Math.cos(a)];
    const pos = world(local);
    const r = (v: number[]): number[] => v.map((x) => Number(x.toFixed(3)));
    console.log(`${side} ${az} ${JSON.stringify({ position: r(pos), target: r(target), fov: 30 })}`);
  }
}
