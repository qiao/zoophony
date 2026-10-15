/**
 * Measures where the haunch of the rabbit and the red fox sits on the chair of the app, in the
 * model axes (the player faces -z, the chair back at +z): the front edge and the back posts of
 * the chair, the back of the haunch (the largest z of the body corners up to 0.12 m over the seat,
 * with no tail), the bottom of the haunch (the lowest corners over the seat), and the depth of the
 * seat that the thighs cover.
 *
 * Usage, from the root of the worktree: node docs/research/2026-10-14-neck-violin/seat-probe.ts
 */
import { Vector3 } from 'three';

import { CHAIR, CHAIR_LEG } from '../../../src/models/props.ts';
import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';

const tail = new Set([boneIndex('tail1'), boneIndex('tail2')]);
const arms = new Set(
  ['upperArmL', 'forearmL', 'handL', 'fingersL', 'upperArmR', 'forearmR', 'handR', 'fingersR', 'instrument', 'bow'].map(
    (b) => boneIndex(b as never),
  ),
);
const legs = new Set(['thighL', 'thighR'].map((b) => boneIndex(b as never)));
for (const species of ['rabbit', 'fox-red'] as const) {
  const model = buildPlayer(species, 'violin', 4, 'chair');
  const seat = model.seat;
  if (!seat) {
    throw new Error('no seat');
  }
  const depth = seat.seatDepth ?? CHAIR.seatDepth;
  const back = CHAIR.seatDepth / 2;
  const front = back - depth;
  const posts = back - CHAIR_LEG;
  const { positions, bones } = model.mesh;
  let backmost = -Infinity;
  let low = new Vector3(0, Infinity, 0);
  let lowZ: number[] = [];
  let thighFront = -Infinity;
  let thighBack = Infinity;
  let thighLow = Infinity;
  for (let c = 0; c < bones.length; c++) {
    const bone = bones[c] ?? 0;
    if (tail.has(bone) || arms.has(bone)) {
      continue;
    }
    const p = new Vector3(positions[c * 3], positions[c * 3 + 1], positions[c * 3 + 2]);
    if (Math.abs(p.x) > CHAIR.seatWidth / 2) {
      continue;
    }
    if (p.y < seat.seatHeight + 0.12 && p.y > seat.seatHeight - 0.02 && p.z > front - 0.2) {
      backmost = Math.max(backmost, p.z);
    }
    if (p.y < low.y && p.z <= back && p.z >= front) {
      low = p;
    }
  }
  for (let c = 0; c < bones.length; c++) {
    const bone = bones[c] ?? 0;
    const p = new Vector3(positions[c * 3], positions[c * 3 + 1], positions[c * 3 + 2]);
    if (!tail.has(bone) && !arms.has(bone) && p.y < low.y + 0.01 && p.z <= back && p.z >= front) {
      lowZ.push(p.z);
    }
    if (legs.has(bone) && p.y < seat.seatHeight + 0.02) {
      thighFront = Math.min(thighFront === -Infinity ? Infinity : thighFront, p.z);
      thighBack = Math.max(thighBack === Infinity ? -Infinity : thighBack, p.z);
      thighLow = Math.min(thighLow, p.y);
    }
  }
  const f = (v: number): string => (v * 100).toFixed(1);
  console.log(
    `${species}: seat ${f(seat.seatHeight)} cm high, ${f(depth)} cm deep: front edge z ${f(front)}, back z ${f(back)}, posts from z ${f(posts)} cm`,
  );
  console.log(
    `  back of the haunch z ${f(backmost)} cm: ${f(posts - backmost)} cm in front of the back posts, ${f(backmost - front)} cm behind the front edge`,
  );
  console.log(
    `  bottom of the haunch (within 1 cm of the lowest point ${f(low.y)} cm) from z ${f(Math.min(...lowZ))} to ${f(Math.max(...lowZ))} cm`,
  );
  console.log(
    `  thighs within 2 cm of the seat top: z ${f(thighFront)} to ${f(thighBack)} cm, ${f(Math.max(0, Math.min(back, thighBack) - Math.max(front, thighFront)))} cm of the seat depth, the knee ${f(front - thighFront)} cm past the front edge`,
  );
}

// The underside of the body: the lowest body corner in each band of 2 cm along z, over the seat
// width, against the seat top.
for (const species of ['rabbit', 'fox-red'] as const) {
  const model = buildPlayer(species, 'violin', 4, 'chair');
  const seatTop = model.seat?.seatHeight ?? 0;
  const { positions, bones } = model.mesh;
  const rows: string[] = [];
  for (let z = -0.4; z < 0.2; z += 0.02) {
    let low = Infinity;
    for (let c = 0; c < bones.length; c++) {
      const bone = bones[c] ?? 0;
      if (tail.has(bone) || arms.has(bone)) {
        continue;
      }
      const x = positions[c * 3] ?? 0;
      const y = positions[c * 3 + 1] ?? 0;
      const pz = positions[c * 3 + 2] ?? 0;
      if (Math.abs(x) <= CHAIR.seatWidth / 2 && pz >= z && pz < z + 0.02 && y > seatTop - 0.25) {
        low = Math.min(low, y);
      }
    }
    if (low < Infinity) {
      rows.push(`z ${(z * 100).toFixed(0)}..${((z + 0.02) * 100).toFixed(0)}: ${((low - seatTop) * 100).toFixed(1)}`);
    }
  }
  console.log(`${species} underside over the seat top (cm): ${rows.join('; ')}`);
}
