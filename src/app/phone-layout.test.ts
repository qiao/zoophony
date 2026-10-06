import { describe, expect, it } from 'vitest';

import { sheetCloses, sheetOffset } from './phone-layout.ts';

describe('sheetOffset (design 2.8)', () => {
  it('follows a drag down, and keeps the sheet in its place for a drag up', () => {
    expect(sheetOffset(30)).toBe(30);
    expect(sheetOffset(-40)).toBe(0);
  });
});

describe('sheetCloses (design 2.8)', () => {
  it('closes the sheet after a drag down by more than a quarter of its height or 80 px', () => {
    expect(sheetCloses(50, 200)).toBe(false);
    expect(sheetCloses(51, 200)).toBe(true);
    expect(sheetCloses(80, 500)).toBe(false);
    expect(sheetCloses(81, 500)).toBe(true);
  });

  it('keeps the sheet open after a tap or a drag up', () => {
    expect(sheetCloses(0, 500)).toBe(false);
    expect(sheetCloses(-120, 500)).toBe(false);
  });
});
