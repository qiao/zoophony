import { describe, expect, it } from 'vitest';
import type { Manifest } from 'vite';

import { sizeReport, staticChunkFiles } from './size.ts';

const manifest: Manifest = {
  'index.html': {
    file: 'assets/index.js',
    src: 'index.html',
    isEntry: true,
    css: ['assets/index.css'],
    imports: ['_three.js', '_shared.js'],
    dynamicImports: ['src/audio/player.ts'],
  },
  '_three.js': { file: 'assets/three.js', imports: ['_shared.js'] },
  '_shared.js': { file: 'assets/shared.js', css: ['assets/shared.css'] },
  'src/audio/player.ts': { file: 'assets/player.js', isDynamicEntry: true },
};

describe('staticChunkFiles', () => {
  it('lists the entry, its static imports, and their CSS once each', () => {
    expect(staticChunkFiles(manifest, 'index.html')).toEqual([
      'assets/index.js',
      'assets/index.css',
      'assets/three.js',
      'assets/shared.js',
      'assets/shared.css',
    ]);
  });

  it('skips the dynamic imports', () => {
    expect(staticChunkFiles(manifest, 'index.html')).not.toContain('assets/player.js');
  });

  it('throws for a missing chunk', () => {
    expect(() => staticChunkFiles(manifest, 'gallery.html')).toThrow('gallery.html');
  });
});

describe('sizeReport', () => {
  const parts = [
    { path: 'dist/index.html', gzipBytes: 260 },
    { path: 'demos/src/beethoven-5.mid', gzipBytes: 13_885 },
  ];

  it('prints each part and the gzip total', () => {
    const { lines } = sizeReport(parts, 1_000_000);
    expect(lines).toContain('       260 B  dist/index.html');
    expect(lines).toContain('    14,145 B  total');
  });

  it('passes at the limit', () => {
    expect(sizeReport(parts, 14_145).pass).toBe(true);
  });

  it('fails above the limit', () => {
    const report = sizeReport(parts, 14_144);
    expect(report.pass).toBe(false);
    expect(report.lines.at(-1)).toContain('FAIL');
  });
});
