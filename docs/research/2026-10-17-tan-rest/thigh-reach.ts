/**
 * Prints the reach of the left arm of the seated tan fox flutist to the top of its left thigh: the
 * nearest point of the faces of the `thighL` and `shinL` bones whose normal is more than 45° up
 * (the top of the thigh and the knee), lifted 1 cm along the normal for the palm, from the left
 * shoulder joint of the bind pose. The arm is the length from the shoulder joint to the middle of
 * the palm (`pnpm hold-reach fox-tan --instrument flute`). Usage, from the root of the worktree:
 *
 *     node docs/research/2026-10-17-tan-rest/thigh-reach.ts
 */
import { Triangle, Vector3 } from 'three';

import { freeRestReach } from '../../../tools/hold-reach.ts';
import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';

const model = buildPlayer('fox-tan', 'flute', 4, 'chair');
const { positions, bones } = model.mesh;
const leg = new Set([boneIndex('thighL'), boneIndex('shinL')]);
const shoulder = new Vector3(...(model.skeleton.positions[boneIndex('upperArmL')] ?? [0, 0, 0]));
const corner = (c: number): Vector3 =>
  new Vector3(positions[c * 3] ?? 0, positions[c * 3 + 1] ?? 0, positions[c * 3 + 2] ?? 0);
let best = { distance: Infinity, point: new Vector3() };
for (let c = 0; c + 2 < bones.length; c += 3) {
  if (!leg.has(bones[c] ?? -1)) {
    continue;
  }
  const t = new Triangle(corner(c), corner(c + 1), corner(c + 2));
  const normal = t.getNormal(new Vector3());
  if (normal.y < 0) {
    normal.negate();
  }
  if (normal.y < Math.SQRT1_2) {
    continue;
  }
  const point = t.closestPointToPoint(shoulder, new Vector3()).addScaledVector(normal, 0.01);
  const distance = point.distanceTo(shoulder);
  if (distance < best.distance) {
    best = { distance, point };
  }
}
const arm = freeRestReach('fox-tan', 'flute', 'chair')[0]?.arm ?? NaN;
console.log(
  `Left shoulder joint ${shoulder.toArray().map((v) => v.toFixed(3)).join(', ')} m. Nearest palm place on the top of the left thigh ${best.point.toArray().map((v) => v.toFixed(3)).join(', ')} m: ${best.distance.toFixed(3)} m from the shoulder joint, against the arm of ${arm.toFixed(3)} m (share ${(best.distance / arm).toFixed(3)}).`,
);
