// Checks the gzip files of the build against their sources, after `pnpm build`:
//
//   node docs/research/2026-10-29-network-load/gzip-equal.ts
//
// For each preset file of `public/sf/` and each demo file of `public/demos/`, it checks that:
// - the file of `dist/` starts with the gzip bytes 1f 8b,
// - the gunzip of the file of `dist/` equals the source byte for byte,
// - a new gzip of the source at level 9 equals the file of `dist/` (the output is deterministic),
// - the size of the entry in `dist/sf/index.json` equals the size of the file of `dist/`.
// It prints one line for each failure, then the counts and the totals. The exit code is 1 after a
// failure.
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';

const ROOT = join(import.meta.dirname, '..', '..', '..');
const PUBLIC = join(ROOT, 'public');
const DIST = join(ROOT, 'dist');

/** Lists the files below a folder whose names end with a suffix. */
function filesOf(dir, suffix) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(suffix))
    .map((entry) => join(entry.parentPath, entry.name))
    .toSorted();
}

const sources = [...filesOf(join(PUBLIC, 'sf'), '.sf3'), ...filesOf(join(PUBLIC, 'demos'), '.mid')];
const index = JSON.parse(readFileSync(join(DIST, 'sf', 'index.json'), 'utf8'));
const indexSizes = new Map(index.map((entry) => [entry.file, entry.size]));
const failures = [];
let plainBytes = 0;
let gzipBytes = 0;
let presets = 0;
for (const source of sources) {
  const path = relative(PUBLIC, source);
  const plain = readFileSync(source);
  const built = readFileSync(join(DIST, path));
  plainBytes += plain.byteLength;
  gzipBytes += built.byteLength;
  if (built[0] !== 0x1f || built[1] !== 0x8b) {
    failures.push(`${path}: no gzip header`);
    continue;
  }
  if (!gunzipSync(built).equals(plain)) {
    failures.push(`${path}: the gunzip differs from the source`);
  }
  if (!gzipSync(plain, { level: 9 }).equals(built)) {
    failures.push(`${path}: a new gzip at level 9 differs from the built file`);
  }
  if (path.endsWith('.sf3')) {
    presets += 1;
    if (indexSizes.get(path) !== built.byteLength) {
      failures.push(`${path}: index size ${indexSizes.get(path)}, file size ${built.byteLength}`);
    }
  }
}
if (index.length !== presets) {
  failures.push(`dist/sf/index.json has ${index.length} entries for ${presets} preset files`);
}

for (const failure of failures) {
  console.log(`FAIL ${failure}`);
}
console.log(
  `${sources.length} files (${presets} presets, ${sources.length - presets} demos): ` +
    `${plainBytes.toLocaleString('en-US')} B plain, ${gzipBytes.toLocaleString('en-US')} B gzip. ` +
    `${failures.length} failures.`,
);
process.exitCode = failures.length > 0 ? 1 : 0;
