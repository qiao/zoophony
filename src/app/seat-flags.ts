import type { SeatAudibility } from '../pose/types.ts';
import { changeAudibility } from './transport.ts';

/** The mute and solo buttons of one seat in the seat list (design 2.8, 6.6). */
export interface SeatFlags {
  readonly muted: boolean;
  readonly soloed: boolean;
}

/** The flags of a seat before the user changes them, and after a new file loads (6.6). */
export const NO_FLAGS: SeatFlags = { muted: false, soloed: false };

/** One of the two toggle buttons of a seat row. */
export type SeatFlag = keyof SeatFlags;

/**
 * Gives the flags of the seats after a click on a mute or a solo button. The user can solo
 * several seats at the same time (design 6.6).
 *
 * @param flags The flags of each seat. A missing entry has {@link NO_FLAGS}.
 * @param seatIndex The seat of the button.
 * @param flag The button.
 * @returns The new flags, one for each entry of `flags` and at least up to `seatIndex`.
 */
export function toggleSeatFlag(
  flags: readonly SeatFlags[],
  seatIndex: number,
  flag: SeatFlag,
): SeatFlags[] {
  const next = Array.from(
    { length: Math.max(flags.length, seatIndex + 1) },
    (_, i) => flags[i] ?? NO_FLAGS,
  );
  const seat = next[seatIndex] ?? NO_FLAGS;
  next[seatIndex] = { ...seat, [flag]: !seat[flag] };
  return next;
}

/**
 * Tells which seats sound (design 6.6). A seat sounds if it is not muted, and no seat is soloed
 * or this seat is soloed.
 *
 * @param flags The flags of each seat. A missing entry has {@link NO_FLAGS}.
 * @param seatCount The number of seats of the score.
 * @returns One value for each seat: true if the seat sounds.
 */
export function seatsAudible(flags: readonly SeatFlags[], seatCount: number): boolean[] {
  const anySolo = flags.some((seat) => seat.soloed);
  return Array.from({ length: seatCount }, (_, i) => {
    const seat = flags[i] ?? NO_FLAGS;
    return !seat.muted && (!anySolo || seat.soloed);
  });
}

/**
 * Gives the audibility of the seats for `poseAt()` after a change of the flags (design 5.5). A
 * seat that changes keeps the weight of its playing pose at the change (`changeAudibility()`), so
 * that fast mutes do not make the instruments jump.
 *
 * @param before The audibility before the change. An `undefined` entry is a seat with no change,
 *   which sounds.
 * @param audible The new value of each seat, from {@link seatsAudible}.
 * @param wallTime The wall clock time of the change, in seconds.
 * @returns The new audibility, one entry for each seat.
 */
export function followAudibility(
  before: readonly (SeatAudibility | undefined)[],
  audible: readonly boolean[],
  wallTime: number,
): (SeatAudibility | undefined)[] {
  return audible.map((value, i) => changeAudibility(before[i], value, wallTime));
}

/**
 * Lists the seats whose sound changes, for `Player.setSeatAudible()` (design 6.6).
 *
 * @param before The value of each seat before the change.
 * @param after The value of each seat after the change.
 * @returns The indices of the seats with a new value, in order.
 */
export function changedSeats(before: readonly boolean[], after: readonly boolean[]): number[] {
  const changed: number[] = [];
  for (const [i, value] of after.entries()) {
    if ((before[i] ?? true) !== value) {
      changed.push(i);
    }
  }
  return changed;
}
