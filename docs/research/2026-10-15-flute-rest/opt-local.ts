// (1+1) hill climb of the whole rest around a start, with the depth limits of the lift and the lowering.
import { evaluate, lastDetail } from './opt.ts';
import type { Params } from './opt.ts';
import { random, seed } from './rng.ts';
seed(Number(process.argv[5] ?? 7));
const n = Number(process.argv[2] ?? 100);
let best: Params = JSON.parse(process.argv[3]!);
const g = () => { let s = 0; for (let i = 0; i < 6; i++) s += random(); return s - 3; };
const r2 = (x: number) => Math.round(x * 100) / 100;
function costOf(m: Record<string, number>): number {
  const lim = 1.45;
  const bad = ['restDepth', 'liftDepth', 'lowerDepth'].reduce((a, k) => a + Math.max(0, m[k]! - lim), 0)
    + Math.max(0, m.restFlute! - 0.8) + Math.max(0, m.liftFlute! - 1.0) + Math.max(0, m.lowerFlute! - 1.0)
    + Math.max(0, m.fluteGap! - 1.0) + Math.max(0, m.pawGap! - 1.0) + Math.max(0, m.tilt! - 10) * 0.2
    + 20 * Math.max(0, (m.reachL ?? 0) - 0.995);
  if (process.argv[4] === 'mid') {
    const footBad = Math.max(0, Math.abs(m.footX!) - 5) + Math.max(0, 3.5 - m.footY!);
    return 10 * bad + 2 * footBad + 3 * Math.max(0, m.folds! - 13) + 0.1 * m.folds! + 0.2 * m.tilt!;
  }
  if (process.argv[4] === 'top') {
    const footBad = Math.max(0, Math.abs(m.footX!) - 4) + Math.max(0, 5 - m.footY!);
    return 10 * bad + 3 * Math.max(0, m.folds! - 13) + 2 * footBad + 0.1 * m.folds!;
  }
  return m.folds! + 10 * bad;
}
let m0 = await evaluate(best, 'beethoven-8', ['rest', 'lift', 'lower']);
let bestCost = costOf(m0);
console.log('start', bestCost.toFixed(2), JSON.stringify(m0));
for (let i = 0; i < n; i++) {
  const p: Params = structuredClone(best);
  const k = process.env.LEFT_ONLY ? 3 + Math.floor(random() * 3) : Math.floor(random() * 6);
  const s = 0.5;
  if (k === 0) { p.shift = p.shift.map((v) => r2(v + 0.04 * s * g())) as Params['shift']; }
  if (k === 1) { p.keysAngle = Math.round(p.keysAngle + 15 * g()); p.down = Math.min(90, Math.round(p.down + 2 * g())); p.lean = Math.round(p.lean + 20 * g()); }
  if (k === 2) { p.poleR = [r2(p.poleR[0] + 0.15 * g()), -1, r2(p.poleR[2] + 0.2 * g())]; }
  if (k === 3) { p.along = r2(p.along + 0.03 * g()); p.off = p.off.map((v) => r2(v + 0.04 * g())) as Params['off']; }
  if (k === 4) { p.palm = [r2(p.palm[0] + 0.15 * g()), -1, r2(p.palm[2] + 0.15 * g())]; p.fingers = [r2(p.fingers[0] + 0.2 * g()), r2(p.fingers[1] + 0.2 * g()), -1]; }
  if (k === 5) { p.poleL = [r2(p.poleL[0] + 0.1 * g()), -1, r2(p.poleL[2] + 0.2 * g())]; p.arc = p.arc.map((v) => r2(v + 0.1 * g())) as Params['arc']; }
  const m = await evaluate(p, 'beethoven-8', ['rest', 'lift', 'lower']);
  const c = costOf(m);
  if (c <= bestCost) {
    best = p; bestCost = c; m0 = m;
    console.log(i, c.toFixed(2), `folds ${m.folds} L${m.left} R${m.right} O${m.other} depth ${m.restDepth!.toFixed(2)}/${m.liftDepth!.toFixed(2)}/${m.lowerDepth!.toFixed(2)} flute ${m.restFlute!.toFixed(1)}/${m.liftFlute!.toFixed(1)}/${m.lowerFlute!.toFixed(1)} gaps ${m.fluteGap!.toFixed(1)} ${m.pawGap!.toFixed(1)} reach ${(m.reachL ?? 0).toFixed(3)} tilt ${m.tilt!.toFixed(1)} foot ${m.footX!.toFixed(1)},${m.footY!.toFixed(1)},${m.footZ!.toFixed(1)}`);
  }
}
console.log('BEST', JSON.stringify(best));
console.log(JSON.stringify(m0), JSON.stringify(lastDetail));
