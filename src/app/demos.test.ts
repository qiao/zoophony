import { describe, expect, it } from 'vitest';

import { DEMO_IDS, demoFromQuery, demoUrl, isDemoId, stepDemo } from './demos.ts';

describe('demoFromQuery', () => {
  it('selects the demo of the query', () => {
    expect(demoFromQuery('?demo=boulanger-matin')).toBe('boulanger-matin');
    expect(demoFromQuery('?x=1&demo=grieg-ase')).toBe('grieg-ase');
  });

  it('selects demo 1 for a missing or unknown id (design 2.2)', () => {
    expect(demoFromQuery('')).toBe('beethoven-5');
    expect(demoFromQuery('?demo=other')).toBe('beethoven-5');
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
    expect(stepDemo('beethoven-5', 1)).toBe('grieg-ase');
    expect(stepDemo('beethoven-5', -1)).toBe('boulanger-matin');
    expect(stepDemo('boulanger-matin', 1)).toBe('beethoven-5');
  });
});
