import { describe, expect, it } from 'vitest';

import { SEEK_MATCH_SEC, followSeek, shownSongTime } from './seek.ts';

describe('the wait for a seek (design 6.5, 6.7)', () => {
  it('shows the seek point until the listener hears the seek', () => {
    // The old anchor still runs from 12 s.
    expect(followSeek(90, 12.3)).toBe(90);
    expect(shownSongTime(90, 12.3)).toBe(90);
    // The listener hears the block of the seek.
    expect(followSeek(90, 90.02)).toBeNull();
    expect(shownSongTime(null, 90.02)).toBe(90.02);
  });

  it('ends the wait within 0.25 s of the seek point, also in the count-in of a play', () => {
    expect(SEEK_MATCH_SEC).toBe(0.25);
    expect(followSeek(30, 29.7)).toBe(30);
    expect(followSeek(30, 29.75)).toBeNull();
    expect(followSeek(30, 30.25)).toBeNull();
  });

  it('keeps a seek to 0 until the heard time comes near it', () => {
    expect(followSeek(0, 40)).toBe(0);
    expect(shownSongTime(0, 40)).toBe(0);
    expect(followSeek(null, 5)).toBeNull();
  });
});
