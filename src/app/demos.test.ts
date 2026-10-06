import { describe, expect, it } from 'vitest';

import { patchedDemos } from '../../tools/patch-demos.ts';
import { buildScore } from '../score/score.ts';
import {
  DEFAULT_DEMO,
  DEMOS,
  DEMO_IDS,
  demoFromQuery,
  demoHash,
  demoRowLabel,
  demoUrl,
  fileFromHash,
  isDemoId,
} from './demos.ts';
import { wholeSeconds } from './time-text.ts';

describe('demoFromQuery (design 7.1, the spike page)', () => {
  it('selects the demo of the query', () => {
    expect(demoFromQuery('?demo=beethoven-5')).toBe('beethoven-5');
    expect(demoFromQuery('?x=1&demo=grieg-ase')).toBe('grieg-ase');
  });

  it('selects the default demo for a missing or unknown id (design 2.2)', () => {
    expect(demoFromQuery('')).toBe('boulanger-matin');
    expect(demoFromQuery('?demo=other')).toBe('boulanger-matin');
  });

  it('selects the given fallback for a missing or unknown id', () => {
    expect(demoFromQuery('', 'beethoven-5')).toBe('beethoven-5');
    expect(demoFromQuery('?demo=other', 'beethoven-5')).toBe('beethoven-5');
    expect(demoFromQuery('?demo=grieg-ase', 'beethoven-5')).toBe('grieg-ase');
  });
});

describe('fileFromHash (design 2.2)', () => {
  it('selects the demo of the hash', () => {
    expect(fileFromHash('#demo=beethoven-5', false)).toBe('beethoven-5');
    expect(fileFromHash('#demo=mozart-k315', true)).toBe('mozart-k315');
  });

  it('selects the default demo for a missing or unknown id', () => {
    expect(fileFromHash('', false)).toBe('boulanger-matin');
    expect(fileFromHash('#', false)).toBe('boulanger-matin');
    expect(fileFromHash('#demo=other', false)).toBe('boulanger-matin');
    expect(fileFromHash('#grieg-ase', false)).toBe('boulanger-matin');
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
    expect(demoRowLabel('mozart-k488')).toBe(
      'Piano Concerto No. 23, mvt 2, Wolfgang Amadeus Mozart, 7 minutes 1 second',
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
  it('accepts only the five hash ids of design 8.2', () => {
    expect(DEMO_IDS).toHaveLength(5);
    for (const id of DEMO_IDS) {
      expect(isDemoId(id)).toBe(true);
    }
    expect(isDemoId('beethoven-5.mid')).toBe(false);
  });
});

describe('DEMOS (design 8.2)', () => {
  it('has the texts of the table for each demo', () => {
    expect(Object.keys(DEMOS)).toEqual([...DEMO_IDS]);
    expect(DEMOS['boulanger-matin']).toEqual({
      title: "D'un matin de printemps",
      listTitle: "D'un matin de printemps",
      composer: 'Lili Boulanger',
      credit: 'Score: OpenScore Orchestra, CC0. MIDI file made with MuseScore 4.',
      lengthSec: 280,
    });
    expect(DEMOS['mozart-k315'].listTitle).toBe('Andante in C, K. 315');
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
    expect(demoUrl('grieg-ase', '/zoophony/')).toBe('/zoophony/demos/grieg-ase.mid');
  });
});
