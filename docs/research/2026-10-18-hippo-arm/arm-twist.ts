/**
 * Prints the swing and the twist of the upper arm of each side of a fold role, in the play, the
 * lift, and the rest of `pnpm fold-probe`. The swing is the angle of the upper arm from its bind
 * direction, in the axes of the chest. The twist is the angle of the rest of the turn around the
 * bind direction of the upper arm (the swing and twist split). The elbow is the angle between the
 * upper arm and the forearm. The fore column is the twist of the paw on the forearm. The folds count the folded faces of each side (the side of the middle
 * of the face in the bind pose), with no face of the head.
 *
 * Usage, from the root of the tree:
 *
 *     node docs/research/2026-10-18-hippo-arm/arm-twist.ts [--role <role>] [--step <s>] \
 *       [--set <changes>] [--bins]
 *
 * `--bins` adds the share of the samples in each bin of 30 degrees of the twist of the paw.
 */
import { Matrix4, Quaternion, Vector3 } from 'three';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
import { twistAngle } from '../../../src/models/studio-rig.ts';
import { FOLD_ROLES, faceSide, mainBone, probeFolds } from '../../../tools/fold-probe.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { setHolds } from '../../../tools/hold-sets.ts';

const args = process.argv.slice(2);
const option = (name: string, fallback: string): string =>
  args.includes(name) ? (args[args.indexOf(name) + 1] ?? fallback) : fallback;
const step = Number(option('--step', '1'));
const role = FOLD_ROLES.get(option('--role', 'bassist'));
if (!role) {
  throw new Error('No role.');
}
if (args.includes('--set')) {
  setHolds(option('--set', ''));
}
const index = (name: string): number => STUDIO_BONES.indexOf(name as never);
const m = new Matrix4();
const turnOf = (matrices: ArrayLike<number>, b: number): Quaternion =>
  new Quaternion().setFromRotationMatrix(
    m.fromArray(Array.from(matrices).slice(b * 16, b * 16 + 16)),
  );
const DEG = 180 / Math.PI;
type Row = {
  set: string;
  swing: number;
  twist: number;
  elbow: number;
  fore: number;
  /** The folded faces of the side, by the side of the middle of the face in the bind pose. */
  folds: number;
};
const rows: Record<string, Row[]> = { L: [], R: [] };
probeFolds(role, await patchedDemos(), step, (rig, pose, _posed, folded, set) => {
  const chest = turnOf(pose.matrices, index('chest')).invert();
  for (const side of ['L', 'R'] as const) {
    const arm = rig.arms[side];
    const upper = turnOf(pose.matrices, index(`upper_arm_${side}`));
    const fore = turnOf(pose.matrices, index(`forearm_${side}`));
    const hand = turnOf(pose.matrices, index(`hand_${side}`));
    const local = chest.clone().multiply(upper);
    const bindDir = new Vector3(...arm.upper);
    const posedDir = bindDir.clone().applyQuaternion(local);
    const twist = twistAngle(local, bindDir) * DEG;
    const swing = bindDir.angleTo(posedDir) * DEG;
    const upperWorld = new Vector3(...arm.upper).applyQuaternion(upper);
    const foreWorld = new Vector3(...arm.fore).applyQuaternion(fore);
    const elbow = 180 - upperWorld.angleTo(foreWorld) * DEG;
    const relative = fore.clone().invert().multiply(hand);
    const foreTwist = twistAngle(relative, new Vector3(...arm.fore)) * DEG;
    const folds = folded.filter(
      (f) => faceSide(rig.mesh, f) === side && !mainBone(rig.mesh, f).startsWith('head'),
    ).length;
    rows[side]?.push({ set, swing, twist, elbow, fore: foreTwist, folds });
  }
});
const pct = (values: number[], p: number): number => {
  const sorted = values.toSorted((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0;
};
for (const side of ['L', 'R'] as const) {
  for (const set of ['rest', 'play', 'lift']) {
    const list = (rows[side] ?? []).filter((r) => r.set === set);
    if (list.length === 0) {
      continue;
    }
    const cols = (['swing', 'twist', 'elbow', 'fore'] as const).map((k) => {
      const v = list.map((r) => r[k]);
      return `${k} ${pct(v, 0.05).toFixed(0)}/${pct(v, 0.5).toFixed(0)}/${pct(v, 0.95).toFixed(0)}`;
    });
    const withFold = list.filter((r) => r.folds > 0).length;
    const mean = list.reduce((t, r) => t + r.folds, 0) / list.length;
    const most = Math.max(...list.map((r) => r.folds));
    console.log(
      `${side} ${set} (${list.length}): ${cols.join('  ')}  (5%/50%/95%, deg); folds ${((100 * withFold) / list.length).toFixed(1)}%, mean ${mean.toFixed(1)}, most ${most}`,
    );
    if (args.includes('--bins')) {
      // The share of the samples in each bin of 30 degrees of the twist of the paw on the forearm.
      const bins = Array.from({ length: 12 }, () => 0);
      for (const r of list) {
        bins[Math.min(11, Math.floor((r.fore + 180) / 30))]! += 1;
      }
      console.log(
        `  paw twist bins from -180 deg by 30: ${bins.map((b) => ((100 * b) / list.length).toFixed(0)).join(' ')} (%)`,
      );
    }
  }
}
