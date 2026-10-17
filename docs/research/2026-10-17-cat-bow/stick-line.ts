/**
 * Fits the line of the bow stick of the cat through the middles of its closed right paw
 * (`volumeMiddle()` of `tools/bow-grip.ts`) in the axes of the right hand of the player, over the
 * sample sets of the violist sweep of three demos and of the standing soloist. The line lies in
 * the plane of the palm (y, z), and the turn is the turn of the stick from square toward the
 * wrist (`BowGrip.turn` of `models/instruments/strings.ts`). It prints the turn with the smallest
 * largest gap, that gap, and the place of the grip in head heights from the middle of the palm
 * (`BowGrip.at`).
 *
 * Usage, from the root of the worktree:
 *
 *     node docs/research/2026-10-17-cat-bow/stick-line.ts
 */
import { Quaternion, Vector3 } from 'three';
import { boneIndex } from '../../../src/models/rig.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import type { TestScene } from '../../../src/pose/test-scene.ts';
import { SWEEP_ROLES, soloistScene } from '../../../src/pose/test-sweep-roles.ts';
import { patchedDemo } from '../../../tools/patch-demos.ts';
import { rightPaw, volumeMiddle } from '../../../tools/bow-grip.ts';
const scenes: TestScene[] = [soloistScene('violist', 'cat')];
for (const d of ['mozart-k525', 'bach-bwv1050', 'beethoven-8']) scenes.push(sceneOf((await patchedDemo(`${d}.mid`)).bytes));
const mids: Vector3[] = [];
let palm = new Vector3();
let H = 0;
for (const scene of scenes) {
  for (const player of SWEEP_ROLES.violist.players(scene)) {
    palm = new Vector3(...player.model.body.palmR).sub(new Vector3(...player.model.skeleton.positions[boneIndex('handR')]!));
    H = player.model.body.headHeight;
    for (const set of SWEEP_ROLES.violist.sampleSets(scene)) {
      let k = 0;
      for (const sample of set.samples) {
        if (set.name === 'play' && k++ % 6 !== 0) continue;
        const posed = poseSkeleton(player.model, player.poseAt(sample));
        const hand = posed.frames[boneIndex('handR')]!;
        mids.push(volumeMiddle(rightPaw(posed)).sub(hand.position).applyQuaternion(new Quaternion().copy(hand.rotation).invert()));
      }
    }
  }
}
console.log('samples', mids.length, 'x range', Math.min(...mids.map((m) => m.x)).toFixed(4), Math.max(...mids.map((m) => m.x)).toFixed(4));
let best = { a: 0, spread: Infinity, c: 0, mean: 0 };
for (let deg = 25; deg <= 55; deg += 0.25) {
  const a = (deg * Math.PI) / 180;
  // The stick direction (y, z) = (sin a, -cos a); its normal in the y-z plane (cos a, sin a).
  const n = mids.map((m) => m.y * Math.cos(a) + m.z * Math.sin(a));
  const lo = Math.min(...n), hi = Math.max(...n);
  if (hi - lo < best.spread) best = { a: deg, spread: hi - lo, c: (hi + lo) / 2, mean: 0 };
}
const a = (best.a * Math.PI) / 180;
const along = mids.map((m) => m.y * Math.sin(a) - m.z * Math.cos(a));
const t = (Math.min(...along) + Math.max(...along)) / 2;
// The point on the line: c along the normal and t along the line.
const p = new Vector3(0, best.c * Math.cos(a) + t * Math.sin(a), best.c * Math.sin(a) - t * Math.cos(a));
p.x = mids.reduce((s, m) => s + m.x, 0) / mids.length;
console.log('best turn deg', best.a, 'max gap cm', ((best.spread / 2) * 100).toFixed(2));
console.log('point (hand axes) cm', p.toArray().map((v) => (v * 100).toFixed(2)).join(', '));
console.log('at in H', p.clone().sub(palm).divideScalar(H).toArray().map((v) => v.toFixed(4)).join(', '));
