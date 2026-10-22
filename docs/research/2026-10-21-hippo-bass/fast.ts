// A fast sweep of the bassist for hold variants: each arm bone and the contrabass, in the body and
// in the contrabass, over every n-th play sample and the rest, lift, and lower samples, with the
// reached fingerboard and hair. Usage: node docs/research/2026-10-21-hippo-bass/fast.ts <file of sets, one for each line>
//   [--demo <id>] [--every <n>]
import { readFileSync } from 'node:fs';
import { bowRangeOf, bowedRig, holdOf, stopRangeOf } from '../../../src/pose/bowed-rig.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { sweepDepths } from '../../../src/pose/test-sweep.ts';
import type { RoleSweep, SweepPart } from '../../../src/pose/test-sweep.ts';
import { BASSIST_SWEEP, INSTRUMENT_PART } from '../../../src/pose/test-sweep-roles.ts';
import { scoreOf } from '../../../src/score/test-score.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
const args = process.argv.slice(2);
const opt = (n: string, d: string): string => { const i = args.indexOf(n); return i >= 0 ? (args[i + 1] ?? d) : d; };
const sets = ['', ...readFileSync(args[0] ?? '', 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))];
const every = Number(opt('--every', '6'));
const demos = opt('--demo', 'beethoven-1').split(',');
const files = await patchedDemos();
const bones = ['handL', 'handR', 'forearmL', 'forearmR', 'upperArmL', 'upperArmR'] as const;
const parts: SweepPart[] = [...bones.map((b) => ({ name: b, bones: [b] })), INSTRUMENT_PART];
const role: RoleSweep = { ...BASSIST_SWEEP, parts };
for (const set of sets) {
  const undo = set ? setHolds(set) : null;
  const worst = new Map<string, { depth: number; over: number; n: number }>();
  for (const id of demos) {
    const demo = files.find((d) => d.file.startsWith(id))!;
    const scene = sceneOf(demo.bytes);
    const [player] = role.players(scene);
    for (const { name, samples } of role.sampleSets(scene)) {
      const list = [...samples].filter((_, i) => name !== 'play' || i % every === 0);
      const goal = (p: { part: string }): number => (p.part === 'instrument' ? 0.02 : 0.015);
      for (const pair of sweepDepths(role, player!, list, undefined, goal)) {
        const key = `${name === 'play' ? 'play' : 'move'} ${pair.part}>${pair.into === 'contrabass' ? 'cb' : 'body'}`;
        const w = worst.get(key) ?? { depth: 0, over: 0, n: 0 };
        worst.set(key, { depth: Math.max(w.depth, pair.depth), over: w.over + (pair.over ?? 0), n: w.n + (pair.samples ?? 0) });
      }
    }
  }
  const rig = bowedRig((sceneOf((files.find((d) => d.file.startsWith(demos[0]!)))!.bytes), role.players(sceneOf(files.find((d) => d.file.startsWith(demos[0]!))!.bytes))[0]!.model), 'contrabass', holdOf('hippo', 'contrabass'));
  const s = stopRangeOf(rig), b = bowRangeOf(rig);
  const cells = [...worst].filter(([, w]) => w.depth > 0.005).toSorted((a, b2) => a[0].localeCompare(b2[0])).map(([k, w]) => `${k} ${(w.depth * 100).toFixed(1)}/${((100 * w.over) / Math.max(1, w.n)).toFixed(0)}%`);
  console.log(`${set || 'base'}\n  stop ${s.map((x) => x.toFixed(2)).join('-')} bow ${b.map((x) => x.toFixed(3)).join('-')} | ${cells.join(' | ')}`);
  undo?.undo();
}
