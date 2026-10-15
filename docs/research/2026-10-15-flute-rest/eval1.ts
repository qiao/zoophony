import { evaluate, lastDetail } from './opt.ts';
import type { Params } from './opt.ts';
const base: Params = {keysAngle:118,down:79,lean:-129,shift:[0.9,-0.77,0.3],poleR:[0.31,-1,0.1],along:0.66,off:[-0.39,-0.13,0.1],palm:[0.68,-1,0.17],fingers:[-0.28,0.17,-1],poleL:[-0.15,-1,0.63],arc:[0,0.2,0.4]};
const changes: Partial<Params>[] = JSON.parse(process.argv[2] ?? '[{}]');
const sets = (process.argv[3] ?? 'rest').split(',');
const demo = process.argv[4] ?? 'beethoven-8';
for (const c of changes) {
  const m = await evaluate({ ...base, ...c }, demo, sets);
  const f = Object.entries(m).map(([k, v]) => `${k} ${Number.isInteger(v) ? v : v.toFixed(1)}`).join(' ');
  console.log(JSON.stringify(c), '\n   ', f, '\n   ', JSON.stringify(lastDetail));
}
