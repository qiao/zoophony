/**
 * Measures the bytes of each part of the packed mesh of a studio body module, raw and after gzip
 * of its base64, and the gzip of the mesh without the part. Usage:
 *
 *     node docs/research/2026-10-13-rabbit-mesh/module-parts.ts [src/models/studio/rabbit.ts]
 */
import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { byteReader, readByte, readVarint } from '../../../src/models/packed-bytes.ts';

const file = process.argv[2] ?? 'src/models/studio/rabbit.ts';
const text = readFileSync(file, 'utf8');
const mesh = /mesh:\s*'([^']+)'/.exec(text)?.[1] ?? '';
const r = byteReader(mesh);
const marks: [string, number][] = [];
const nv = readVarint(r),
  nt = readVarint(r),
  nc = readVarint(r),
  ns = readVarint(r);
marks.push(['counts', r.at]);
for (let i = 0; i < nv * 3; i++) readVarint(r);
marks.push(['positions', r.at]);
for (let v = 0; v < nv; v++) {
  const c = readByte(r);
  for (let k = 0; k < c * 2; k++) readByte(r);
}
marks.push(['skin', r.at]);
for (let i = 0; i < nt * 3; i++) readVarint(r);
marks.push(['corners', r.at]);
for (let i = 0; i < nc; i++) {
  readVarint(r);
  readVarint(r);
  readVarint(r);
  readByte(r);
}
marks.push(['palette', r.at]);
for (let i = 0; i < nt; i++) readVarint(r);
marks.push(['color index', r.at]);
const moved: number[] = [];
for (let s = 0; s < ns; s++) {
  const m = readVarint(r);
  moved.push(m);
  for (let k = 0; k < m; k++) {
    readVarint(r);
    readVarint(r);
    readVarint(r);
    readVarint(r);
  }
  marks.push([`shape ${s} (${m} vertices)`, r.at]);
}
const gz = (b: Uint8Array) => gzipSync(Buffer.from(b).toString('base64'), { level: 9 }).length;
console.log(`file ${file}: vertices ${nv}, triangles ${nt}, colors ${nc}, shapes ${ns}`);
console.log(
  `whole mesh: ${r.bytes.length} B raw, ${gz(r.bytes)} B gzip of base64; module gzip ${gzipSync(text, { level: 9 }).length} B`,
);
let from = 0;
for (const [name, to] of marks) {
  const part = r.bytes.subarray(from, to);
  // The gain when the part is gone: gzip of the mesh without it.
  const rest = new Uint8Array([...r.bytes.subarray(0, from), ...r.bytes.subarray(to)]);
  console.log(
    `${name.padEnd(28)} ${String(part.length).padStart(7)} B raw ${String(gz(part)).padStart(7)} B gzip alone, mesh gzip without it ${gz(rest)}`,
  );
  from = to;
}
