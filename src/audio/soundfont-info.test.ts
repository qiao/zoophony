import { describe, expect, it } from 'vitest';

import { headroomComment } from '../../tools/build-soundfont.ts';
import { SOUNDFONT_PATH, loadSoundBank } from '../../tools/split-soundfont.ts';
import { SOUNDFONT_HEADROOM_DB } from './soundfont-info.ts';

describe('the SoundFont information', () => {
  it('gives the headroom that the build wrote into the SoundFont (design 6.2)', async () => {
    const bank = await loadSoundBank(SOUNDFONT_PATH);

    expect(bank.soundBankInfo.comment).toContain(headroomComment(SOUNDFONT_HEADROOM_DB));
  });
});
