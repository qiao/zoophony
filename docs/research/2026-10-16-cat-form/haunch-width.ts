/**
 * Prints the half width of each seated cat, red fox, and rabbit over its seat: the largest |x| of
 * the body corners with no arm, no instrument, and no tail, from the seat top to 12 cm above it,
 * against the half width of the seat of its chair. Usage, from the root of the worktree:
 *
 *     node docs/research/2026-10-16-cat-form/haunch-width.ts
 */
import { buildPlayer } from '../../../src/models/player.ts';
import { CHAIR } from '../../../src/models/props.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import type { BoneName } from '../../../src/models/rig.ts';

const skip = new Set(
  (
    [
      'upperArmL',
      'forearmL',
      'handL',
      'fingersL',
      'upperArmR',
      'forearmR',
      'handR',
      'fingersR',
      'instrument',
      'bow',
      'tail1',
      'tail2',
    ] as BoneName[]
  ).map(boneIndex),
);
for (const [species, instrument] of [
  ['cat', 'viola'],
  ['fox-red', 'violin'],
  ['rabbit', 'violin'],
] as const) {
  const m = buildPlayer(species, instrument, 4, 'chair');
  const seat = m.seat?.seatHeight ?? 0;
  let wide = 0;
  for (let c = 0; c < m.mesh.bones.length; c++) {
    if (skip.has(m.mesh.bones[c] ?? 0)) {
      continue;
    }
    const y = m.mesh.positions[c * 3 + 1] ?? 0;
    if (y >= seat - 0.01 && y <= seat + 0.12) {
      wide = Math.max(wide, Math.abs(m.mesh.positions[c * 3] ?? 0));
    }
  }
  const half = (m.seat?.seatWidth ?? CHAIR.seatWidth) / 2;
  console.log(
    `${species}: half width within 12 cm over the seat ${(wide * 100).toFixed(1)} cm, seat half width ${(half * 100).toFixed(1)} cm`,
  );
}
