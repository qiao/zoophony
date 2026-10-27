// Compares the deer studio mesh of main with the tree: the largest move of a vertex, the changed faces.
import { unpackStudioMesh } from '../../src/models/studio-format.ts';
import { STUDIO_DEER as MAIN } from './deer-main.ts';
import { STUDIO_DEER as TREE } from '../../src/models/studio/deer.ts';

const a = unpackStudioMesh(MAIN.mesh, (MAIN as { palette?: string }).palette);
const b = unpackStudioMesh(TREE.mesh, (TREE as { palette?: string }).palette);
console.log(`vertices ${a.positions.length / 3} / ${b.positions.length / 3}, faces ${a.corners.length / 3} / ${b.corners.length / 3}`);
let most = 0;
let at = -1;
let moved = 0;
for (let v = 0; v < Math.min(a.positions.length, b.positions.length) / 3; v++) {
  const d = Math.hypot(...[0, 1, 2].map((k) => a.positions[v * 3 + k]! - b.positions[v * 3 + k]!));
  if (d > 1e-5) moved++;
  if (d > most) { most = d; at = v; }
}
console.log(`largest vertex move ${(most * 1000).toFixed(3)} mm at v${at}, ${moved} vertices move > 0.01 mm`);
let faces = 0;
const changed: number[] = [];
for (let f = 0; f < a.corners.length / 3; f++) {
  const x = [...a.corners.slice(f * 3, f * 3 + 3)].sort().join();
  const y = [...b.corners.slice(f * 3, f * 3 + 3)].sort().join();
  if (x !== y) { faces++; changed.push(f); }
}
console.log(`faces with other corners: ${faces} (${changed.slice(0, 10).join(', ')})`);
let w = 0;
for (let i = 0; i < a.weights.length; i++) if (Math.abs(a.weights[i]! - b.weights[i]!) > 1e-6 || a.joints[i] !== b.joints[i]) w++;
console.log(`weight entries that differ: ${w}`);
for (const [c, corr] of a.correctives.entries()) {
  const other = b.correctives[c]!;
  let m = 0;
  for (let i = 0; i < corr.length; i++) m = Math.max(m, Math.abs(corr[i]! - other[i]!));
  console.log(`corrective ${c}: largest change ${(m * 1000).toFixed(3)} mm`);
}
const key = (m: typeof a, f: number) => [...m.corners.slice(f * 3, f * 3 + 3)].sort((p, q) => p - q).join('-');
const setA = new Set(Array.from({ length: a.corners.length / 3 }, (_, f) => key(a, f)));
const setB = new Set(Array.from({ length: b.corners.length / 3 }, (_, f) => key(b, f)));
console.log(`faces only on main: ${[...setA].filter((k) => !setB.has(k)).join(' ')}; only in the tree: ${[...setB].filter((k) => !setA.has(k)).join(' ')}`);
