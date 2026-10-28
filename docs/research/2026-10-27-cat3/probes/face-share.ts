/**
 * Gives the share of the samples in which each named face folds, for each sample set of the fold
 * probe, and the count of all folded faces of each set (the faces that fold in at least one
 * sample, and the faces that fold in at least 5% of the samples).
 * Usage: node scratch/face-share.ts <role> <faces> [<demo prefix>] [--step <s>] [--set <changes>]
 */
import { FOLD_ROLES, probeFolds } from '../tools/fold-probe.ts';
import { probeDemos } from '../tools/probe-demos.ts';
import { setHolds } from '../tools/hold-sets.ts';

const args = process.argv.slice(2);
const opt = (name: string, fallback: string): string =>
  args.includes(name) ? args[args.indexOf(name) + 1]! : fallback;
const role = FOLD_ROLES.get(args[0]!)!;
const faces = args[1]!.split(',').map(Number);
const prefix = args[2] && !args[2].startsWith('--') ? args[2] : '';
const step = Number(opt('--step', '0.25'));
if (args.includes('--set')) setHolds(opt('--set', ''));
const demos = (await probeDemos()).filter((d) => d.file.startsWith(prefix));
const samples: Record<string, number> = {};
const counts: Record<string, Map<number, number>> = {};
probeFolds(role, demos, step, (_rig, _studio, _posed, folded, set) => {
  samples[set] = (samples[set] ?? 0) + 1;
  const map = (counts[set] ??= new Map());
  for (const f of folded) map.set(f, (map.get(f) ?? 0) + 1);
});
for (const set of Object.keys(samples)) {
  const n = samples[set]!;
  const map = counts[set]!;
  const named = faces.map((f) => `${f} ${((100 * (map.get(f) ?? 0)) / n).toFixed(1)}%`).join(', ');
  const any = [...map.values()].length;
  const five = [...map.values()].filter((c) => c / n >= 0.05).length;
  console.log(`${set} (${n}): ${named}; faces with a fold ${any}, in 5% or more ${five}`);
}
