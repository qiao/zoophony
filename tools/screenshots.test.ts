import { describe, expect, it } from 'vitest';

import { playShots, reviewShots } from './screenshots.ts';

describe('reviewShots', () => {
  it('lists each demo at 1440 × 900, the default demo at 390 × 844, the gallery, and the views (9.8)', () => {
    const shots = reviewShots();
    expect(shots.map((shot) => shot.file)).toEqual([
      'boulanger-matin-1440x900.webp',
      'beethoven-5-1440x900.webp',
      'grieg-ase-1440x900.webp',
      'mozart-k488-1440x900.webp',
      'mozart-k315-1440x900.webp',
      'handel-hallelujah-1440x900.webp',
      'boulanger-matin-390x844.webp',
      'gallery-species-1440x900.webp',
      'gallery-instruments-1440x900.webp',
      'animals-views.webp',
    ]);
    expect(shots[6]).toEqual({
      file: 'boulanger-matin-390x844.webp',
      path: '/?demo=boulanger-matin',
      width: 390,
      height: 844,
      ready: 'canvas[data-demo="boulanger-matin"]',
    });
    expect(shots[8]?.ready).toBe('canvas[data-ready="instruments"]');
    // The views page has the size of docs/reference/animals.webp.
    expect(shots[9]).toMatchObject({ path: '/views.html', width: 1024, height: 1024 });
  });
});

describe('playShots', () => {
  it('lists demo 1 and the Boulanger demo at 1440 × 900, and demo 1 at 390 × 844, during play (9.8)', () => {
    expect(playShots()).toEqual([
      {
        file: 'beethoven-5-play-1440x900.webp',
        path: '/?demo=beethoven-5',
        width: 1440,
        height: 900,
        ready: '#play:enabled',
        playSec: 6,
      },
      {
        file: 'boulanger-matin-play-1440x900.webp',
        path: '/?demo=boulanger-matin',
        width: 1440,
        height: 900,
        ready: '#play:enabled',
        playSec: 6,
      },
      {
        file: 'beethoven-5-play-390x844.webp',
        path: '/?demo=beethoven-5',
        width: 390,
        height: 844,
        ready: '#play:enabled',
        playSec: 6,
      },
    ]);
  });
});
