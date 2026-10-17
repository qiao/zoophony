/**
 * Usage, from the root of the worktree: node docs/research/2026-10-16-cat-seat/hand-dir.ts
 *
 * Prints the mean direction of the left and right paw (wrist to knuckles) and of the forearm of
 * the first seated cat in the play samples of mozart-k525, in the studio axes (+x left, +z
 * forward), and the spread of the paw direction.
 */
import { Vector3 } from 'three';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { posedPoint, poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../../../src/pose/test-sweep-roles.ts';

const role = SWEEP_ROLES.violist;
const demo = (await patchedDemos()).find((d) => d.file === 'mozart-k525.mid');
if (!demo) {
  throw new Error('no demo');
}
const scene = sceneOf(demo.bytes);
const player = role.players(scene).find((p) => p.model.seat);
if (!player) {
  throw new Error('no seated cat');
}
const studio = (v: Vector3): Vector3 => new Vector3(-v.x, v.y, -v.z);
for (const side of ['L', 'R'] as const) {
  const sums = { hand: new Vector3(), fore: new Vector3(), upper: new Vector3() };
  const hands: Vector3[] = [];
  // A sample set can be a generator, which one loop uses up, so each side takes its own sets.
  const play = role.sampleSets(scene).find((s) => s.name === 'play');
  for (const sample of play?.samples ?? []) {
    const posed = poseSkeleton(player.model, player.poseAt(sample));
    const at = (name: string): Vector3 => new Vector3(...posedPoint(posed, name as never, [0, 0, 0]));
    const shoulder = at(`upperArm${side}`);
    const elbow = at(`forearm${side}`);
    const wrist = at(`hand${side}`);
    const knuckle = at(`fingers${side}`);
    const hand = studio(knuckle.clone().sub(wrist).normalize());
    hands.push(hand);
    sums.hand.add(hand);
    sums.fore.add(studio(wrist.clone().sub(elbow).normalize()));
    sums.upper.add(studio(elbow.clone().sub(shoulder).normalize()));
  }
  const f = (v: Vector3): string => v.clone().normalize().toArray().map((x) => x.toFixed(3)).join(', ');
  const mean = sums.hand.clone().normalize();
  const spread = Math.max(...hands.map((h) => (Math.acos(Math.min(1, h.dot(mean))) * 180) / Math.PI));
  console.log(`${side}: upper arm ${f(sums.upper)}; forearm ${f(sums.fore)}; paw ${f(sums.hand)}; largest angle of a paw from the mean ${spread.toFixed(1)} deg (${hands.length} samples)`);
}
