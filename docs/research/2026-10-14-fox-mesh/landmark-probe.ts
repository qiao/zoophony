/**
 * Measures the parametric foxes of the app: the standing shoulder joints (the landmark of the
 * scale of the fox mesh, as the rabbit mesh took 0.581 m from the parametric rabbit), the head
 * height H, the eyes, the head top, the ear tips, and the hips, standing and on the chair of a
 * violinist. Usage:
 *
 *     node docs/research/2026-10-14-fox-mesh/landmark-probe.ts
 */
import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import type { BoneName } from '../../../src/models/rig.ts';

for (const [species, instrument] of [
  ['fox-red', 'violin'],
  ['fox-tan', 'flute'],
  ['rabbit', 'violin'],
] as const) {
  for (const support of ['stand', 'chair'] as const) {
    const m = buildPlayer(species, instrument, 4, support);
    const head = boneIndex('head');
    const ears = new Set([boneIndex('earL'), boneIndex('earR')]);
    let top = -Infinity;
    let earTop = -Infinity;
    for (let c = 0; c < m.mesh.bones.length; c++) {
      const y = m.mesh.positions[c * 3 + 1] ?? 0;
      const bone = m.mesh.bones[c] ?? -1;
      if (bone === head) {
        top = Math.max(top, y);
      }
      if (ears.has(bone)) {
        earTop = Math.max(earTop, y);
      }
    }
    const at = (b: BoneName): readonly number[] => m.skeleton.positions[boneIndex(b)] ?? [];
    const seat = m.seat?.seatHeight ?? 0;
    console.log(
      `${species} ${instrument} ${support}: seat ${seat.toFixed(3)} H ${m.body.headHeight.toFixed(3)} ` +
        `shoulder ${(at('upperArmL')[1] ?? 0).toFixed(3)} eye ${(at('eyeL')[1] ?? 0).toFixed(3)} ` +
        `headTop ${top.toFixed(3)} earTop ${earTop.toFixed(3)} hips ${(at('hips')[1] ?? 0).toFixed(3)} ` +
        `headTop above the seat ${(top - seat).toFixed(3)}`,
    );
  }
}
