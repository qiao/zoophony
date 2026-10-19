/**
 * Writes the keys of the arms of the first seated player of a fold role in each sample of
 * `pnpm fold-probe` (the rest, the play at each step, and the lift) as JSON: for each side, the
 * turns of the clavicle and the upper arm in the axes of the chest, of the forearm from the upper
 * arm, and of the paw from the forearm, in the axes of the studio, with the folded faces and the
 * corrective weights of the sample. `keys-read.ts` reads the file.
 *
 * Usage, from the root of the tree:
 *
 *     node docs/research/2026-10-19-elephant-mesh/keys-dump.ts <out.json> [--role <role>] [--step <s>] \
 *       [--set <changes>]
 *
 * `--set` changes the holds in memory, as `pnpm pose-depth --set` does (`setHolds()`).
 */
import { writeFile } from 'node:fs/promises';
import { Matrix4, Quaternion } from 'three';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
import { FOLD_ROLES, probeFolds } from '../../../tools/fold-probe.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { setHolds } from '../../../tools/hold-sets.ts';

const args = process.argv.slice(2);
const option = (name: string, fallback: string): string =>
  args.includes(name) ? (args[args.indexOf(name) + 1] ?? fallback) : fallback;
const out = args[0] ?? 'keys.json';
const step = Number(option('--step', '1'));
const role = FOLD_ROLES.get(option('--role', 'cellist'));
if (!role) {
  throw new Error('No role.');
}
if (args.includes('--set')) {
  setHolds(option('--set', ''));
}
const index = (name: string): number => STUDIO_BONES.indexOf(name as never);
const m = new Matrix4();
const turnOf = (matrices: ArrayLike<number>, b: number): Quaternion =>
  new Quaternion().setFromRotationMatrix(m.fromArray(Array.from(matrices).slice(b * 16, b * 16 + 16)));
const studio = (q: Quaternion): number[] => [-q.x, q.y, -q.z, q.w].map((v) => Number(v.toFixed(5)));
const samples: unknown[] = [];
probeFolds(role, await patchedDemos(), step, (_rig, pose, _posed, folded, set) => {
  const chest = turnOf(pose.matrices, index('chest')).invert();
  const keys: Record<string, Record<string, number[]>> = {};
  for (const side of ['L', 'R']) {
    const clav = turnOf(pose.matrices, index(`clavicle_${side}`));
    const upper = turnOf(pose.matrices, index(`upper_arm_${side}`));
    const fore = turnOf(pose.matrices, index(`forearm_${side}`));
    const hand = turnOf(pose.matrices, index(`hand_${side}`));
    keys[side] = {
      clavicle: studio(chest.clone().multiply(clav)),
      upper: studio(chest.clone().multiply(upper)),
      elbow: studio(upper.clone().invert().multiply(fore)),
      wrist: studio(fore.clone().invert().multiply(hand)),
    };
  }
  samples.push({
    set,
    folded,
    keys,
    correctives: Array.from(pose.correctives).map((v) => Number(v.toFixed(3))),
  });
});
await writeFile(out, JSON.stringify(samples));
console.log(`${samples.length} samples into ${out}`);
