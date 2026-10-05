import { describe, expect, it } from 'vitest';

import { startTier, tierPixelRatio } from './quality.ts';

describe('startTier', () => {
  it('starts a desktop at the high tier (design 2.6)', () => {
    expect(startTier(false, 1440, 900)).toBe('high');
    expect(startTier(false, 600, 600)).toBe('high');
  });

  it('starts a touch screen or a small screen at the low tier (design 2.6)', () => {
    expect(startTier(true, 1440, 900)).toBe('low');
    expect(startTier(false, 390, 844)).toBe('low');
    expect(startTier(false, 1440, 599)).toBe('low');
  });
});

describe('tierPixelRatio', () => {
  it('limits the pixel ratio of each tier (design 2.6)', () => {
    expect(tierPixelRatio('high', 3)).toBe(2);
    expect(tierPixelRatio('medium', 3)).toBe(1.5);
    expect(tierPixelRatio('low', 3)).toBe(1);
  });

  it('renders no more pixels than the display has', () => {
    expect(tierPixelRatio('high', 1)).toBe(1);
    expect(tierPixelRatio('medium', 1.25)).toBe(1.25);
  });
});
