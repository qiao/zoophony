import { describe, expect, it } from 'vitest';

import { patchedDemos } from '../../tools/patch-demos.ts';
import { buildScore } from '../score/score.ts';
import {
  DEFAULT_DEMO,
  DEMOS,
  DEMO_IDS,
  demoHash,
  demoRowLabel,
  demoUrl,
  fileFromHash,
  isDemoId,
} from './demos.ts';
import { wholeSeconds } from './time-text.ts';

describe('fileFromHash (design 2.2)', () => {
  it('selects the demo of the hash', () => {
    expect(fileFromHash('#demo=beethoven-9', false)).toBe('beethoven-9');
    expect(fileFromHash('#demo=mozart-k315', true)).toBe('mozart-k315');
  });

  it('selects the default demo for a missing or unknown id', () => {
    expect(fileFromHash('', false)).toBe('boulanger-matin');
    expect(fileFromHash('#', false)).toBe('boulanger-matin');
    expect(fileFromHash('#demo=other', false)).toBe('boulanger-matin');
    expect(fileFromHash('#mozart-k525', false)).toBe('boulanger-matin');
    // Demos that the app no longer has (design 8.2).
    for (const removed of ['beethoven-5', 'grieg-ase', 'mozart-k488']) {
      expect(fileFromHash(`#demo=${removed}`, false)).toBe('boulanger-matin');
    }
  });

  it('gives perf-60.mid only on the dev server (design 9.5)', () => {
    expect(fileFromHash('#demo=perf-60', true)).toBe('perf-60');
    expect(fileFromHash('#demo=perf-60', false)).toBe('boulanger-matin');
  });

  it('reads back the hash of each demo', () => {
    for (const id of DEMO_IDS) {
      expect(demoHash(id)).toBe(`#demo=${id}`);
      expect(fileFromHash(demoHash(id), false)).toBe(id);
    }
  });
});

describe('demoRowLabel (design 2.8)', () => {
  it('names the title, the composer, and the spoken length of a demo row', () => {
    expect(demoRowLabel('beethoven-9')).toBe(
      'Symphony No. 9, Op. 125: Ode to Joy, Ludwig van Beethoven, 2 minutes 38 seconds',
    );
    expect(demoRowLabel('boulanger-matin')).toBe(
      "D'un matin de printemps, Lili Boulanger, 4 minutes 40 seconds",
    );
  });
});

describe('DEFAULT_DEMO', () => {
  it('is the Boulanger demo, the first demo of the list (design 2.2, 8.2)', () => {
    expect(DEFAULT_DEMO).toBe('boulanger-matin');
    expect(DEMO_IDS[0]).toBe(DEFAULT_DEMO);
  });
});

describe('isDemoId', () => {
  it('accepts only the fourteen hash ids of design 8.2', () => {
    expect(DEMO_IDS).toEqual([
      'boulanger-matin',
      'beethoven-9',
      'mozart-k525',
      'bach-bwv1048',
      'beethoven-8',
      'mozart-k315',
      'beethoven-1',
      'brahms-2',
      'beethoven-8-4',
      'bach-bwv1047',
      'bach-bwv1050',
      'mendelssohn-op61',
      'mozart-k417',
      'mozart-k191',
    ]);
    for (const id of DEMO_IDS) {
      expect(isDemoId(id)).toBe(true);
    }
    expect(isDemoId('beethoven-9.mid')).toBe(false);
    expect(isDemoId('grieg-ase')).toBe(false);
  });
});

describe('DEMOS (design 8.2)', () => {
  it('has the texts of the table for each demo', () => {
    expect(Object.keys(DEMOS)).toEqual([...DEMO_IDS]);
    expect(DEMOS['boulanger-matin']).toEqual({
      title: "D'un matin de printemps",
      composer: 'Lili Boulanger',
      credit: 'Score: OpenScore Orchestra, CC0. MIDI file made with MuseScore 4.',
      lengthSec: 280,
    });
    expect(DEMOS['beethoven-9']).toEqual({
      title: 'Symphony No. 9, Op. 125: Ode to Joy',
      composer: 'Ludwig van Beethoven',
      credit:
        'Score: OpenScore Orchestra, CC0. Bars 543 to 590 and 851 to 940 of the finale. MIDI file made with MuseScore 4.',
      lengthSec: 158,
    });
  });

  it('writes each title in one pattern (audit 2026-10-05-ux-design, CP2)', () => {
    expect(DEMO_IDS.map((id) => DEMOS[id].title)).toEqual([
      "D'un matin de printemps",
      'Symphony No. 9, Op. 125: Ode to Joy',
      'Eine kleine Nachtmusik, K. 525: I',
      'Brandenburg Concerto No. 3, BWV 1048: I',
      'Symphony No. 8, Op. 93: II',
      'Andante in C, K. 315',
      'Symphony No. 1, Op. 21: IV',
      'Symphony No. 2, Op. 73: IV',
      'Symphony No. 8, Op. 93: IV',
      'Brandenburg Concerto No. 2, BWV 1047: I',
      'Brandenburg Concerto No. 5, BWV 1050: III',
      "A Midsummer Night's Dream, Op. 61: V",
      'Horn Concerto No. 2, K. 417: III',
      'Bassoon Concerto, K. 191: III',
    ]);
    for (const id of DEMO_IDS) {
      expect(DEMOS[id].title).not.toMatch(/mvt|movement/u);
    }
  });

  it('gives the length of the score of each demo file', async () => {
    const files = await patchedDemos();
    for (const id of DEMO_IDS) {
      const file = files.find((item) => item.file === `${id}.mid`);
      const result = file ? buildScore(file.bytes, 'auto') : null;
      expect(result?.ok && wholeSeconds(result.score.durationSec), id).toBe(DEMOS[id].lengthSec);
    }
  });
});

describe('demoUrl', () => {
  it('gives the file in the demos folder of the site (design 8.3)', () => {
    expect(demoUrl('beethoven-9', '/zoophony/')).toBe('/zoophony/demos/beethoven-9.mid');
  });
});
