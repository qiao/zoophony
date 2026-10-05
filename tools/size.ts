import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

import type { Manifest } from 'vite';

import { DEMOS_DIR } from './patch-demos.ts';

/** Limit of the first download after gzip, in bytes (design 7.2). */
const SIZE_LIMIT_BYTES = 1_000_000;

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
 * Lists the built assets that an HTML file loads with a `<script src>` or a `<link href>`. Vite
 * puts the module preload polyfill of a build with several entries into a shared chunk that the
 * HTML loads, but the manifest entry of the HTML file does not import it.
 *
 * @param html The text of the built HTML file.
 * @returns The paths relative to the output directory, from the `assets/` folder of Vite.
 */
export function htmlAssetFiles(html: string): string[] {
  const files: string[] = [];
  for (const match of html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+)"/g)) {
    const url = match[1] ?? '';
    const at = url.indexOf('assets/');
    if (at >= 0 && !/^[a-z]+:/i.test(url)) {
      files.push(url.slice(at));
    }
  }
  return files;
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
  // The build writes the changed demo 1 to dist/demos/. With no such file, the check counts the
  // source (design 7.2).
  const builtDemo = join(dist, 'demos', 'beethoven-5.mid');
  const demo = existsSync(builtDemo) ? builtDemo : join(DEMOS_DIR, 'src', 'beethoven-5.mid');
  const html = await readFile(join(dist, 'index.html'), 'utf8');
  const files = new Set([...staticChunkFiles(manifest, 'index.html'), ...htmlAssetFiles(html)]);
  const paths = [join(dist, 'index.html'), ...[...files].map((file) => join(dist, file)), demo];
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
