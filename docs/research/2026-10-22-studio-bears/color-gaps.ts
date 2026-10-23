// Prints the color distances between the matte faces that share an edge, for a studio body.
import { FINISH_ORDER } from '../src/models/mesh.ts';
import { studioRigOf } from '../src/models/studio-body.ts';
const name = (process.argv[2] ?? 'studio-bear') as Parameters<typeof studioRigOf>[0];
const { mesh } = studioRigOf(name, false);
const matte = FINISH_ORDER.indexOf('matte');
const { corners, colors, finishes } = mesh;
const edges = new Map<string, number[]>();
for (let t = 0; t < corners.length / 3; t++) {
  for (let k = 0; k < 3; k++) {
    const a = corners[t * 3 + k] ?? 0;
    const b = corners[t * 3 + ((k + 1) % 3)] ?? 0;
    const key = a < b ? `${a} ${b}` : `${b} ${a}`;
    const list = edges.get(key) ?? [];
    list.push(t);
    edges.set(key, list);
  }
}
const toSrgb = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
const gaps: number[] = [];
for (const [, faces] of edges) {
  const [f, g] = faces;
  if (f === undefined || g === undefined || finishes[f] !== matte || finishes[g] !== matte) continue;
  let d = 0;
  for (let c = 0; c < 3; c++) {
    d = Math.max(d, Math.abs(toSrgb(colors[f * 3 + c] ?? 0) - toSrgb(colors[g * 3 + c] ?? 0)));
  }
  gaps.push(d);
}
gaps.sort((a, b) => a - b);
const q = (p: number) => gaps[Math.floor(p * (gaps.length - 1))]?.toFixed(3);
console.log(name, 'edges', gaps.length, 'p10', q(0.1), 'p50', q(0.5), 'p75', q(0.75), 'p90', q(0.9), 'p95', q(0.95), 'p99', q(0.99), 'max', q(1));
const hist = [0.02, 0.04, 0.06, 0.08, 0.1, 0.15, 0.2, 0.3, 0.5];
console.log(hist.map((h) => `<${h}: ${gaps.filter((g) => g < h).length}`).join(', '));
