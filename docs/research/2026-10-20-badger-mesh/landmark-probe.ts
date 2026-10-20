/**
 * Measures the parametric badger of the app with each percussion part: the standing shoulder
 * joints, the head height H, the eyes, the head top, the ear tips, and the hips.
 * Usage: node docs/research/2026-10-20-badger-mesh/landmark-probe.ts
 */
import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import type { BoneName } from '../../../src/models/rig.ts';

for (const instrument of ['bass-drum', 'snare-drum', 'cymbals', 'small-percussion', 'xylophone'] as const) {
  const m = buildPlayer('badger', instrument, 4, 'stand');
  const head = boneIndex('head');
  const ears = new Set([boneIndex('earL'), boneIndex('earR')]);
  let top = -Infinity;
  let earTop = -Infinity;
  for (let c = 0; c < m.mesh.bones.length; c++) {
    const y = m.mesh.positions[c * 3 + 1] ?? 0;
    const bone = m.mesh.bones[c] ?? -1;
    if (bone === head) top = Math.max(top, y);
    if (ears.has(bone)) earTop = Math.max(earTop, y);
  }
  const at = (b: BoneName): readonly number[] => m.skeleton.positions[boneIndex(b)] ?? [];
  const f = (v: readonly number[]): string => v.map((x) => x.toFixed(3)).join(', ');
  console.log(
    `badger ${instrument} stand: H ${m.body.headHeight.toFixed(3)} shoulderL (${f(at('upperArmL'))}) ` +
      `wristL (${f(at('handL'))}) eye ${(at('eyeL')[1] ?? 0).toFixed(3)} headTop ${top.toFixed(3)} ` +
      `earTop ${earTop.toFixed(3)} hips ${(at('hips')[1] ?? 0).toFixed(3)} support ${m.support}`,
  );
}
