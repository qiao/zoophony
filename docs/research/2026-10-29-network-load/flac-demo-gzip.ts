// Gzips the hall impulse response of `dist/assets/` and the default demo of `public/demos/` at
// level 9, after `pnpm build`, and prints the raw size, the gzip size, and their ratio:
//
//   node docs/research/2026-10-29-network-load/flac-demo-gzip.ts
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const ROOT = join(import.meta.dirname, '..', '..', '..');
const flac = readdirSync(join(ROOT, 'dist', 'assets')).find((name) => name.endsWith('.flac'));
for (const path of [join(ROOT, 'dist', 'assets', flac), join(ROOT, 'public', 'demos', 'boulanger-matin.mid')]) {
  const data = readFileSync(path);
  const gzip = gzipSync(data, { level: 9 }).byteLength;
  console.log(`${path.slice(ROOT.length + 1)}: ${data.byteLength} B raw, ${gzip} B gzip, ${((100 * gzip) / data.byteLength).toFixed(1)}%`);
}
