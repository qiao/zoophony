import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { gzip } from 'node:zlib';

import { INDEX_FILE } from '../src/audio/preset-index.ts';
import type { PresetFileEntry } from '../src/audio/preset-index.ts';

/** The folder of the demo files in the site (design 8.3). */
const DEMOS_DIR = 'demos';

/** The zlib level of the gzip files: the smallest output. The output is the same on each run. */
const GZIP_LEVEL = 9;

/** The gzip function of Node zlib, which runs in the thread pool of libuv. */
const gzipAsync = promisify(gzip);

/** The size of one file before and after the gzip. */
interface FileSizes {
  /** The size before the gzip, in bytes. */
  readonly plain: number;
  /** The size after the gzip, in bytes. */
  readonly gzip: number;
}

/** The counts and the sizes of the files that {@link gzipSiteAudio} wrote. */
export interface GzipSummary {
  /** The number of files. */
  readonly files: number;
  /** The sum of the sizes before the gzip, in bytes. */
  readonly plainBytes: number;
  /** The sum of the sizes after the gzip, in bytes. */
  readonly gzipBytes: number;
}

/**
 * Tells if bytes start with the two bytes of a gzip member, `1f 8b` (RFC 1952). An SF3 file
 * starts with `RIFF`, and a MIDI file with `MThd`.
 *
 * @param data The bytes.
 * @returns True for gzip data.
 */
export function isGzip(data: Uint8Array): boolean {
  return data[0] === 0x1f && data[1] === 0x8b;
}

/**
 * Gzips one file in place, with the same name. A file that is gzip data already stays as it is,
 * so a second run changes nothing.
 *
 * @param path The path of the file.
 * @returns The size before and after the gzip, in bytes.
 */
async function gzipInPlace(path: string): Promise<FileSizes> {
  const data = await readFile(path);
  if (isGzip(data)) {
    return { plain: data.byteLength, gzip: data.byteLength };
  }
  const packed = await gzipAsync(data, { level: GZIP_LEVEL });
  await writeFile(path, packed);
  return { plain: data.byteLength, gzip: packed.byteLength };
}

/**
 * Gzips the preset files of `sf/` and the demo files of `demos/` in a built site, in place and
 * with the same names (design 6.2, 7.2). GitHub Pages sends these types with no gzip, and the
 * client removes the gzip layer (`src/audio/plain-bytes.ts`). The function also writes the gzip
 * size of each preset into `sf/index.json`. Thus the load ring counts the bytes that arrive
 * against the sizes of the files that the host sends.
 *
 * @param outDir The output folder of the build, such as `dist/`.
 * @returns The counts and the sizes of the files.
 * @throws Error if the site has no preset index, no preset file of an entry, or no demo folder.
 */
export async function gzipSiteAudio(outDir: string): Promise<GzipSummary> {
  const indexPath = join(outDir, INDEX_FILE);
  // SAFETY: tools/split-soundfont.ts writes this file as an array of PresetFileEntry.
  const index = JSON.parse(await readFile(indexPath, 'utf8')) as PresetFileEntry[];
  const demos = (await readdir(join(outDir, DEMOS_DIR)))
    .filter((name) => name.endsWith('.mid'))
    .map((name) => join(outDir, DEMOS_DIR, name));

  const presetSizes = await Promise.all(
    index.map((entry) => gzipInPlace(join(outDir, entry.file))),
  );
  const demoSizes = await Promise.all(demos.map((path) => gzipInPlace(path)));
  const entries: PresetFileEntry[] = [];
  for (const [i, entry] of index.entries()) {
    entries.push({ ...entry, size: presetSizes[i]?.gzip ?? entry.size });
  }
  await writeFile(indexPath, `${JSON.stringify(entries)}\n`);

  const sizes = [...presetSizes, ...demoSizes];
  return {
    files: sizes.length,
    plainBytes: sizes.reduce((sum, size) => sum + size.plain, 0),
    gzipBytes: sizes.reduce((sum, size) => sum + size.gzip, 0),
  };
}
