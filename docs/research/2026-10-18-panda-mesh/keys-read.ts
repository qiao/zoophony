/**
 * Reads the JSON of `keys-dump.ts`. For the named faces and a side, it prints the mean turn of each
 * key over the samples of the named sets in which one of the faces folds (in the axes of the
 * studio, as `raise` of a config of `pnpm rig-mesh` takes it), and the share of the samples with a
 * fold in each cell of 5 degrees of the upper arm key and the elbow key from their means. With
 * `--fade a,b`, it also gives the samples in which a shape at the mean turn of `--by` would have a
 * weight above 0.5, with and without a fold of the faces, and the samples with any weight.
 *
 * Usage, from the root of the tree:
 *
 *     node docs/research/2026-10-18-panda-mesh/keys-read.ts <keys.json> <face>[,<face>]... \
 *       [--side L|R] [--sets play,lift,rest] [--by upper|elbow|wrist] [--fade a,b]
 */
import { readFile } from 'node:fs/promises';
import { Quaternion } from 'three';

interface Sample {
  readonly set: string;
  readonly folded: readonly number[];
  readonly keys: Record<string, Record<string, [number, number, number, number]>>;
  readonly correctives: readonly number[];
}

const args = process.argv.slice(2);
const option = (name: string, fallback: string): string =>
  args.includes(name) ? (args[args.indexOf(name) + 1] ?? fallback) : fallback;
const all: Sample[] = JSON.parse(await readFile(args[0] ?? 'keys.json', 'utf8'));
const faces = new Set((args[1] ?? '').split(',').map(Number));
const side = option('--side', 'R');
const sets = option('--sets', 'play').split(',');
const by = option('--by', 'upper');
const samples = all.filter((s) => sets.includes(s.set));
const q = (v: readonly number[]): Quaternion => new Quaternion(v[0], v[1], v[2], v[3]);
const key = (s: Sample, name: string): Quaternion => q(s.keys[side]?.[name] ?? [0, 0, 0, 1]);
const hit = (s: Sample): boolean => s.folded.some((f) => faces.has(f));
const folded = samples.filter(hit);
const deg = (a: Quaternion, b: Quaternion): number =>
  (2 * Math.acos(Math.min(1, Math.abs(a.dot(b)))) * 180) / Math.PI;
const mean = (name: string): Quaternion => {
  const first = folded[0] ? key(folded[0], name) : new Quaternion();
  const sum = new Quaternion(0, 0, 0, 0);
  for (const s of folded) {
    const t = key(s, name);
    const sign = t.dot(first) < 0 ? -1 : 1;
    sum.set(sum.x + sign * t.x, sum.y + sign * t.y, sum.z + sign * t.z, sum.w + sign * t.w);
  }
  return sum.normalize();
};
const text = (t: Quaternion): string => [t.x, t.y, t.z, t.w].map((v) => v.toFixed(4)).join(', ');
console.log(
  `faces ${[...faces].join(',')}, side ${side}, sets ${sets.join(',')}: ${samples.length} samples, ${folded.length} with a fold (${((100 * folded.length) / Math.max(1, samples.length)).toFixed(1)}%)`,
);
const means: Record<string, Quaternion> = {};
for (const name of ['clavicle', 'upper', 'elbow', 'wrist']) {
  means[name] = mean(name);
  const spread = folded.map((s) => deg(key(s, name), means[name] ?? new Quaternion()));
  const avg = spread.reduce((t, v) => t + v, 0) / Math.max(1, spread.length);
  console.log(
    `mean ${name} turn [${text(means[name])}], ${deg(means[name], new Quaternion()).toFixed(1)} deg from the bind, mean spread of the folds ${avg.toFixed(1)} deg`,
  );
}
const weights = (list: readonly Sample[]): string =>
  (list[0]?.correctives ?? [])
    .map((...[, k]) => (list.reduce((t, s) => t + (s.correctives[k] ?? 0), 0) / Math.max(1, list.length)).toFixed(2))
    .join(' ');
console.log(`mean corrective weights: folded ${weights(folded)}; other ${weights(samples.filter((s) => !hit(s)))}`);
console.log('rows: upper arm angle from its mean; columns: elbow angle from its mean; cell: with a fold / samples');
const width = 5;
const cols = 8;
const rows = new Map<number, Map<number, [number, number]>>();
for (const s of samples) {
  const r = Math.min(Math.floor(deg(key(s, 'upper'), means['upper'] ?? new Quaternion()) / width), 12);
  const c = Math.min(Math.floor(deg(key(s, 'elbow'), means['elbow'] ?? new Quaternion()) / width), cols - 1);
  const row = rows.get(r) ?? new Map<number, [number, number]>();
  const cell = row.get(c) ?? [0, 0];
  row.set(c, [cell[0] + (hit(s) ? 1 : 0), cell[1] + 1]);
  rows.set(r, row);
}
console.log(['upper \\ elbow', ...Array.from({ length: cols }, (...[, c]) => `${c * width}-${c === cols - 1 ? '' : (c + 1) * width}`)].join('\t'));
for (const r of [...rows.keys()].toSorted((x, y) => x - y)) {
  const row = rows.get(r);
  const cells = Array.from({ length: cols }, (...[, c]) => {
    const cell = row?.get(c);
    return cell ? `${cell[0]}/${cell[1]}` : '-';
  });
  console.log([`${r * width}-${r === 12 ? '' : (r + 1) * width}`, ...cells].join('\t'));
}
if (args.includes('--fade')) {
  const [full = 20, none = 35] = option('--fade', '20,35').split(',').map(Number);
  const weight = (s: Sample): number => {
    const angle = deg(key(s, by), means[by] ?? new Quaternion());
    const t = Math.min(1, Math.max(0, (none - angle) / (none - full)));
    return t * t * (3 - 2 * t);
  };
  for (const name of sets) {
    const list = all.filter((s) => s.set === name);
    const strong = list.filter((s) => weight(s) > 0.5);
    const any = list.filter((s) => weight(s) > 0);
    console.log(
      `fade ${full},${none} on ${by}, set ${name}: weight above 0.5 in ${strong.length} of ${list.length} (${strong.filter(hit).length} with a fold of the faces), any weight in ${any.length}; folds of the faces ${list.filter(hit).length}`,
    );
  }
}
