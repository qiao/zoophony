import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { licenseDocument, packageEntries } from './licenses.ts';

describe('licenseDocument', () => {
  it('writes a section with the title, license, source, and text of each entry', () => {
    const text = licenseDocument([
      {
        title: 'three 0.180.0',
        license: 'MIT',
        source: 'https://threejs.org/',
        text: 'MIT text\n\n',
      },
      {
        title: 'GeneralUser GS 2.0.3',
        license: 'GeneralUser GS License v2.0',
        source: 'https://example.org/',
        text: 'GS text',
      },
    ]);
    expect(text).toContain('three 0.180.0 (MIT)\nhttps://threejs.org/\n');
    expect(text).toContain('\n\nMIT text\n\n====');
    expect(text.endsWith('GS text\n')).toBe(true);
    expect(text.indexOf('three 0.180.0')).toBeLessThan(text.indexOf('GeneralUser GS 2.0.3'));
  });
});

describe('packageEntries', () => {
  const root = join(import.meta.dirname, '..');

  it('reads the license entry of an installed package', async () => {
    const [entry] = await packageEntries(root, ['three']);

    expect(entry?.title).toMatch(/^three \d/);
    expect(entry?.license).toBe('MIT');
  });

  it('fails when a package is not installed (design 7.3)', async () => {
    await expect(packageEntries(root, ['three', 'no-such-package'])).rejects.toThrow(
      'no-such-package is not installed',
    );
  });
});
