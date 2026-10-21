/**
 * Measures the parametric monkey of the app with the trumpet: the standing shoulder joints, the
 * head height H, the wrists, the eyes, the head top, the ear tips, and the hips, standing and on
 * the chair. Usage: node docs/research/2026-10-20-mesh-monkey/landmark-probe.ts
 */
import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import type { BoneName } from '../../../src/models/rig.ts';

for (const support of ['stand', 'chair'] as const) {
  const m = buildPlayer('monkey', 'trumpet', 4, support);
  const head = boneIndex('head');
  const ears = new Set([boneIndex('earL'), boneIndex('earR')]);
  let top = -Infinity;
  let earTop = -Infinity;
  let any = -Infinity;
  for (let c = 0; c < m.mesh.bones.length; c++) {
    const y = m.mesh.positions[c * 3 + 1] ?? 0;
    const bone = m.mesh.bones[c] ?? -1;
    if (bone === head) {
      top = Math.max(top, y);
    }
    if (ears.has(bone)) {
      earTop = Math.max(earTop, y);
    }
    any = Math.max(any, y);
  }
  const at = (b: BoneName): readonly number[] => m.skeleton.positions[boneIndex(b)] ?? [];
  const f = (v: readonly number[]): string => v.map((x) => x.toFixed(3)).join(', ');
  console.log(
    `monkey trumpet ${support}: H ${m.body.headHeight.toFixed(3)} shoulderL (${f(at('upperArmL'))}) ` +
      `wristL (${f(at('handL'))}) eye ${(at('eyeL')[1] ?? 0).toFixed(3)} headTop ${top.toFixed(3)} ` +
      `earTop ${earTop.toFixed(3)} top ${any.toFixed(3)} hips ${(at('hips')[1] ?? 0).toFixed(3)} ` +
      `support ${m.support}`,
  );
}
