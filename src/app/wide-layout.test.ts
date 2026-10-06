import { describe, expect, it } from 'vitest';

import { WIDE_LAYOUT_QUERY, isWideLayout } from './wide-layout.ts';

describe('isWideLayout (design 2.8)', () => {
  it.each([
    [1440, 900],
    [1280, 720],
    [1366, 768],
    [1920, 1080],
    [1200, 800],
  ])('gives the wide layout to a window of %i × %i', (width, height) => {
    expect(isWideLayout(width, height)).toBe(true);
  });

  it.each([
    [1199, 700],
    [1280, 1024],
    [1600, 1200],
    [960, 600],
    [390, 844],
    [844, 390],
  ])('gives no wide layout to a window of %i × %i', (width, height) => {
    expect(isWideLayout(width, height)).toBe(false);
  });

  it('has a media query with the same limits', () => {
    expect(WIDE_LAYOUT_QUERY).toBe('(min-width: 1200px) and (min-aspect-ratio: 3/2)');
  });
});
