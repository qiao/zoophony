import { describe, expect, it } from 'vitest';

import { licenseDocument, unlistedDependencies } from './licenses.ts';

describe('unlistedDependencies', () => {
  it('finds the dependencies with no license entry', () => {
    expect(
      unlistedDependencies(['three', 'left-pad', 'stb-vorbis'], ['three', 'stb-vorbis']),
    ).toEqual(['left-pad']);
  });
});

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
