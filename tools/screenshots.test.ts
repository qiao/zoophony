import { describe, expect, it } from 'vitest';

import { drawerShots, messageShots, playShots, reviewShots, uiShots } from './screenshots.ts';

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
      path: '/#demo=boulanger-matin',
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
  it('lists the default demo and the Beethoven demo at 1440 × 900, and the default demo at 390 × 844, during play (9.8)', () => {
    expect(playShots()).toEqual([
      {
        file: 'boulanger-matin-play-1440x900.webp',
        path: '/#demo=boulanger-matin',
        width: 1440,
        height: 900,
        ready: 'body[data-samples="ready"]',
        playSec: 6,
      },
      {
        file: 'beethoven-5-play-1440x900.webp',
        path: '/#demo=beethoven-5',
        width: 1440,
        height: 900,
        ready: 'body[data-samples="ready"]',
        playSec: 6,
      },
      {
        file: 'boulanger-matin-play-390x844.webp',
        path: '/#demo=boulanger-matin',
        width: 390,
        height: 844,
        ready: 'body[data-samples="ready"]',
        playSec: 6,
      },
    ]);
  });
});

describe('uiShots', () => {
  it('lists the first screen and the play with the drawer open at both sizes of step 6 (9.5)', () => {
    const shots = uiShots();
    expect(shots.map((shot) => shot.file)).toEqual([
      'ui-first-1440x900.webp',
      'ui-playing-1440x900.webp',
      'ui-first-390x844.webp',
      'ui-playing-390x844.webp',
    ]);
    expect(shots[3]).toEqual({
      file: 'ui-playing-390x844.webp',
      path: '/',
      width: 390,
      height: 844,
      ready: 'body[data-samples="ready"]',
      scale: 2,
      state: 'playing',
    });
    expect(shots[0]?.scale).toBe(1);
  });
});

describe('drawerShots', () => {
  it('lists the seat list, the settings, the credits, and the drop overlay at both sizes of step 6 (9.8)', () => {
    const shots = drawerShots();
    expect(shots.map((shot) => shot.file)).toEqual([
      'ui-seats-1440x900.webp',
      'ui-seats-390x844.webp',
      'ui-settings-1440x900.webp',
      'ui-settings-390x844.webp',
      'ui-credits-1440x900.webp',
      'ui-credits-390x844.webp',
      'ui-drop-1440x900.webp',
      'ui-drop-390x844.webp',
    ]);
    expect(shots[1]).toEqual({
      file: 'ui-seats-390x844.webp',
      path: '/',
      width: 390,
      height: 844,
      ready: 'body[data-samples="ready"]',
      scale: 2,
      state: 'seats',
    });
    expect(shots[0]?.scale).toBe(1);
  });
});

describe('messageShots', () => {
  it('lists the load failure and the missing WebGL2 at both sizes of step 6 (2.8, 9.8)', () => {
    const shots = messageShots();
    expect(shots.map((shot) => shot.file)).toEqual([
      'ui-error-1440x900.webp',
      'ui-error-390x844.webp',
      'ui-no-webgl2-1440x900.webp',
      'ui-no-webgl2-390x844.webp',
    ]);
    expect(shots[1]).toEqual({
      file: 'ui-error-390x844.webp',
      path: '/',
      width: 390,
      height: 844,
      ready: '.message:not([hidden])',
      scale: 2,
      state: 'error',
    });
    expect(shots[2]?.ready).toBe('.full-page');
  });
});
