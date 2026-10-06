import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { HALL_CREDIT } from '../src/audio/hall-credit.ts';
import { hallEntry, licenseDocument, packageEntries } from './licenses.ts';

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

describe('hallEntry (design 7.3)', () => {
  const root = join(import.meta.dirname, '..');

  it('gives the credit, the links, and the CC BY 4.0 text of the hall impulse response', async () => {
    const entry = await hallEntry(root);

    expect(entry.license).toBe('CC BY 4.0');
    expect(entry.source).toBe('https://doi.org/10.5281/zenodo.2641166');
    expect(entry.text.startsWith(`${HALL_CREDIT.text}\n`)).toBe(true);
    expect(entry.text).toContain('License: https://creativecommons.org/licenses/by/4.0/');
    expect(entry.text).toContain('Attribution 4.0 International');
  });
});
