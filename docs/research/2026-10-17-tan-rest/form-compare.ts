/**
 * Compares two JSON files of `node tools/rig-form.ts --player fox-red:violin --player
 * fox-tan:flute --json <file>`: the footprint of each player and the stage side of each demo.
 * `form-main.json` comes from the tree with the chair of design 4.5 (the commit of the pose, with
 * the chair change stashed), and `form-branch.json` from the tree with the wider chair. Usage, from
 * the root of the worktree:
 *
 *     node docs/research/2026-10-17-tan-rest/form-compare.ts <main.json> <branch.json>
 */
import { readFileSync } from 'node:fs';
const a = JSON.parse(readFileSync(process.argv[2]!, 'utf8'));
const b = JSON.parse(readFileSync(process.argv[3]!, 'utf8'));
for (const [i, p] of a.players.entries()) {
  const q = b.players[i];
  console.log(`${p.species}: width ${p.width.toFixed(4)} -> ${q.width.toFixed(4)} m, depth ${p.depth.toFixed(4)} -> ${q.depth.toFixed(4)} m, seat ${p.seat} -> ${q.seat}`);
}
for (const [i, s] of a.stages.entries()) {
  const t = b.stages[i];
  console.log(`${s.demo}: ${s.side.toFixed(3)} -> ${t.side.toFixed(3)} m (${(((t.side - s.side) / s.side) * 100).toFixed(2)}%)`);
}
