// Prints the R paw twist and swing of the bass drummer at a strike, between strikes, and before a
// strike, for each line of stdin: <label>\t<set text>.
// Usage: node docs/research/2026-10-27-badger-beater/scan.ts < <file>
import { readFileSync } from 'node:fs';
import { traceLines } from '../../../tools/arm-check.ts';
import { setHolds } from '../../../tools/hold-sets.ts';

const lines = readFileSync(0, 'utf8').split('\n').filter((l) => l.trim() !== '');
const at = async (from: number): Promise<string> => {
  const out = await traceLines('bass-drummer', { demo: 'percussion-test.mid', from, to: from + 0.01, lift: false }, 0.01);
  const row = out.find((l) => l.startsWith(`| ${from.toFixed(2)}`)) ?? '';
  const cells = row.split('|').map((c) => c.trim());
  return `${cells[7]}/${cells[9]}`;
};
for (const line of lines) {
  const [label, set] = line.split('\t');
  const changes = setHolds(set ?? '');
  try {
    const times = [2.41, 2.6, 3.0, 3.5, 3.55];
    const parts = [];
    for (const t of times) parts.push(await at(t));
    console.log(`${label}: twist/swing at ${times.join(', ')}: ${parts.join('  ')}`);
  } finally {
    changes.undo();
  }
}
