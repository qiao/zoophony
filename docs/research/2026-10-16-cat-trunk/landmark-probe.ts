/**
 * Prints the standing and the seated joints of the cat, the red fox, and the rabbit with 4
 * decimals: the seat, the hips, the shoulders, the trunk from the hips to the shoulders, the neck,
 * the eyes, the head top, the ear tips, and the head height H. Usage, from the root of the
 * worktree:
 *
 *     node docs/research/2026-10-16-cat-trunk/landmark-probe.ts
 */
import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import type { BoneName } from '../../../src/models/rig.ts';

for (const [species, instrument] of [
  ['cat', 'viola'],
  ['fox-red', 'violin'],
  ['rabbit', 'violin'],
] as const) {
  for (const support of ['stand', 'chair'] as const) {
    const m = buildPlayer(species, instrument, 4, support);
    const at = (b: BoneName): number => m.skeleton.positions[boneIndex(b)]?.[1] ?? NaN;
    const ears = new Set([boneIndex('earL'), boneIndex('earR')]);
    const head = boneIndex('head');
    let earTop = -Infinity;
    let top = -Infinity;
    for (let c = 0; c < m.mesh.bones.length; c++) {
      const y = m.mesh.positions[c * 3 + 1] ?? 0;
      if (ears.has(m.mesh.bones[c] ?? -1)) earTop = Math.max(earTop, y);
      if ((m.mesh.bones[c] ?? -1) === head) top = Math.max(top, y);
    }
    console.log(
      `${species} ${support}: seat ${(m.seat?.seatHeight ?? 0).toFixed(4)} hips ${at('hips').toFixed(4)} shoulders ${at('upperArmL').toFixed(4)} trunk ${(at('upperArmL') - at('hips')).toFixed(4)} neck ${at('neck').toFixed(4)} eyes ${at('eyeL').toFixed(4)} headTop ${top.toFixed(4)} ears ${earTop.toFixed(4)} H ${m.body.headHeight.toFixed(4)}`,
    );
  }
}
