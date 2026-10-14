/**
 * Runs the measure of `pnpm hold-reach rabbit` with hold changes in memory, one variant for each
 * argument, and prints the scale of the violin by the rule of a violin shop. Usage:
 *
 *     node docs/research/2026-10-13-rabbit-mesh/reach-set.ts '<set>' ['<set>']...
 */
import { setHolds } from '../../../tools/hold-sets.ts';
import { holdReachLines } from '../../../tools/hold-reach.ts';

for (const set of process.argv.slice(2)) {
  const changes = setHolds(set);
  const lines = holdReachLines('rabbit', 'violin', 'chair');
  const scroll = lines.find((line) => line.includes('to the scroll')) ?? '';
  const rule = lines.find((line) => line.includes('scale 0.') && line.includes('violin 0.')) ?? '';
  console.log(`${changes.text || 'base'}:\n  ${scroll.trim()}\n  rule: ${rule.trim()}`);
  changes.undo();
}
