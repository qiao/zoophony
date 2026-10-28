/**
 * Gives the depth of named pairs of the violist sweep in each sample of the sample sets, with the
 * bow state of the sample: the share of the bow range (0 at the frog, 1 at the tip), the string,
 * the pizzicato share, and the weight of the playing pose. It prints the samples over a goal, the
 * deepest first, and a histogram of the deep samples by the bow share.
 * Usage: node scratch/depth-seq.ts <pairs> [<demo prefix>] [--sets play,lift,rest,lower]
 *   [--goal <cm>] [--top <n>] [--set <changes>]
 * A pair is `<part>:<obstacle>`, such as `upper arms:body`.
 */
import { MathUtils } from 'three';

import { probeDemos } from '../tools/probe-demos.ts';
import { setHolds } from '../tools/hold-sets.ts';
import { sceneOf } from '../src/pose/test-scene.ts';
import { sweepDepths } from '../src/pose/test-sweep.ts';
import { SWEEP_ROLES } from '../src/pose/test-sweep-roles.ts';
import { bowStateAt, createBowState } from '../src/pose/strokes.ts';

const args = process.argv.slice(2);
const opt = (n: string, f: string): string => (args.includes(n) ? args[args.indexOf(n) + 1]! : f);
if (args.includes('--set')) setHolds(opt('--set', ''));
const pairs = args[0]!.split(',').map((p) => p.split(':') as [string, string]);
const prefix = args[1] && !args[1].startsWith('--') ? args[1] : '';
const sets = opt('--sets', 'play').split(',');
const goal = Number(opt('--goal', '1.5')) / 100;
const top = Number(opt("--top", "15"));
const at = opt("--at", "").split(",").filter(Boolean).map((s) => { const [d, t] = s.split("@"); return [d!, Number(t)] as const; });
const role = SWEEP_ROLES['violist'];
const demos = (await probeDemos()).filter((d) => d.file.startsWith(prefix));
const bow = createBowState();
type Row = { demo: string; set: string; song: number; wall: number; pair: string; depth: number; bone: string; along: number; share: number; string: number; pizz: number };
const rows: Row[] = [];
const totals = new Map<string, { n: number; over: number }>();
for (const demo of demos) {
  const scene = sceneOf(demo.bytes);
  if (!role.hasRole(scene.score)) continue;
  for (const player of role.players(scene)) {
    const index = Number(player.name.split(' ')[1]);
    const plan = scene.plan.players[index]!;
    const note = plan.note;
    for (const set of role.sampleSets(scene)) {
      if (!sets.includes(set.name)) continue;
      for (const sample of set.samples) {
        if (at.length && !at.some(([d, t]) => demo.file.startsWith(d) && Math.abs((set.name === "play" ? sample[0] : sample[1]) - t) < 0.01)) continue;
        const depths = sweepDepths(role, player, [sample]);
        let share = Number.NaN;
        if (note.family === 'bowed') {
          bowStateAt(note.strokes, note.starts, sample[0] - plan.timeOffset, bow);
          const [low, high] = note.rig.bowRange;
          share = MathUtils.clamp((bow.bow - low) / (high - low), 0, 1);
        }
        for (const [part, into] of pairs) {
          const d = depths.find((p) => p.part === part && p.into === into);
          if (!d) continue;
          const key = `${set.name} ${part}>${into}`;
          const t = totals.get(key) ?? { n: 0, over: 0 };
          t.n += 1;
          t.over += d.depth > goal ? 1 : 0;
          totals.set(key, t);
          rows.push({ demo: demo.file.replace('.mid', ''), set: set.name, song: sample[0], wall: sample[1], pair: `${part}>${into}`, depth: d.depth, bone: d.bone ?? '-', along: d.along, share, string: bow.string, pizz: bow.pizzicato });
        }
      }
    }
  }
}
for (const [key, t] of totals) {
  console.log(`${key}: ${t.over} of ${t.n} samples over ${(goal * 100).toFixed(1)} cm (${((100 * t.over) / t.n).toFixed(1)}%), deepest ${(100 * Math.max(...rows.filter((r) => `${r.set} ${r.pair}` === key).map((r) => r.depth))).toFixed(2)} cm`);
}
const deep = rows.filter((r) => r.depth > goal).toSorted((a, b) => b.depth - a.depth);
const shown = [...totals.keys()].flatMap((key) => rows.filter((r) => `${r.set} ${r.pair}` === key).toSorted((a, b) => b.depth - a.depth).slice(0, top));
for (const r of shown) {
  console.log(`  ${r.set} ${r.pair} ${(100 * r.depth).toFixed(2)} cm ${r.demo} song ${r.song.toFixed(2)} wall ${r.wall.toFixed(2)} ${r.bone} ${r.along.toFixed(2)} | bow share ${r.share.toFixed(2)} string ${r.string.toFixed(2)} pizz ${r.pizz.toFixed(2)}`);
}
const bins = new Array(10).fill(0) as number[];
for (const r of deep) if (r.set === 'play') bins[Math.min(9, Math.floor(r.share * 10))]! += 1;
console.log(`play samples over the goal by bow share (0.1 bins): ${bins.join(' ')}`);
