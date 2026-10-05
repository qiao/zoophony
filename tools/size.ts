import type { Manifest } from 'vite';

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
