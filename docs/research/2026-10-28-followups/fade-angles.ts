import { armSamples, parseRaiseArgs, studioAxes } from '../../../tools/raise-fit.ts';
import { turnAngle } from '../../../tools/fold-probe.ts';
import type { Quat } from '../../../src/models/tuples.ts';
const opts = parseRaiseArgs(process.argv.slice(2, -1));
const samples = await armSamples(opts);
const rule = JSON.parse(process.argv.at(-1)!) as Quat;
const bySet = new Map<string, number[]>();
for (const s of samples) {
  const a = turnAngle(studioAxes(s.keys.upper), rule);
  (bySet.get(s.set) ?? bySet.set(s.set, []).get(s.set)!).push(a);
}
for (const [set, list] of bySet) {
  list.sort((x, y) => x - y);
  const q = (p: number) => list[Math.floor(p * (list.length - 1))]!.toFixed(1);
  console.log(set, list.length, 'min', q(0), 'p5', q(0.05), 'p50', q(0.5), 'p95', q(0.95), 'under25', list.filter((x) => x < 25).length);
}
