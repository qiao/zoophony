import { evaluate } from './opt.ts';
import type { Params } from './opt.ts';
import { random } from './rng.ts';
const u = (a: number, b: number) => a + (b - a) * random();
const r2 = (x: number) => Math.round(x * 100) / 100;
const side = process.argv[2] ?? 'left';
const n = Number(process.argv[3] ?? 150);
const leftBest = {"along":0.66,"off":[-0.39,-0.13,0.1],"palm":[0.68,-1,0.17],"fingers":[-0.28,0.17,-1],"poleL":[-0.15,-1,0.63]};
const start: Params = {
  keysAngle: 225, down: 90, lean: 0, shift: [0.6, -0.45, 0.5], poleR: [1, -0.3, 0],
  along: 0.5, off: [-0.3, 0, 0], palm: [0, -1, 0], fingers: [0, 0, -1], poleL: [-1, -0.5, 1], arc: [0, 0.2, 0.4],
};
const results: { p: Params; m: Record<string, number>; cost: number }[] = [];
for (let i = 0; i < n; i++) {
  const p: Params = structuredClone(start);
  if (side === 'left2') {
    p.along = r2(u(0.56, 0.72)); p.off = [r2(u(-0.45, -0.25)), r2(u(-0.3, -0.03)), r2(u(-0.1, 0.1))];
    p.palm = [r2(u(0, 1)), -1, r2(u(-0.3, 0.4))]; p.fingers = [r2(u(-0.5, 0.8)), r2(u(-0.8, 0.3)), -1];
    p.poleL = [r2(u(-0.4, -0.05)), -1, r2(u(-0.2, 0.8))];
  } else if (side === 'left') {
    p.along = r2(u(0.4, 0.7)); p.off = [r2(u(-0.45, 0)), r2(u(-0.3, 0.15)), r2(u(-0.15, 0.1))];
    p.palm = [r2(u(-0.3, 1)), -1, r2(u(-0.5, 0.5))]; p.fingers = [r2(u(-0.5, 0.8)), r2(u(-0.8, 0.3)), -1];
    p.poleL = process.argv[4] === 'down' ? [r2(u(-0.7, -0.1)), -1, r2(u(-0.2, 0.8))] : [-1, r2(u(-1, 0.3)), r2(u(-0.5, 1))];
  } else if (side === 'right2') {
    Object.assign(p, leftBest);
    p.keysAngle = Math.round(u(60, 270)); p.down = Math.round(u(78, 90)); p.lean = Math.round(u(-180, 180));
    p.shift = [r2(u(0.4, 1.0)), r2(u(-0.85, -0.4)), r2(u(0.3, 0.85))]; p.poleR = [r2(u(0.05, 0.4)), -1, r2(u(-0.2, 0.8))];
  } else {
    p.keysAngle = Math.round(u(60, 270)); p.down = Math.round(u(78, 90)); p.lean = Math.round(u(-180, 180));
    p.shift = [r2(u(0.35, 0.8)), r2(u(-0.65, -0.35)), r2(u(0.35, 0.85))]; p.poleR = [1, r2(u(-1, 0.3)), r2(u(-0.5, 1))];
  }
  const m = await evaluate(p);
  const bad = Math.max(0, m.restDepth! - 1.5) + Math.max(0, m.restFlute! - 1.0) + Math.max(0, m.fluteGap! - 1.0) + Math.max(0, m.pawGap! - 1.0);
  const footBad = process.argv[4] === 'top' ? Math.max(0, Math.abs(m.footX!) - 4) + Math.max(0, 5 - m.footY!) + Math.max(0, m.tilt! - 8) : 0;
  const cost = footBad * 2 + (side.startsWith('left') ? m.left! + (process.argv[4] === 'down' ? Math.max(0, m.elbowOut! - 6) : 0) : m.right! + m.other!) + 10 * bad;
  results.push({ p, m, cost });
}
for (const { p, m, cost } of results.toSorted((a, b) => a.cost - b.cost).slice(0, 8)) {
  const f = (o: Record<string, number>) => Object.entries(o).filter(([k]) => !['elbowOut', 'elbowBack', 'pawGap'].includes(k)).map(([k, v]) => `${k} ${Number.isInteger(v) ? v : v.toFixed(1)}`).join(' ');
  console.log(cost.toFixed(1), f(m), JSON.stringify(side.startsWith('left') ? { along: p.along, off: p.off, palm: p.palm, fingers: p.fingers, poleL: p.poleL } : { keysAngle: p.keysAngle, down: p.down, lean: p.lean, shift: p.shift, poleR: p.poleR }));
}
