/**
 * Measures the parametric deer of the app with the harp: the standing shoulder joints, the head
 * height H, the wrists, the eyes, the skull top (the highest vertex of the head bone within
 * 0.03 m of the middle plane, below the antlers), the top of the head bone with the antlers, the
 * ear tips, and the hips, standing and on the stool. Usage:
 * node docs/research/2026-10-21-mesh-deer/landmark-probe.ts
 */
import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import type { BoneName } from '../../../src/models/rig.ts';

for (const support of ['stand', 'stool'] as const) {
  const m = buildPlayer('deer', 'harp', 4, support);
  const head = boneIndex('head');
  const ears = new Set([boneIndex('earL'), boneIndex('earR')]);
  let skull = -Infinity;
  let top = -Infinity;
  let earTop = -Infinity;
  for (let c = 0; c < m.mesh.bones.length; c++) {
    const x = m.mesh.positions[c * 3] ?? 0;
    const y = m.mesh.positions[c * 3 + 1] ?? 0;
    const bone = m.mesh.bones[c] ?? -1;
    if (bone === head) {
      top = Math.max(top, y);
      if (Math.abs(x) <= 0.03) {
        skull = Math.max(skull, y);
      }
    }
    if (ears.has(bone)) {
      earTop = Math.max(earTop, y);
    }
  }
  const at = (b: BoneName): readonly number[] => m.skeleton.positions[boneIndex(b)] ?? [];
  const f = (v: readonly number[]): string => v.map((x) => x.toFixed(3)).join(', ');
  console.log(
    `deer harp ${support}: H ${m.body.headHeight.toFixed(3)} shoulderL (${f(at('upperArmL'))}) ` +
      `wristL (${f(at('handL'))}) eye ${(at('eyeL')[1] ?? 0).toFixed(3)} skullTop ${skull.toFixed(3)} ` +
      `antlerTop ${top.toFixed(3)} earTop ${earTop.toFixed(3)} hips ${(at('hips')[1] ?? 0).toFixed(3)} ` +
      `support ${m.support}`,
  );
}
