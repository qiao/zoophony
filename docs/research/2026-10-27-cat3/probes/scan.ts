/**
 * Scans variants of the holds on the violist sweep in one process: for each variant, the deepest
 * point of named pairs over the sample sets of chosen demos (each n-th play sample), the share of
 * the samples over the limit of each pair, and the reached fingerboard and bow hair of the cat.
 * Usage: node scratch/scan.ts --pairs <set>:<part>:<obstacle>,... [--demos a,b] [--every <n>]
 *   [--variant <name>=<changes>]... [--base]
 * A changes text is the text of `--set`, with `;` between the changes. `--base` adds the row with
 * no change.
 */
import { probeDemos } from '../tools/probe-demos.ts';
import { setHolds } from '../tools/hold-sets.ts';
import { sceneOf } from '../src/pose/test-scene.ts';
import { sweepDepths, depthLimit } from '../src/pose/test-sweep.ts';
import { SWEEP_ROLES } from '../src/pose/test-sweep-roles.ts';
import type { SweepSample } from '../src/pose/test-sweep.ts';

const args = process.argv.slice(2);
const all = (n: string): string[] => args.flatMap((a, i) => (a === n ? [args[i + 1]!] : []));
const opt = (n: string, f: string): string => (args.includes(n) ? args[args.indexOf(n) + 1]! : f);
const pairs = opt('--pairs', 'play:upper arms:body').split(',').map((p) => p.split(':') as [string, string, string]);
const demoNames = opt('--demos', '').split(',').filter(Boolean);
const every = Number(opt("--every", "1"));
const at = opt("--at", "").split(",").filter(Boolean).map((s) => { const [d, t] = s.split("@"); return [d!, Number(t)] as const; });
const variants: [string, string][] = all('--variant').map((v) => {
  const i = v.indexOf('=');
  return [v.slice(0, i), v.slice(i + 1)];
});
if (args.includes('--base')) variants.unshift(['base', '']);
const role = SWEEP_ROLES['violist'];
const demos = (await probeDemos()).filter((d) => demoNames.length === 0 || demoNames.some((n) => d.file.startsWith(n)));
const sets = [...new Set(pairs.map((p) => p[0]))];
const header = ['variant', ...pairs.map((p) => `${p[0]} ${p[1]}>${p[2]}`), 'stop', 'bow'];
console.log(`| ${header.join(' | ')} |`);
console.log(`|${header.map(() => '---').join('|')}|`);
for (const [name, changes] of variants) {
  const held = changes ? setHolds(changes) : null;
  try {
    const best = new Map<string, { depth: number; at: string; n: number; over: number }>();
    let stop = '';
    let bow = '';
    for (const demo of demos) {
      const scene = sceneOf(demo.bytes);
      if (!role.hasRole(scene.score)) continue;
      for (const player of role.players(scene)) {
        const index = Number(player.name.split(' ')[1]);
        const note = scene.plan.players[index]!.note;
        if (note.family === 'bowed' && !stop) {
          stop = note.rig.stopRange.map((v) => v.toFixed(2)).join('-');
          bow = note.rig.bowRange.map((v) => v.toFixed(3)).join('-');
        }
        for (const set of role.sampleSets(scene)) {
          if (!sets.includes(set.name)) continue;
          const samples = (set.name === "play" ? set.samples.filter((_, i) => i % every === 0) : [...set.samples]).filter((s) => at.length === 0 || at.some(([d, t]) => demo.file.startsWith(d) && Math.abs((set.name === "play" ? s[0] : s[1]) - t) < 0.01));
          const depths = sweepDepths(role, player, samples as SweepSample[], undefined, (pair) => depthLimit(role, pair, set.name).depth);
          for (const [s, part, into] of pairs) {
            if (s !== set.name) continue;
            const d = depths.find((p) => p.part === part && p.into === into);
            if (!d) continue;
            const key = `${s} ${part}>${into}`;
            const old = best.get(key) ?? { depth: 0, at: '', n: 0, over: 0 };
            old.n += d.samples ?? 0;
            old.over += d.over ?? 0;
            if (d.depth > old.depth) {
              old.depth = d.depth;
              old.at = `${demo.file.replace('.mid', '')} ${s === 'play' ? d.song.toFixed(2) : `w${d.wall.toFixed(1)}`}`;
            }
            best.set(key, old);
          }
        }
      }
    }
    const cells = pairs.map(([s, part, into]) => {
      const b = best.get(`${s} ${part}>${into}`);
      return b ? `${(100 * b.depth).toFixed(2)} (${((100 * b.over) / Math.max(1, b.n)).toFixed(1)}%) ${b.at}` : '-';
    });
    console.log(`| ${name} | ${cells.join(' | ')} | ${stop} | ${bow} |`);
  } finally {
    held?.undo();
  }
}
