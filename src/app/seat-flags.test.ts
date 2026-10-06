import { describe, expect, it } from 'vitest';

import { CONDUCTOR_MOTION, seatHeight } from '../pose/rest.ts';
import {
  NO_FLAGS,
  changedSeats,
  followAudibility,
  seatsAudible,
  toggleSeatFlag,
} from './seat-flags.ts';
import type { SeatFlags } from './seat-flags.ts';

/**
 * Clicks the buttons of the seat list in order, from no flags.
 *
 * @param clicks The seat and the button of each click.
 * @returns The flags after the clicks.
 */
function click(...clicks: readonly (readonly [number, 'muted' | 'soloed'])[]): SeatFlags[] {
  let flags: SeatFlags[] = [];
  for (const [seat, flag] of clicks) {
    flags = toggleSeatFlag(flags, seat, flag);
  }
  return flags;
}

describe('toggleSeatFlag (design 6.6)', () => {
  it('toggles one button of one seat, and fills the seats before it', () => {
    expect(click([2, 'muted'])).toEqual([NO_FLAGS, NO_FLAGS, { muted: true, soloed: false }]);
    expect(click([0, 'soloed'], [0, 'soloed'])).toEqual([NO_FLAGS]);
  });
});

describe('seatsAudible (design 6.6)', () => {
  it('sounds each seat with no flags', () => {
    expect(seatsAudible([], 3)).toEqual([true, true, true]);
  });

  it('silences a muted seat', () => {
    expect(seatsAudible(click([1, 'muted']), 3)).toEqual([true, false, true]);
  });

  it('sounds only the soloed seats, also two of them', () => {
    expect(seatsAudible(click([0, 'soloed'], [2, 'soloed']), 4)).toEqual([
      true,
      false,
      true,
      false,
    ]);
  });

  it('keeps a muted seat silent when it is also soloed', () => {
    expect(seatsAudible(click([0, 'soloed'], [0, 'muted'], [1, 'soloed']), 2)).toEqual([
      false,
      true,
    ]);
  });

  it('sounds all unmuted seats again after the last solo ends', () => {
    const flags = click([0, 'soloed'], [1, 'muted'], [0, 'soloed']);
    expect(seatsAudible(flags, 3)).toEqual([true, false, true]);
  });
});

describe('followAudibility (design 5.5)', () => {
  it('keeps a seat with no change, and lowers a silent seat from the time of the change', () => {
    const audibility = followAudibility([], [true, false], 10);
    expect(audibility[0]).toBeUndefined();
    expect(audibility[1]).toEqual({ audible: false, changedAtWall: 10, before: null });
    // The conductor lowers in 0.6 s with no delay, on a curve that is half way at half the time.
    const lowered = audibility[1];
    expect(seatHeight(CONDUCTOR_MOTION, lowered, 10.3)).toBeCloseTo(0.5);
    expect(seatHeight(CONDUCTOR_MOTION, lowered, 10.7)).toBe(0);
  });

  it('lifts a seat from its height at a fast unmute', () => {
    const muted = followAudibility([], [false], 10);
    const unmuted = followAudibility(muted, [true], 10.3);
    expect(unmuted[0]?.before).toBe(muted[0]);
    const height = seatHeight(CONDUCTOR_MOTION, unmuted[0], 10.3);
    expect(height).toBeGreaterThan(0);
    expect(height).toBeLessThan(1);
    expect(height).toBe(seatHeight(CONDUCTOR_MOTION, muted[0], 10.3));
  });
});

describe('changedSeats (design 6.6)', () => {
  it('lists the seats with a new value for the Player', () => {
    expect(changedSeats([], [true, false, true])).toEqual([1]);
    expect(changedSeats([true, false, true], [false, true, false])).toEqual([0, 1, 2]);
    expect(changedSeats([true, false], [true, false])).toEqual([]);
  });
});
