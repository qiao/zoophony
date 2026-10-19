/**
 * Gives the turn of each paw of the timpanist on its forearm over the play samples: the mean
 * angle, the twist around the forearm, and the swing, with the share of the folded samples.
 *
 * Usage, from the root of the tree: node docs/research/2026-10-19-elephant-arms/twist.ts [--step <s>] [--set <changes>] [--demo <file>]
 */
import { Matrix4, Quaternion, Vector3 } from 'three';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
import { FOLD_ROLES, probeFolds } from '../../../tools/fold-probe.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { twistAngle } from '../../../src/models/studio-rig.ts';

const args = process.argv.slice(2);
const option = (name: string, fallback: string): string =>
  args.includes(name) ? (args[args.indexOf(name) + 1] ?? fallback) : fallback;
const step = Number(option('--step', '1'));
if (args.includes('--set')) {
  setHolds(option('--set', ''));
}
const role = FOLD_ROLES.get('timpanist')!;
const index = (name: string): number => STUDIO_BONES.indexOf(name as never);
const m = new Matrix4();
const turnOf = (matrices: ArrayLike<number>, b: number): Quaternion =>
  new Quaternion().setFromRotationMatrix(m.fromArray(Array.from(matrices).slice(b * 16, b * 16 + 16)));
const deg = (r: number): number => (r * 180) / Math.PI;
const sums: Record<string, { n: number; angle: number; twist: number; swing: number; abs: number; upper: number }> = {
  L: { n: 0, angle: 0, twist: 0, swing: 0, abs: 0, upper: 0 },
  R: { n: 0, angle: 0, twist: 0, swing: 0, abs: 0, upper: 0 },
};
let samples = 0;
let folded = 0;
let faces = 0;
let demos = await patchedDemos();
if (args.includes('--demo')) {
  demos = demos.filter((d) => d.file.startsWith(option('--demo', '')));
}
probeFolds(
  role,
  demos,
  step,
  (rig, pose, _posed, foldedFaces, set) => {
    if (set !== 'play') return;
    samples++;
    if (foldedFaces.length > 0) folded++;
    faces += foldedFaces.length;
    const heads = rig.body.heads;
    const chest = turnOf(pose.matrices, index('chest')).invert();
    for (const side of ['L', 'R']) {
      const fore = turnOf(pose.matrices, index(`forearm_${side}`));
      const hand = turnOf(pose.matrices, index(`hand_${side}`));
      const upper = turnOf(pose.matrices, index(`upper_arm_${side}`));
      const rel = fore.clone().invert().multiply(hand);
      const a = new Vector3(...(heads[`forearm_${side}` as never] as [number, number, number]));
      const b = new Vector3(...(heads[`hand_${side}` as never] as [number, number, number]));
      const axis = b.sub(a).normalize();
      const twist = twistAngle(rel, axis);
      const twistQ = new Quaternion().setFromAxisAngle(axis, twist);
      const swing = rel.clone().multiply(twistQ.invert());
      const s = sums[side]!;
      s.n++;
      s.angle += deg(2 * Math.acos(Math.min(1, Math.abs(rel.w))));
      s.twist += deg(twist);
      s.abs += Math.abs(deg(twist));
      s.swing += deg(2 * Math.acos(Math.min(1, Math.abs(swing.w))));
      const up = chest.clone().multiply(upper);
      s.upper += deg(2 * Math.acos(Math.min(1, Math.abs(up.w))));
    }
  },
  ['play'],
);
console.log(`play samples ${samples}, with a fold ${folded} (${((100 * folded) / samples).toFixed(1)}%), face-samples ${faces}`);
for (const side of ['L', 'R']) {
  const s = sums[side]!;
  console.log(
    `${side}: paw on forearm ${(s.angle / s.n).toFixed(0)}°, twist ${(s.twist / s.n).toFixed(0)}° (|twist| ${(s.abs / s.n).toFixed(0)}°), swing ${(s.swing / s.n).toFixed(0)}°, upper arm in the chest ${(s.upper / s.n).toFixed(0)}°`,
  );
}
