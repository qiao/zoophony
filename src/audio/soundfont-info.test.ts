import { describe, expect, it } from 'vitest';

import { headroomComment } from '../../tools/build-soundfont.ts';
import { BASE_SOUNDFONT, SOURCES } from '../../tools/soundfont-recipes.ts';
import { SOUNDFONT_PATH, loadSoundBank } from '../../tools/split-soundfont.ts';
import { SOUNDFONT_CREDITS, SOUNDFONT_HEADROOM_DB } from './soundfont-info.ts';

describe('the SoundFont information', () => {
  it('gives the headroom that the build wrote into the SoundFont (design 6.2)', async () => {
    const bank = await loadSoundBank(SOUNDFONT_PATH);

    expect(bank.soundBankInfo.comment).toContain(headroomComment(SOUNDFONT_HEADROOM_DB));
  });

  it('credits the base SoundFont and each sample library of the build (design 2.8)', () => {
    expect(SOUNDFONT_CREDITS.length).toBe(1 + Object.keys(SOURCES).length);
    expect(SOUNDFONT_CREDITS[0]?.name).toBe(BASE_SOUNDFONT.name);
    for (const credit of SOUNDFONT_CREDITS) {
      expect(credit.url).toMatch(/^https:\/\//);
    }
  });
});
