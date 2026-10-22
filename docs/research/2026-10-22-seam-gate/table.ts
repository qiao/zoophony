/** Builds the table of the report from the outputs of the probes. Usage: node scratch/table.ts */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
const q = (xs: number[], f: number): number => { const t = xs.toSorted((a, b) => a - b); return t[Math.min(t.length - 1, Math.floor(f * t.length))] ?? 0; };
const SPECIES: Record<string, string> = { conductor: 'bear', pianist: 'polar bear', harpist: 'deer', violinist: 'rabbit', 'fox-violinist': 'red fox', violist: 'cat', cellist: 'dog', bassist: 'hippo', flutist: 'tan fox', trombonist: 'panda', oboist: 'mouse', timpanist: 'elephant', bassoonist: 'beaver', hornist: 'pig', clarinetist: 'wolf', trumpeter: 'monkey', tubist: 'rhino', singer: 'penguin', 'bass-drummer': 'badger', 'snare-drummer': 'badger', cymbalist: 'badger', percussionist: 'badger', xylophonist: 'badger' };
const BAD = new Set(['5593e92b-conductor', 'main-conductor', 'main-trombonist', 'main-harpist', 'main-cellist', '7c1747ed-violinist']);
const GOOD = new Set(['main-fox-violinist', 'main-flutist', 'main-violist', 'main-bass-drummer', 'main-snare-drummer', 'main-cymbalist', 'main-percussionist', 'main-xylophonist', 'main-clarinetist', 'main-trumpeter', 'main-hornist', 'main-oboist', 'main-bassist', 'main-timpanist', 'main-bassoonist', 'main-singer']);
const gaps = readFileSync('docs/research/2026-10-22-seam-gate/gaps.txt', 'utf8');
const ex = (state: string, key: string): string => {
  const file = `scratch/ex/${state}.json`;
  if (!existsSync(file)) return '-';
  const rows: { set: string; side: string; m: Record<string, number> }[] = JSON.parse(readFileSync(file, 'utf8'));
  let best = 0;
  for (const set of ['rest', 'play', 'lift']) for (const side of ['L', 'R']) {
    const xs = rows.filter((r) => r.set === set && r.side === side).map((r) => r.m[key] ?? 0);
    if (xs.length) best = Math.max(best, q(xs, 0.95));
  }
  return best.toFixed(0);
};
const flap = (state: string): string => {
  const file = `scratch/flap/${state}.txt`;
  if (!existsSync(file)) return '-';
  const line = readFileSync(file, 'utf8').split('\n').find((l) => l.startsWith('| play'));
  const cells = line?.split('|').map((c) => c.trim()) ?? [];
  const own = [cells[7], cells[8]].map((c) => Number(c?.split('/')[0] ?? 0));
  return Math.max(...own).toFixed(0);
};
const ray = (state: string): string => {
  const file = `scratch/ray/${state}.txt`;
  if (!existsSync(file)) return '-';
  const vals = readFileSync(file, 'utf8').split('\n').filter((l) => /^[LR] n/.test(l)).map((l) => Number(/notch0\.1 \d+\/(\d+)/.exec(l)?.[1] ?? 0));
  return vals.length ? Math.max(...vals).toFixed(0) : '-';
};
const join = (state: string): string => {
  const role = state.replace(/^[^-]+-/, '');
  const animal = { 'polar bear': 'polar-bear', 'red fox': 'fox', 'tan fox': 'fox' }[SPECIES[role]!] ?? SPECIES[role]!;
  if (!state.startsWith('main')) return '-';
  const block = gaps.split('\n').findIndex((l) => l === `${animal}:`);
  const line = gaps.split('\n')[block + 1] ?? '';
  const ends = [...line.matchAll(/join [\d.]+ to ([\d.]+)/g)].map((m) => Number(m[1]));
  return ends.length ? Math.max(...ends).toFixed(2) : '-';
};
const states = readdirSync('scratch/ex').filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));
console.log('| State | Species | Known | Down area own p50 cm² | Turned 60° p95 cm² | Concave 90° edges p95 cm | Notch 0.1 p95 cm² | Join end |');
console.log('|---|---|---|---:|---:|---:|---:|---:|');
for (const s of states.toSorted((a, b) => Number(BAD.has(b)) - Number(BAD.has(a)) || a.localeCompare(b))) {
  const role = s.replace(/^[^-]+-/, '');
  const known = BAD.has(s) ? 'bad' : GOOD.has(s) ? 'good' : 'open';
  console.log(`| ${s.replace('main-', 'c5fae22c ').replace('-', ' ')} | ${SPECIES[role]} | ${known} | ${flap(s)} | ${ex(s, 'turn60')} | ${ex(s, 'cc90')} | ${ray(s)} | ${join(s)} |`);
}
