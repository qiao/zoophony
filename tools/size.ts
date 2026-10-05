import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

import type { Manifest } from 'vite';

/** Limit of the first download after gzip, in bytes (design 7.2). */
export const SIZE_LIMIT_BYTES = 1_000_000;

/** One file of the first download, with its sizes in bytes. */
export interface DownloadPart {
  /** Path relative to the repository root. */
  readonly path: string;
  readonly gzipBytes: number;
}

/** Lines of the size report, and the verdict of the limit. */
export interface SizeReport {
  readonly lines: readonly string[];
  /** True if the gzip total is at most the limit. */
  readonly pass: boolean;
}

/**
 * Lists the output files of an entry chunk, its static imports, and their CSS, in the order of
 * a depth-first walk. Each file appears once.
 *
 * @param manifest The Vite build manifest.
 * @param entry The manifest key of the entry, such as `index.html`.
 * @returns The file paths, relative to the output directory.
 * @throws Error if the manifest has no chunk for the entry or for one of its imports.
 */
export function staticChunkFiles(manifest: Manifest, entry: string): string[] {
  const files = new Set<string>();
  const visited = new Set<string>();
  const visit = (key: string): void => {
    if (visited.has(key)) {
      return;
    }
    visited.add(key);
    const chunk = manifest[key];
    if (!chunk) {
      throw new Error(`The Vite manifest has no chunk "${key}".`);
    }
    files.add(chunk.file);
    for (const css of chunk.css ?? []) {
      files.add(css);
    }
    for (const imported of chunk.imports ?? []) {
      visit(imported);
    }
  };
  visit(entry);
  return [...files];
}

/**
 * Formats one line for each part, then the total and the limit.
 *
 * @param parts The files of the first download.
 * @param limitBytes The limit of the gzip total, in bytes.
 * @returns The report lines and the verdict.
 */
export function sizeReport(parts: readonly DownloadPart[], limitBytes: number): SizeReport {
  const bytes = (value: number): string => `${value.toLocaleString('en-US')} B`.padStart(12);
  const total = parts.reduce((sum, part) => sum + part.gzipBytes, 0);
  const pass = total <= limitBytes;
  const lines = [
    'First download after gzip (design 7.2):',
    ...parts.map((part) => `${bytes(part.gzipBytes)}  ${part.path}`),
    `${bytes(total)}  total`,
    `${bytes(limitBytes)}  limit: ${pass ? 'pass' : 'FAIL'}`,
  ];
  return { lines, pass };
}

async function measure(root: string, path: string): Promise<DownloadPart> {
  const data = await readFile(path);
  return {
    path: relative(root, path),
    gzipBytes: gzipSync(data).byteLength,
  };
}

async function main(): Promise<void> {
  const root = join(import.meta.dirname, '..');
  const dist = join(root, 'dist');
  const manifestText = await readFile(join(dist, '.vite', 'manifest.json'), 'utf8');
  // SAFETY: Vite writes this file in the format of its Manifest type (build.manifest).
  const manifest = JSON.parse(manifestText) as Manifest;
  // Step 7 puts the changed demo 1 into the site. Until then, the size check counts the source.
  const builtDemo = join(dist, 'demos', 'beethoven-5.mid');
  const demo = existsSync(builtDemo) ? builtDemo : join(root, 'demos', 'src', 'beethoven-5.mid');
  const paths = [
    join(dist, 'index.html'),
    ...staticChunkFiles(manifest, 'index.html').map((file) => join(dist, file)),
    demo,
  ];
  const parts = await Promise.all(paths.map((path) => measure(root, path)));
  const report = sizeReport(parts, SIZE_LIMIT_BYTES);
  console.log(report.lines.join('\n'));
  if (!report.pass) {
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  await main();
}
