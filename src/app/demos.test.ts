import { describe, expect, it } from 'vitest';

import { DEFAULT_DEMO, DEMO_IDS, demoFromQuery, demoUrl, isDemoId, stepDemo } from './demos.ts';

describe('demoFromQuery', () => {
  it('selects the demo of the query', () => {
    expect(demoFromQuery('?demo=beethoven-5')).toBe('beethoven-5');
    expect(demoFromQuery('?x=1&demo=grieg-ase')).toBe('grieg-ase');
  });

  it('selects the default demo for a missing or unknown id (design 2.2)', () => {
    expect(demoFromQuery('')).toBe('boulanger-matin');
    expect(demoFromQuery('?demo=other')).toBe('boulanger-matin');
  });
});

describe('DEFAULT_DEMO', () => {
  it('is the Boulanger demo, the first demo of the list (design 2.2, 8.2)', () => {
    expect(DEFAULT_DEMO).toBe('boulanger-matin');
    expect(DEMO_IDS[0]).toBe(DEFAULT_DEMO);
  });
});

describe('isDemoId', () => {
  it('accepts only the six hash ids of design 8.2', () => {
    expect(DEMO_IDS).toHaveLength(6);
    for (const id of DEMO_IDS) {
      expect(isDemoId(id)).toBe(true);
    }
    expect(isDemoId('beethoven-5.mid')).toBe(false);
  });
});

describe('demoUrl', () => {
  it('gives the file in the demos folder of the site (design 8.3)', () => {
    expect(demoUrl('grieg-ase', '/zoophony/')).toBe('/zoophony/demos/grieg-ase.mid');
  });
});

describe('stepDemo', () => {
  it('goes to the next and the previous demo, around the ends', () => {
    expect(stepDemo('boulanger-matin', 1)).toBe('beethoven-5');
    expect(stepDemo('boulanger-matin', -1)).toBe('handel-hallelujah');
    expect(stepDemo('handel-hallelujah', 1)).toBe('boulanger-matin');
  });
});
