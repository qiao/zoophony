/**
 * Fits the line of the bow stick through the middles of the closed right paw of the hippo, the
 * bassist, in the axes of the right hand of the player, over the sample sets of the bassist sweep
 * of the fit demos. Adapted from `docs/research/2026-10-17-grip-all/stick-line.ts`.
 *
 * Usage: node docs/research/2026-10-28-hippo-paw/probes/stick-line.ts hippo [--step <n>] [--set <changes>]
 * [--grip hippo:<x>,<y>,<z>,<deg>]. The round added the gap to the grip of the tree and the best
 * place for its turn at the end.
 */
import { Quaternion, Vector3 } from 'three';
import { boneIndex } from '../../../../src/models/rig.ts';
import { poseSkeleton } from '../../../../src/pose/test-kinematics.ts';
import { sceneOf } from '../../../../src/pose/test-scene.ts';
import type { TestScene } from '../../../../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../../../../src/pose/test-sweep-roles.ts';
import type { SpeciesId } from '../../../../src/models/species.ts';
import { patchedDemo } from '../../../../tools/patch-demos.ts';
import { rightPaw, volumeMiddle } from '../../../../tools/bow-grip.ts';
import { setHolds } from '../../../../tools/hold-sets.ts';
import { applyGrips } from '../../2026-10-17-grip-all/grip-set.ts';

const args = process.argv.slice(2);
console.log('grips', applyGrips(process.argv.slice(2)).join(' ') || 'tree');
const species = args[0] as SpeciesId;
const pick = (flag: string): string[] =>
  args.flatMap((arg, i) => (args[i - 1] === flag ? [arg] : []));
const step = Number(pick('--step')[0] ?? 6);
const changes = pick('--set');
if (changes.length > 0) {
  setHolds(changes.join(';'));
}

const scenes: TestScene[] = [];
for (const d of ['mozart-k525', 'bach-bwv1050', 'beethoven-8', 'boulanger-matin']) {
  scenes.push(sceneOf((await patchedDemo(`${d}.mid`)).bytes));
}
const mids: { m: Vector3; set: string }[] = [];
let palm = new Vector3();
let H = 0;
for (const scene of scenes) {
  if (!SWEEP_ROLES.bassist.hasRole(scene.score)) {
    continue;
  }
  for (const player of SWEEP_ROLES.bassist.players(scene)) {
    const index = Number(/(\d+)/.exec(player.name)?.[1] ?? -1);
    if (scene.layout.players[index]?.cast.species !== species) {
      continue;
    }
    palm = new Vector3(...player.model.body.palmR).sub(
      new Vector3(...player.model.skeleton.positions[boneIndex('handR')]!),
    );
    H = player.model.body.headHeight;
    for (const set of SWEEP_ROLES.bassist.sampleSets(scene)) {
      let k = 0;
      for (const sample of set.samples) {
        if (set.name === 'play' && k++ % step !== 0) {
          continue;
        }
        const posed = poseSkeleton(player.model, player.poseAt(sample));
        const hand = posed.frames[boneIndex('handR')]!;
        mids.push({
          m: volumeMiddle(rightPaw(posed))
            .sub(hand.position)
            .applyQuaternion(new Quaternion().copy(hand.rotation).invert()),
          set: set.name,
        });
      }
    }
  }
}
const ms = mids.map((x) => x.m);
console.log(
  'species',
  species,
  'samples',
  ms.length,
  'H',
  H.toFixed(4),
  'x range',
  Math.min(...ms.map((m) => m.x)).toFixed(4),
  Math.max(...ms.map((m) => m.x)).toFixed(4),
);
console.log('palm in hand axes cm', palm.toArray().map((v) => (v * 100).toFixed(2)).join(', '));
for (const name of ['play', 'lift', 'rest', 'lower']) {
  const s = mids.filter((x) => x.set === name).map((x) => x.m);
  if (s.length === 0) {
    continue;
  }
  const mean = s.reduce((a, b) => a.add(b), new Vector3()).divideScalar(s.length);
  console.log(
    `  ${name} n=${s.length} mean cm`,
    mean.toArray().map((v) => (v * 100).toFixed(2)).join(', '),
    'y range',
    (Math.min(...s.map((m) => m.y)) * 100).toFixed(2),
    (Math.max(...s.map((m) => m.y)) * 100).toFixed(2),
    'z range',
    (Math.min(...s.map((m) => m.z)) * 100).toFixed(2),
    (Math.max(...s.map((m) => m.z)) * 100).toFixed(2),
  );
}
let best = { a: 0, spread: Infinity, c: 0 };
for (let deg = -30; deg <= 80; deg += 0.25) {
  const a = (deg * Math.PI) / 180;
  const n = ms.map((m) => m.y * Math.cos(a) + m.z * Math.sin(a));
  const lo = Math.min(...n);
  const hi = Math.max(...n);
  if (hi - lo < best.spread) {
    best = { a: deg, spread: hi - lo, c: (hi + lo) / 2 };
  }
}
const a = (best.a * Math.PI) / 180;
const along = ms.map((m) => m.y * Math.sin(a) - m.z * Math.cos(a));
const t = (Math.min(...along) + Math.max(...along)) / 2;
const p = new Vector3(
  0,
  best.c * Math.cos(a) + t * Math.sin(a),
  best.c * Math.sin(a) - t * Math.cos(a),
);
p.x = ms.reduce((s, m) => s + m.x, 0) / ms.length;
console.log('best turn deg', best.a, 'max gap cm', ((best.spread / 2) * 100).toFixed(2));
console.log('point (hand axes) cm', p.toArray().map((v) => (v * 100).toFixed(2)).join(', '));
console.log(
  'at in H',
  p
    .clone()
    .sub(palm)
    .divideScalar(H)
    .toArray()
    .map((v) => v.toFixed(4))
    .join(', '),
);
for (const deg of [0, 20, 30, 40, 50, 60]) {
  const r = (deg * Math.PI) / 180;
  const n = ms.map((m) => m.y * Math.cos(r) + m.z * Math.sin(r));
  console.log(
    `  turn ${deg} deg: spread/2 cm ${(((Math.max(...n) - Math.min(...n)) / 2) * 100).toFixed(2)}`,
  );
}

// The gap of each paw middle to the stick line of the grip of the species in this tree.
{
  const { SPECIES } = await import('../../../../src/models/species.ts');
  const grip = SPECIES[species].bowGrip;
  if (grip) {
    const at = new Vector3(...grip.at).multiplyScalar(H).add(palm);
    const dir = new Vector3(0, Math.sin(grip.turn), -Math.cos(grip.turn));
    const gaps = ms.map((m) => {
      const d = m.clone().sub(at);
      return d.addScaledVector(dir, -d.dot(dir)).length();
    });
    const sorted = gaps.toSorted((a, b) => a - b);
    console.log(
      `tree grip ${((grip.turn * 180) / Math.PI).toFixed(1)} deg: gap p50 ${(100 * (sorted[Math.floor(sorted.length / 2)] ?? 0)).toFixed(2)} cm, p95 ${(100 * (sorted[Math.floor(0.95 * (sorted.length - 1))] ?? 0)).toFixed(2)} cm, max ${(100 * (sorted.at(-1) ?? 0)).toFixed(2)} cm`,
    );
  }
}

// The best place of the stick for the turn of the grip of the tree: the line of that direction
// through the middle of the band of the paw middles.
{
  const { SPECIES } = await import('../../../../src/models/species.ts');
  const grip = SPECIES[species].bowGrip;
  if (grip) {
    const g = grip.turn;
    const n = ms.map((m) => m.y * Math.cos(g) + m.z * Math.sin(g));
    const lo = Math.min(...n);
    const hi = Math.max(...n);
    const c = (hi + lo) / 2;
    const al = ms.map((m) => m.y * Math.sin(g) - m.z * Math.cos(g));
    const t = (Math.min(...al) + Math.max(...al)) / 2;
    const q = new Vector3(0, c * Math.cos(g) + t * Math.sin(g), c * Math.sin(g) - t * Math.cos(g));
    q.x = ms.reduce((s, m) => s + m.x, 0) / ms.length;
    const gaps = ms.map((m) => Math.hypot(m.y * Math.cos(g) + m.z * Math.sin(g) - c, m.x - q.x)).toSorted((a, b) => a - b);
    console.log(
      `refit place for ${((g * 180) / Math.PI).toFixed(1)} deg: at in H ${q.clone().sub(palm).divideScalar(H).toArray().map((v) => v.toFixed(4)).join(', ')}, gap p50 ${(100 * (gaps[Math.floor(gaps.length / 2)] ?? 0)).toFixed(2)} p95 ${(100 * (gaps[Math.floor(0.95 * (gaps.length - 1))] ?? 0)).toFixed(2)} max ${(100 * (gaps.at(-1) ?? 0)).toFixed(2)} cm`,
    );
  }
}
