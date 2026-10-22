/**
 * Sums up the exploration runs: for each state and side, the p95 of each candidate measure in the
 * worst sample set. Usage: node scratch/ex-sum.ts <dir> [stat p50|p95|max] [keys,...]
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2]!;
const stat = process.argv[3] ?? 'p95';
const keysArg = process.argv[4];
const q = (xs: number[], f: number): number => {
  const t = xs.toSorted((a, b) => a - b);
  return t[Math.min(t.length - 1, Math.floor(f * t.length))] ?? 0;
};
const files = readdirSync(dir).filter((f) => f.endsWith('.json')).toSorted();
let keys: string[] | null = keysArg ? keysArg.split(',') : null;
for (const file of files) {
  const rows: { set: string; side: string; m: Record<string, number> }[] = JSON.parse(
    readFileSync(join(dir, file), 'utf8'),
  );
  keys ??= Object.keys(rows[0]!.m);
  if (file === files[0]) {
    console.log(`| state | ${keys.map((k) => `${k} L/R`).join(' | ')} |`);
  }
  const cell = (k: string, side: string): number => {
    let best = 0;
    for (const set of ['rest', 'play', 'lift']) {
      const xs = rows.filter((r) => r.set === set && r.side === side).map((r) => r.m[k] ?? 0);
      if (xs.length === 0) continue;
      const v = stat === 'max' ? Math.max(...xs) : q(xs, stat === 'p50' ? 0.5 : stat === 'p99' ? 0.99 : 0.95);
      best = Math.max(best, v);
    }
    return best;
  };
  console.log(
    `| ${file.replace('.json', '')} | ${keys.map((k) => `${cell(k, 'L').toFixed(1)} / ${cell(k, 'R').toFixed(1)}`).join(' | ')} |`,
  );
}
