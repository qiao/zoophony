import { describe, expect, it } from 'vitest';

import { DEMOS, DEMO_IDS } from './demos.ts';
import { HALL_CREDIT } from '../audio/hall-credit.ts';
import { HALL_REVERB_CREDIT, SOUND_CREDITS, creditTexts, licensesUrl } from './credits.ts';

describe('creditTexts (design 2.8, 7.3, 8.1)', () => {
  it('gives the credit line of the current demo, then the sources of the other demos', () => {
    const texts = creditTexts('beethoven-5');
    expect(texts.current).toBe(
      'Score: Mutopia Project, piece 941, public domain. Typeset by Stelios Samelis, adapted by Johannes Heinecke.',
    );
    expect(texts.otherDemos.map((d) => d.title)).toEqual([
      "D'un matin de printemps",
      "Åse's Death",
      'Piano Concerto No. 23, mvt 2',
      'Andante in C, K. 315',
    ]);
    expect(texts.otherDemos[0]?.credit).toBe(
      'Score: OpenScore Orchestra, CC0. MIDI file made with MuseScore 4.',
    );
  });

  it('lists the source of each demo for each piece, also for a file of the user', () => {
    for (const current of [...DEMO_IDS, null]) {
      const texts = creditTexts(current);
      const credits = [texts.current, ...texts.otherDemos.map((d) => d.credit)];
      expect(credits.filter((c) => c !== null).toSorted()).toEqual(
        DEMO_IDS.map((id) => DEMOS[id].credit).toSorted(),
      );
    }
    // A file of the user has no credit line (8.2).
    expect(creditTexts(null).current).toBeNull();
  });

  it('names each source of the SoundFont with its author, its license, and a link (6.2)', () => {
    expect(SOUND_CREDITS.map((credit) => credit.text)).toEqual([
      'Sounds: GeneralUser GS 2.0.3 by S. Christian Collins (GeneralUser GS License v2.0).',
      'Sounds: VSCO 2: Community Edition by Versilian Studios (Sam Gossner) and Ivy Audio (Simon Dalzell) (CC0).',
      'Sounds: Versilian Community Sample Library by Versilian Studios (CC0).',
    ]);
    expect(SOUND_CREDITS[0]?.links).toEqual([
      { text: 'Source', href: 'https://www.schristiancollins.com/generaluser.php' },
    ]);
  });
});

describe('HALL_REVERB_CREDIT (design 2.8, 6.8)', () => {
  it('gives the credit line of the hall reverb with links to its source and to CC BY 4.0', () => {
    expect(HALL_REVERB_CREDIT.text).toBe(HALL_CREDIT.text);
    expect(HALL_REVERB_CREDIT.links).toEqual([
      { text: 'Source', href: 'https://doi.org/10.5281/zenodo.2641166' },
      { text: 'CC BY 4.0', href: 'https://creativecommons.org/licenses/by/4.0/' },
    ]);
  });
});

describe('licensesUrl (design 7.3)', () => {
  it('gives the license file at the base of the site', () => {
    expect(licensesUrl('/zoophony/')).toBe('/zoophony/third-party-licenses.txt');
  });
});
