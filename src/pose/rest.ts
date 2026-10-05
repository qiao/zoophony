import type { SeatAudibility, Transport } from './types.ts';

/** The times of the rest pose, in wall clock seconds (design 5.2, 5.5). */
export const REST_TIMES = {
  /** The players lift their instruments in this time when play starts or a seat sounds again. */
  lift: 0.3,
  /** The players lower their instruments in this time. */
  lower: 0.6,
  /**
   * The players keep their instruments up for this time after a pause or a stop. A pause in the
   * count-in has no hold (`Transport.holdSec`).
   */
  hold: 3,
} as const;

/**
 * The part of the linear rest weight in which one player lifts and lowers its instruments
 * (design 5.2). The weight of the player rises from 0 to 1 while the linear weight goes from
 * `from` to `to`. The linear weight rises in 0.3 s and falls in 0.6 s, so `from` gives the delay
 * of the lift, `1 - to` gives the delay of the lowering, and `to - from` gives the duration of
 * both. Thus each player moves in the time of the transport, and a lift ends before the downbeat
 * for each player.
 */
export interface RestPhase {
  /** The linear weight at which the lift starts, from 0. */
  readonly from: number;
  /** The linear weight at which the lift ends, at most 1, and above `from`. */
  readonly to: number;
}

/** The ranges of the seeded rest phase of a player (design 5.2). */
export const REST_PHASE = {
  /**
   * The duration of the lift or the lowering of a player is this part of the time of the
   * transport, from `spanMin` to `spanMax`: 0.15 s to 0.24 s for a lift.
   */
  spanMin: 0.5,
  spanMax: 0.8,
} as const;

/** The rest phase of the conductor: the full time of the transport (design 5.2, 5.4). */
export const FULL_PHASE: RestPhase = { from: 0, to: 1 };

/**
 * Chooses the seeded rest phase of a player (design 5.2). The duration is from
 * {@link REST_PHASE.spanMin} to {@link REST_PHASE.spanMax} of the time of the transport. The
 * start is at a seeded point of the time that remains.
 *
 * @param next The seeded random numbers of the player, in [0, 1).
 * @returns The rest phase.
 */
export function restPhase(next: () => number): RestPhase {
  const span = REST_PHASE.spanMin + next() * (REST_PHASE.spanMax - REST_PHASE.spanMin);
  const from = next() * (1 - span);
  return { from, to: from + span };
}

/**
 * Gives the eased weight of the playing pose of a player from a linear rest weight (design 5.2,
 * 5.5). The player depends only on the linear weight, so a lift or a lowering starts from the
 * height at the change, also after fast changes.
 *
 * @param phase The rest phase of the player.
 * @param weight The linear weight of the transport or of a seat, in [0, 1].
 * @returns The eased weight of the player, in [0, 1].
 */
export function phaseWeight(phase: RestPhase, weight: number): number {
  return smoothstep((weight - phase.from) / (phase.to - phase.from));
}

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
 * play starts, it rises to 1 in 0.3 s. After a pause or a stop, it stays for
 * `transport.holdSec` (3 s, or 0 after a pause in the count-in), then falls to 0 in 0.6 s. A
 * change starts from the weight at the change, `transport.weightAtChange`.
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
  const t = REST_TIMES;
  const atChange = transport.weightAtChange;
  if (transport.playing) {
    return clamp01(atChange + (wallTime - changed) / t.lift);
  }
  return clamp01(atChange - Math.max(0, wallTime - changed - transport.holdSec) / t.lower);
}

/**
 * Calculates the weight of the playing pose of a seat from its audibility (design 5.5). A silent
 * seat lowers its instruments in 0.6 s after the change, and a seat that sounds again lifts them
 * in 0.3 s. A change starts from the weight at the change, `audibility.weightAtChange`.
 *
 * @param audibility The mute and solo result of the seat.
 * @param wallTime The wall clock time, in seconds.
 * @returns The linear weight, in [0, 1].
 */
export function seatWeight(audibility: SeatAudibility, wallTime: number): number {
  const elapsed = wallTime - audibility.changedAtWall;
  const t = REST_TIMES;
  return clamp01(
    audibility.weightAtChange + (audibility.audible ? elapsed / t.lift : -elapsed / t.lower),
  );
}
