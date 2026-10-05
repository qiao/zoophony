import { describe, expect, it } from 'vitest';

import { resolvePresetFiles } from './preset-index.ts';
import type { PresetFileEntry } from './preset-index.ts';

const entry = (bank: number, program: number): PresetFileEntry => ({
  bank,
  program,
  drumKit: bank === 128,
  file: `sf/${bank}/${program}.sf3`,
  size: 1000,
});

const INDEX = [entry(0, 40), entry(0, 48), entry(8, 48), entry(128, 0), entry(128, 48)];

describe('resolvePresetFiles', () => {
  it('finds the file of each preset', () => {
    const files = resolvePresetFiles(INDEX, [
      { bank: 8, program: 48, drumKit: false },
      { bank: 128, program: 48, drumKit: true },
    ]);
    expect(files.map((file) => file.file)).toEqual(['sf/8/48.sf3', 'sf/128/48.sf3']);
  });

  it('falls back to the program in bank 0', () => {
    const files = resolvePresetFiles(INDEX, [{ bank: 3, program: 40, drumKit: false }]);
    expect(files.map((file) => file.file)).toEqual(['sf/0/40.sf3']);
  });

  it('falls back to drum kit 0', () => {
    const files = resolvePresetFiles(INDEX, [{ bank: 128, program: 25, drumKit: true }]);
    expect(files.map((file) => file.file)).toEqual(['sf/128/0.sf3']);
  });

  it('gives each file one time', () => {
    const files = resolvePresetFiles(INDEX, [
      { bank: 0, program: 40, drumKit: false },
      { bank: 5, program: 40, drumKit: false },
    ]);
    expect(files).toHaveLength(1);
  });

  it('refuses a preset with no file and no fallback', () => {
    expect(() => resolvePresetFiles(INDEX, [{ bank: 0, program: 1, drumKit: false }])).toThrow(
      'bank 0, program 1',
    );
  });
});
