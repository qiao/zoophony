// Scans rest places of the flute of the tan fox and prints the reach of each palm at rest.
import { execFileSync } from 'node:child_process';
import { setHolds } from '../../../tools/hold-sets.ts';
import { fluteReach } from '../../../tools/hold-reach.ts';
const rows: string[] = [];
for (const top of [[-0.08, 0.80, -0.48], [-0.04, 0.78, -0.48], [-0.02, 0.76, -0.45], [0.0, 0.80, -0.45], [-0.06, 0.74, -0.50]]) {
  for (const axis of [[0.22, -0.5, 0.0], [0.2, -0.5, 0.1], [0.15, -0.5, 0.05], [0.25, -0.45, 0.1]]) {
    const sets = execFileSync('node', ['docs/research/2026-10-14-fox-flute/rest-sets.ts', ...top.map(String), ...axis.map(String)], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const { undo } = setHolds(sets);
    try {
      const r = fluteReach('fox-tan', 'chair');
      rows.push(`top ${top.join(',')} axis ${axis.join(',')}: L spare ${(r.L.arm - r.L.rest).toFixed(3)} R spare ${(r.R.arm - r.R.rest).toFixed(3)} | ${sets.split(';')[1]}`);
    } finally {
      undo();
    }
  }
}
console.log(rows.join('\n'));
