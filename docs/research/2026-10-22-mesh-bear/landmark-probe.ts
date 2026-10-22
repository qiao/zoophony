/**
 * Measures the bear conductor of the app with the baton: the standing shoulder joints, the head
 * height H, the wrists, the eyes, the skull top, the ear tips, the hips, and the lowest point. Usage:
 * node docs/research/2026-10-22-mesh-bear/landmark-probe.ts
 */
import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import type { BoneName } from '../../../src/models/rig.ts';

const m = buildPlayer('bear', 'baton');
const head = boneIndex('head');
const ears = new Set([boneIndex('earL'), boneIndex('earR')]);
let top = -Infinity;
let earTop = -Infinity;
let any = -Infinity;
let low = Infinity;
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
  low = Math.min(low, y);
}
const at = (b: BoneName): readonly number[] => m.skeleton.positions[boneIndex(b)] ?? [];
const f = (v: readonly number[]): string => v.map((x) => x.toFixed(3)).join(', ');
console.log(
  `bear baton ${m.support}: H ${m.body.headHeight.toFixed(3)} shoulderL (${f(at('upperArmL'))}) ` +
    `elbowL (${f(at('forearmL'))}) wristL (${f(at('handL'))}) eye ${(at('eyeL')[1] ?? 0).toFixed(3)} ` +
    `headTop ${top.toFixed(3)} earTop ${earTop.toFixed(3)} top ${any.toFixed(3)} ` +
    `lowest ${low.toFixed(3)} hips ${(at('hips')[1] ?? 0).toFixed(3)} support ${m.support}`,
);
