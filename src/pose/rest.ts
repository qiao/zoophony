import type { SeatAudibility, Transport } from './types.ts';

/** The times of the rest pose, in wall clock seconds (design 5.2, 5.5). */
export const REST_TIMES = {
  /** The players lift their instruments in this time when play starts or a seat sounds again. */
  lift: 0.3,
  /** The players lower their instruments in this time. */
  lower: 0.6,
  /** The players keep their instruments up for this time after a pause or a stop. */
  hold: 3,
} as const;

/**
 * Limits a number to [0, 1].
 *
 * @param x The number.
 * @returns The number in [0, 1].
 */
export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/**
 * Eases a linear weight, so that a lift or a lowering starts and stops with no jump of speed.
 *
 * @param x The linear weight, in [0, 1].
 * @returns The eased weight, in [0, 1].
 */
export function smoothstep(x: number): number {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
}

/**
 * Calculates the weight of the playing pose from the transport (design 5.2). 0 is the rest pose,
 * and 1 is the playing pose. The weight is linear in time. Before the first play, it is 0. When
 * play starts, it rises to 1 in 0.3 s. After a pause or a stop, it stays for 3 s, then falls to 0
 * in 0.6 s. A change starts from the weight at the change. That weight comes from the change
 * before it, on the assumption that the weight was steady before that change.
 *
 * @param transport The play state.
 * @param wallTime The wall clock time, in seconds.
 * @returns The linear weight, in [0, 1].
 */
export function transportWeight(transport: Transport, wallTime: number): number {
  const changed = transport.changedAtWall;
  if (changed === null) {
    return 0;
  }
  const previous = transport.previousChangeAtWall;
  const t = REST_TIMES;
  if (transport.playing) {
    // The change before a play is a pause or a stop. Before it, the instruments were up.
    const atChange =
      previous === null ? 0 : clamp01(1 - Math.max(0, changed - previous - t.hold) / t.lower);
    return clamp01(atChange + (wallTime - changed) / t.lift);
  }
  if (previous === null) {
    // A stop before any play.
    return 0;
  }
  // The change before a pause is a play. The instruments rose from the rest pose.
  const atChange = clamp01((changed - previous) / t.lift);
  return clamp01(atChange - Math.max(0, wallTime - changed - t.hold) / t.lower);
}

/**
 * Calculates the weight of the playing pose of a seat from its audibility (design 5.5). A silent
 * seat lowers its instruments in 0.6 s after the change, and a seat that sounds again lifts them
 * in 0.3 s. A seat that never changed sounds.
 *
 * @param audibility The mute and solo result of the seat.
 * @param wallTime The wall clock time, in seconds.
 * @returns The linear weight, in [0, 1].
 */
export function seatWeight(audibility: SeatAudibility, wallTime: number): number {
  const changed = audibility.changedAtWall;
  const previous = audibility.previousChangeAtWall;
  const t = REST_TIMES;
  if (audibility.audible) {
    if (previous === null) {
      return 1;
    }
    // The change before is a mute. Before it, the seat sounded.
    const atChange = clamp01(1 - (changed - previous) / t.lower);
    return clamp01(atChange + (wallTime - changed) / t.lift);
  }
  // With no change before, the seat sounded until this change.
  const atChange = previous === null ? 1 : clamp01((changed - previous) / t.lift);
  return clamp01(atChange - (wallTime - changed) / t.lower);
}
