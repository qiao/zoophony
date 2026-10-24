/**
 * Runs the move set of the arm gate (`probeMoves()` of `tools/arm-check.ts`) for one role with
 * hold changes, and prints the worst move twist and move turn of each arm with their labels, and
 * the number of samples over the limits.
 *
 * Usage: node docs/research/2026-10-24-violin-poses/moves-eval.ts <role> [--set <changes>] [--demo <id>]...
 */
import { probeMoves } from '../../../tools/arm-check.ts';
import { FOLD_ROLES } from '../../../tools/fold-probe.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { probeDemos } from '../../../tools/probe-demos.ts';

const args = process.argv.slice(2);
const role = args[0] ?? 'violinist';
const pick = (flag: string): string[] =>
  args.flatMap((arg, i) => (args[i - 1] === flag ? [arg] : []));
const changes = pick('--set');
if (changes.length > 0) {
  setHolds(changes.join(';'));
}
const wanted = pick('--demo').map((d) => (d.endsWith('.mid') ? d : `${d}.mid`));
const all = await probeDemos();
const demos = wanted.length > 0 ? all.filter((d) => wanted.includes(d.file)) : all;
const source = FOLD_ROLES.get(role);
if (!source) {
  throw new Error(`no role ${role}`);
}
const samples = probeMoves(source, demos);
for (const side of ['L', 'R'] as const) {
  const twist = samples.values[side].moveTwist;
  const turn = samples.values[side].moveTurn;
  let wt = 0;
  let wr = 0;
  for (let i = 0; i < twist.length; i++) {
    if ((twist[i] ?? 0) > (twist[wt] ?? 0)) wt = i;
    if ((turn[i] ?? 0) > (turn[wr] ?? 0)) wr = i;
  }
  const over = turn.filter((v) => v > 3000).length;
  const sorted = [...turn].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(0.95 * (sorted.length - 1))] ?? 0;
  console.log(
    `${role} ${side}: twist max ${(twist[wt] ?? 0).toFixed(0)} at ${samples.labels[wt]} | turn max ${(turn[wr] ?? 0).toFixed(0)} at ${samples.labels[wr]} | turn p95 ${p95.toFixed(0)} | over 3000: ${over} of ${turn.length}`,
  );
}
