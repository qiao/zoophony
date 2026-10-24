import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { HALL_CREDIT } from '../src/audio/hall-credit.ts';
import {
  githubMarkEntry,
  hallEntry,
  licenseDocument,
  packageEntries,
  soundFontEntries,
} from './licenses.ts';

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
  it('gives the credit and the links of the hall impulse response', () => {
    const entry = hallEntry();

    expect(entry.license).toBe('CC BY 4.0');
    expect(entry.source).toBe('https://doi.org/10.5281/zenodo.2641166');
    expect(entry.text.startsWith(`${HALL_CREDIT.text}\n`)).toBe(true);
    expect(entry.text).toContain('License: https://creativecommons.org/licenses/by/4.0/');
  });
});

describe('githubMarkEntry (design 2.8, 7.3)', () => {
  it('gives the MIT license of Primer Octicons for the GitHub mark', async () => {
    const entry = await githubMarkEntry(join(import.meta.dirname, '..'));

    expect(entry.license).toBe('MIT');
    expect(entry.source).toBe('https://github.com/primer/octicons');
    expect(entry.text).toContain('Copyright (c) 2026 GitHub Inc.');
    expect(entry.text).toContain('Permission is hereby granted');
  });
});

describe('soundFontEntries', () => {
  it('gives the license of each source of the SoundFont (design 6.2)', async () => {
    const entries = await soundFontEntries(join(import.meta.dirname, '..'));

    expect(entries.map((entry) => entry.license)).toEqual([
      'GeneralUser GS License v2.0',
      'CC0 1.0',
      'CC0 1.0',
    ]);
    expect(entries[0]?.text).toContain('GeneralUser GS v2.0.3');
    expect(entries[1]?.title).toContain('Versilian Studios');
    expect(entries[2]?.text).toContain('CC0 1.0 Universal');
  });
});
