import { join } from 'node:path';

import { SoundBankLoader } from 'spessasynth_core';
import { beforeAll, describe, expect, it } from 'vitest';
import type { BasicSoundBank } from 'spessasynth_core';

import {
  loadSoundBank,
  presetFilePath,
  presetTarget,
  sortIndex,
  splitPreset,
} from './split-soundfont.ts';

const SOURCE = join(import.meta.dirname, '..', 'assets', 'soundfont', 'GeneralUserGS.sf3');

describe('presetTarget', () => {
  it('puts a GM or GS drum kit into bank 128', () => {
    expect(presetTarget({ bankMSB: 0, program: 48, isGMGSDrum: true, isDrum: true })).toEqual({
      bank: 128,
      program: 48,
      drumKit: true,
    });
  });

  it('keeps the bank MSB of a melodic preset', () => {
    expect(presetTarget({ bankMSB: 8, program: 48, isGMGSDrum: false, isDrum: false })).toEqual({
      bank: 8,
      program: 48,
      drumKit: false,
    });
  });

  it('gives no file to the XG or GM2 copy of a drum kit', () => {
    expect(
      presetTarget({ bankMSB: 120, program: 48, isGMGSDrum: false, isDrum: true }),
    ).toBeUndefined();
  });
});

describe('presetFilePath', () => {
  it('names the file by bank and program', () => {
    expect(presetFilePath({ bank: 128, program: 48, drumKit: true })).toBe('sf/128/48.sf3');
  });
});

describe('sortIndex', () => {
  const entry = (bank: number, program: number) => ({
    bank,
    program,
    drumKit: bank === 128,
    file: presetFilePath({ bank, program, drumKit: bank === 128 }),
    size: 1,
  });

  it('sorts by bank, then by program', () => {
    const sorted = sortIndex([entry(128, 0), entry(0, 40), entry(8, 4), entry(0, 2)]);
    expect(sorted.map((item) => item.file)).toEqual([
      'sf/0/2.sf3',
      'sf/0/40.sf3',
      'sf/8/4.sf3',
      'sf/128/0.sf3',
    ]);
  });

  it('refuses two presets with the same bank and program', () => {
    expect(() => sortIndex([entry(0, 40), entry(0, 40)])).toThrow('bank 0, program 40');
  });
});

describe('splitPreset', () => {
  let source: BasicSoundBank;

  beforeAll(async () => {
    source = await loadSoundBank(SOURCE);
  });

  it('writes one preset with its Ogg data and its loop points', () => {
    const violin = source.presets.find(
      (preset) => !preset.isDrum && preset.bankMSB === 0 && preset.program === 40,
    );
    if (!violin) {
      throw new Error('The source bank has no violin preset.');
    }
    const part = SoundBankLoader.fromArrayBuffer(splitPreset(source, violin));

    expect(part.presets.map((preset) => [preset.bankMSB, preset.program])).toEqual([[0, 40]]);
    expect(part.samples.length).toBeGreaterThan(0);
    for (const sample of part.samples) {
      const original = source.samples.find((item) => item.name === sample.name);
      expect(sample.isCompressed).toBe(true);
      expect([sample.loopStart, sample.loopEnd]).toEqual([original?.loopStart, original?.loopEnd]);
    }
  });
});
