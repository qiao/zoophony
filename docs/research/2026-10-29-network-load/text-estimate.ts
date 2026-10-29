// Estimates two open candidates of the first download, after `pnpm build`:
//
//   node docs/research/2026-10-29-network-load/text-estimate.ts
//
// 1. Brotli: the entry JS chunk, the CSS, and the renderer chunk of `dist/`, with the gzip of the
//    load probe (Node zlib, default level, as `tools/load-probe.ts` sends them) and with brotli at
//    quality 11 (the best).
// 2. The packed meshes: each base64 string of `src/models/studio/*.ts` that is longer than 200
//    characters, gzipped as base64 text (default level), and decoded to binary and gzipped at
//    level 9 (a binary file of the build, as the preset files are now).
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const ROOT = join(import.meta.dirname, '..', '..', '..');
const DIST = join(ROOT, 'dist');
const format = (value) => `${value.toLocaleString('en-US')} B`;

const assets = readdirSync(join(DIST, 'assets'));
const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const entry = /src="[^"]*assets\/(index-[^"]+\.js)"/.exec(html)?.[1];
const css = /href="[^"]*assets\/(index-[^"]+\.css)"/.exec(html)?.[1];
const renderer = assets.find((name) => /^renderer-.*\.js$/.test(name));
let gzipTotal = 0;
let brotliTotal = 0;
for (const name of [entry, css, renderer]) {
  const data = readFileSync(join(DIST, 'assets', name));
  const gzip = gzipSync(data).byteLength;
  const brotli = brotliCompressSync(data, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: data.byteLength },
  }).byteLength;
  gzipTotal += gzip;
  brotliTotal += brotli;
  console.log(`${name}: ${format(data.byteLength)} raw, ${format(gzip)} gzip, ${format(brotli)} brotli`);
}
console.log(`brotli total: ${format(gzipTotal)} gzip, ${format(brotliTotal)} brotli, ${format(brotliTotal - gzipTotal)}`);

const studio = join(ROOT, 'src', 'models', 'studio');
const strings = [];
for (const name of readdirSync(studio).filter((file) => file.endsWith('.ts')).toSorted()) {
  const text = readFileSync(join(studio, name), 'utf8');
  for (const match of text.matchAll(/'([A-Za-z0-9+/=]{200,})'/g)) {
    strings.push(match[1]);
  }
}
const base64 = Buffer.from(strings.join(''), 'utf8');
const binary = Buffer.concat(strings.map((value) => Buffer.from(value, 'base64')));
const textGzip = gzipSync(base64).byteLength;
const binaryGzip = gzipSync(binary, { level: 9 }).byteLength;
console.log(
  `packed meshes: ${strings.length} strings, ${format(base64.byteLength)} base64, ${format(textGzip)} gzip of the text, ` +
    `${format(binary.byteLength)} binary, ${format(binaryGzip)} gzip of the binary, ${format(binaryGzip - textGzip)}`,
);
