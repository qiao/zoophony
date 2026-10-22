// The variants of the dense pack of the report 2026-10-21-load-performance.md: it reads the packed
// meshes of 0bd2e24a in scratch/base/ (see pack-probe.ts) and prints the gzip size of the base64
// text of each variant, summed over the 18 bodies. K sets the count of recent corners (8).
// Usage: node docs/research/2026-10-21-load-performance/pack-variants.ts
// sCur: 0bd2e24a. sSplit: one stream for each kind of number. sDrop: with no last weight.
// sV2: corners with the next new vertex. sV3: with the eight recent corners. sF1: sV3 in LEB128 only.
// The p suffix: the corner codes in two byte planes.
import { gzipSync } from 'node:zlib';
import { readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const dir = new URL('../../../scratch/base/src/models/studio/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.ts'));
function rv(bytes: Uint8Array, at: { i: number }): number { let v = 0, s = 1; for (;;) { const b = bytes[at.i++]!; v += (b & 0x7f) * s; if (b < 0x80) return v; s *= 128; } }
function w(out: number[], v: number) { if (v < 0 || !Number.isInteger(v)) throw new Error('bad ' + v); while (v >= 0x80) { out.push((v % 128) | 0x80); v = Math.floor(v / 128); } out.push(v); }
const zz = (v: number) => (v < 0 ? -2 * v - 1 : 2 * v);
const uz = (v: number) => (v % 2 === 0 ? v / 2 : -(v + 1) / 2);
const gz = (s: string) => gzipSync(Buffer.from(s)).length;
const b64 = (b: number[]) => Buffer.from(Uint8Array.from(b)).toString('base64');
const vs = (arr: number[]) => { const o: number[] = []; for (const x of arr) w(o, x); return o; };
const planes2 = (arr: number[]) => { const lo: number[] = [], hi: number[] = []; for (const x of arr) { if (x >= 65536) throw new Error('big'); lo.push(x & 255); hi.push(x >> 8); } return [...lo, ...hi]; };
const tot: Record<string, number> = {};
const add = (k: string, v: number) => { tot[k] = (tot[k] ?? 0) + v; };
for (const f of files) {
  const mod = await import(pathToFileURL(new URL(f, dir).pathname).href);
  const body = Object.values(mod)[0] as { mesh: string };
  const bytes = Uint8Array.from(Buffer.from(body.mesh, 'base64'));
  const at = { i: 0 };
  const vc = rv(bytes, at), tc = rv(bytes, at), cc = rv(bytes, at), kc = rv(bytes, at);
  const P: number[][] = [[], [], []];
  for (let v = 0; v < vc; v++) for (let a = 0; a < 3; a++) P[a]!.push(rv(bytes, at));
  const cnt: number[] = [], bones: number[] = [], wts: number[] = [], wtsDrop: number[] = [];
  for (let v = 0; v < vc; v++) { const c = bytes[at.i++]!; cnt.push(c); for (let k = 0; k < c; k++) { bones.push(bytes[at.i++]!); const wt = bytes[at.i++]!; wts.push(wt); if (k < c - 1) wtsDrop.push(wt); } }
  const cz: number[] = []; for (let c = 0; c < tc * 3; c++) cz.push(rv(bytes, at));
  const colorsStart = at.i; for (let c = 0; c < cc; c++) { rv(bytes, at); rv(bytes, at); rv(bytes, at); at.i++; }
  const colorBytes = Array.from(bytes.subarray(colorsStart, at.i));
  const tcol: number[] = []; for (let t = 0; t < tc; t++) tcol.push(rv(bytes, at));
  const corrStart = at.i; const corrBytes = Array.from(bytes.subarray(corrStart));
  // corrective split
  const at2 = { i: corrStart }; const cIdx: number[] = [], cD: number[][] = [[], [], []], cM: number[] = [];
  for (let k = 0; k < kc; k++) { const m = rv(bytes, at2); cM.push(m); for (let j = 0; j < m; j++) { cIdx.push(rv(bytes, at2)); for (let a = 0; a < 3; a++) cD[a]!.push(rv(bytes, at2)); } }
  // absolute corners
  const corners: number[] = []; let prev = 0; for (const z of cz) { prev += uz(z); corners.push(prev); }
  // V2 hwm
  const v2: number[] = []; { let hwm = -1, p = 0; for (const c of corners) { if (c === hwm + 1) { v2.push(0); hwm = c; } else { v2.push(1 + zz(c - p)); if (c > hwm) hwm = c; } p = c; } }
  // V3 MRU cache of 8 + hwm
  const K = Number(process.env.K ?? 8);
  const v3: number[] = []; { let hwm = -1, p = 0; const mru: number[] = []; for (const c of corners) { const i = mru.indexOf(c); if (i >= 0) { v3.push(i); mru.splice(i, 1); } else if (c === hwm + 1) { v3.push(K); } else { v3.push(K + 1 + zz(c - p)); } mru.unshift(c); if (mru.length > K) mru.pop(); if (c > hwm) hwm = c; p = c; } }
  const head = vs([vc, tc, cc, kc]);
  const base = (cornerStream: number[], skin: number[][]) => [...head, ...P.flatMap(planes2), ...skin.flat(), ...cornerStream, ...colorBytes, ...tcol, ...cM, ...planes2(cIdx), ...cD.flatMap(vs)];
  const sCur = gz(body.mesh);
  const sSplit = gz(b64(base(planes2(cz), [cnt, bones, wts])));
  const sDrop = gz(b64(base(planes2(cz), [cnt, bones, wtsDrop])));
  const sV2 = gz(b64(base(vs(v2), [cnt, bones, wtsDrop])));
  const sV2p = gz(b64(base(planes2(v2), [cnt, bones, wtsDrop])));
  const sV3 = gz(b64(base(vs(v3), [cnt, bones, wtsDrop])));
  const sV3p = gz(b64(base(planes2(v3), [cnt, bones, wtsDrop])));
  const baseV = (cornerStream: number[], skin: number[][]) => [...head, ...P.flatMap(vs), ...skin.flat(), ...cornerStream, ...colorBytes, ...tcol, ...cM, ...vs(cIdx), ...cD.flatMap(vs)];
  const sF1 = gz(b64(baseV(vs(v3), [cnt, bones, wtsDrop])));
  const r = { f, sCur, sSplit, sDrop, sV2, sV2p, sV3, sV3p, sF1 };
  for (const [k, v] of Object.entries(r)) if (typeof v === 'number') add(k, v);
}
console.log(JSON.stringify(tot));
