import { readFileSync, readdirSync } from 'node:fs';
const dir = process.argv[2]!;
const BAD = ['5593e92b-conductor', 'main-conductor', 'main-trombonist', 'main-harpist', 'main-cellist', '7c1747ed-violinist'];
const GOOD = ['main-fox-violinist', 'main-flutist', 'main-violist', 'main-bass-drummer', 'main-snare-drummer', 'main-cymbalist', 'main-percussionist', 'main-xylophonist', 'main-clarinetist', 'main-trumpeter', 'main-hornist', 'main-oboist', 'main-bassist', 'main-timpanist', 'main-bassoonist', 'main-singer'];
const q = (xs: number[], f: number): number => { const t = xs.toSorted((a, b) => a - b); return t[Math.min(t.length - 1, Math.floor(f * t.length))] ?? 0; };
const val: Record<string, Record<string, number>> = {};
for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const rows: { set: string; side: string; m: Record<string, number> }[] = JSON.parse(readFileSync(`${dir}/${file}`, 'utf8'));
  const name = file.replace('.json', '');
  val[name] = {};
  for (const k of Object.keys(rows[0]!.m)) for (const stat of [0.5, 0.95, 1]) {
    let best = 0;
    for (const set of ['rest', 'play', 'lift']) for (const side of ['L', 'R']) {
      const xs = rows.filter((r) => r.set === set && r.side === side).map((r) => r.m[k] ?? 0);
      if (xs.length) best = Math.max(best, stat === 1 ? Math.max(...xs) : q(xs, stat));
    }
    val[name]![`${k}@${stat}`] = best;
  }
}
for (const key of Object.keys(val['main-fox-violinist']!)) {
  const g = GOOD.filter((n) => val[n]).map((n) => val[n]![key]!);
  const b = BAD.filter((n) => val[n]).map((n) => val[n]![key]!);
  const gmax = Math.max(...g), bmin = Math.min(...b);
  console.log(`${key.padEnd(16)} good max ${gmax.toFixed(1).padStart(8)} bad min ${bmin.toFixed(1).padStart(8)} ${bmin > gmax ? 'SEPARATES' : ''}  bad ${b.map((x) => x.toFixed(0)).join(',')}`);
}
