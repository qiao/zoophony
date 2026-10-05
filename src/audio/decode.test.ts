import { join } from 'node:path';

import { SoundBankLoader } from 'spessasynth_core';
import { describe, expect, it } from 'vitest';

import { loadSoundBank, splitPreset } from '../../tools/split-soundfont.ts';
import { sf3ToPcmSf2 } from './decode.ts';

const SOURCE = join(import.meta.dirname, '..', '..', 'assets', 'soundfont', 'GeneralUserGS.sf3');

describe('sf3ToPcmSf2', () => {
  it('keeps the preset and gives samples with no compression', async () => {
    const source = await loadSoundBank(SOURCE);
    const trumpet = source.presets.find(
      (preset) => !preset.isDrum && preset.bankMSB === 0 && preset.program === 56,
    );
    if (!trumpet) {
      throw new Error('The source bank has no trumpet preset.');
    }
    const sf3 = splitPreset(source, trumpet);
    const pcm = SoundBankLoader.fromArrayBuffer(await sf3ToPcmSf2(sf3));

    expect(pcm.presets.map((preset) => [preset.bankMSB, preset.program])).toEqual([[0, 56]]);
    expect(pcm.samples.length).toBeGreaterThan(0);
    expect(pcm.samples.every((sample) => !sample.isCompressed)).toBe(true);
    expect(pcm.samples.map((sample) => sample.loopEnd)).toEqual(
      SoundBankLoader.fromArrayBuffer(sf3).samples.map((sample) => sample.loopEnd),
    );
  });
});
