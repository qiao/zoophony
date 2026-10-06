import type { MotionFamily } from './family.ts';
import { hashUnit, mixHash } from './random.ts';
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

/**
 * The timing of one move of the instruments of an animal: a lift or a lowering (design 5.2). The
 * move starts after its delay and eases from the height at its start to the new height.
 */
export interface RestMove {
  /** The wait before the move starts, in wall clock seconds. */
  readonly delaySec: number;
  /** The duration of the move, in wall clock seconds, above 0. */
  readonly durationSec: number;
  /**
   * The seeded skew of the curve of the move, near 1. A value below 1 moves the largest speed
   * nearer to the start, and a value above 1 nearer to the end.
   */
  readonly skew: number;
}

/** The seeded lift and lowering of the instruments of one animal (design 5.2, 5.5). */
export interface RestMotion {
  readonly lift: RestMove;
  readonly lower: RestMove;
  /**
   * The longest lift of the group of the animal, with its delay, in seconds. A play with a short
   * count-in scales all lifts of the group by one factor, so that they end in time and keep
   * their order ({@link liftScale}).
   */
  readonly fitSec: number;
}

/** A range of seeded values. */
interface Range {
  readonly min: number;
  readonly max: number;
}

/** The ranges of the seeded lift and lowering of a player, in seconds (design 5.2). */
export const REST_MOTION = {
  /** The duration of the lift of a player. */
  liftSec: { min: 0.6, max: 0.9 },
  /** The duration of the lowering of a player. */
  lowerSec: { min: 1, max: 1.6 },
  /**
   * The delay of the lift of the principal of a seat. The woodwinds and the brass lift a moment
   * before the other seats, because they also take a breath before the first note.
   */
  seatLiftSec: {
    winds: { min: 0, max: 0.1 },
    others: { min: 0.05, max: 0.2 },
  },
  /** The delay of the lowering of the principal of a seat, after the hold. */
  seatLowerSec: { min: 0, max: 0.25 },
  /**
   * The ripple through a seat: the later players of a seat follow the principal, and their delay
   * comes nearer to this value with each player.
   */
  rippleSec: 0.5,
  /** Each player after the principal closes this seeded part of the ripple that remains. */
  rippleStep: { min: 0.25, max: 0.45 },
  /** The skew of the curve of each move ({@link RestMove.skew}). */
  skew: { min: 0.8, max: 1.25 },
} as const;

/**
 * The longest lift of a player, with its delay: the longest delay of a seat, the full ripple, and
 * the longest lift. The lifts of all players scale together by it (design 5.2).
 */
export const LIFT_FIT_SEC =
  Math.max(REST_MOTION.seatLiftSec.winds.max, REST_MOTION.seatLiftSec.others.max) +
  REST_MOTION.rippleSec +
  REST_MOTION.liftSec.max;

/** The longest lowering of a player, with its delay after the hold (design 5.2). */
export const LOWER_MAX_SEC =
  REST_MOTION.seatLowerSec.max + REST_MOTION.rippleSec + REST_MOTION.lowerSec.max;

/**
 * The lift and the lowering of the conductor (design 5.2, 5.4). The conductor gives the count-in,
 * so it does not vary: it lifts in 0.3 s and lowers in 0.6 s, with no delay.
 */
export const CONDUCTOR_MOTION: RestMotion = {
  lift: { delaySec: 0, durationSec: 0.3, skew: 1 },
  lower: { delaySec: 0, durationSec: 0.6, skew: 1 },
  fitSec: 0.3,
};

/**
 * Gives a seeded value in a range.
 *
 * @param range The range.
 * @param unit A seeded number in [0, 1).
 * @returns The value.
 */
function inRange(range: Range, unit: number): number {
  return range.min + unit * (range.max - range.min);
}

/** The slots of the seeded values of a seat, for {@link hashUnit}. */
const SEAT_SLOTS = { liftDelay: 0, lowerDelay: 1, liftRipple: 2, lowerRipple: 3 } as const;

/**
 * Calculates the ripple delay of a player of a seat (design 5.2). The principal (index 0) has no
 * delay. Each later player closes a seeded part of the ripple that remains, so the delays rise
 * with the index, and come nearer to {@link REST_MOTION.rippleSec}.
 *
 * @param seatSeed The seed of the seat. The players of one seat share it.
 * @param slot The slot of the move: one value for the lift and one for the lowering.
 * @param index The index of the player in its seat.
 * @returns The delay, in seconds, from 0 to below `rippleSec`.
 */
function rippleDelay(seatSeed: number, slot: number, index: number): number {
  const m = REST_MOTION;
  const seed = mixHash(seatSeed, slot);
  let remaining = 1;
  for (let k = 1; k <= index; k++) {
    remaining *= 1 - inRange(m.rippleStep, hashUnit(seed, k));
  }
  return m.rippleSec * (1 - remaining);
}

/**
 * Chooses the seeded lift and lowering of a player (design 5.2). The principal of a seat moves
 * first, after the seeded delay of its seat, and the later players follow in a ripple. Each move
 * has its own seeded duration and curve, so a player that lifts early does not lower late.
 *
 * @param family The motion family of the player.
 * @param index The index of the player in its seat: 0 is the principal.
 * @param seatSeed The seed of the seat. The players of one seat share it.
 * @param next The seeded random numbers of the player, in [0, 1).
 * @returns The rest motion of the player.
 */
export function restMotion(
  family: MotionFamily,
  index: number,
  seatSeed: number,
  next: () => number,
): RestMotion {
  const m = REST_MOTION;
  const winds = family === 'woodwind' || family === 'brass';
  const seatLift = winds ? m.seatLiftSec.winds : m.seatLiftSec.others;
  const s = SEAT_SLOTS;
  return {
    lift: {
      delaySec:
        inRange(seatLift, hashUnit(seatSeed, s.liftDelay)) +
        rippleDelay(seatSeed, s.liftRipple, index),
      durationSec: inRange(m.liftSec, next()),
      skew: inRange(m.skew, next()),
    },
    lower: {
      delaySec:
        inRange(m.seatLowerSec, hashUnit(seatSeed, s.lowerDelay)) +
        rippleDelay(seatSeed, s.lowerRipple, index),
      durationSec: inRange(m.lowerSec, next()),
      skew: inRange(m.skew, next()),
    },
    fitSec: LIFT_FIT_SEC,
  };
}

/**
 * Eases the progress of a move with the curve of a natural arm motion: the minimum jerk curve
 * `10 t³ - 15 t⁴ + 6 t⁵`, with a seeded skew of the time. The curve starts and ends with no speed
 * and no acceleration.
 *
 * @param x The linear progress, in [0, 1].
 * @param skew The skew of the move, near 1.
 * @returns The eased progress, in [0, 1].
 */
export function easeMove(x: number, skew: number): number {
  const t = clamp01(x) ** skew;
  return t * t * t * (10 + t * (6 * t - 15));
}

/**
 * Gives the eased progress of a move at a time after its start point (design 5.2).
 *
 * @param move The timing of the move.
 * @param elapsed The wall clock seconds since the change, or since the end of the hold.
 * @param scale The factor of the delay and the duration: 1, or less to fit a short count-in.
 * @returns The eased progress, from 0 before the delay ends to 1 at the end of the move.
 */
export function moveProgress(move: RestMove, elapsed: number, scale: number): number {
  const delay = move.delaySec * scale;
  const duration = move.durationSec * scale;
  if (elapsed <= delay) {
    return 0;
  }
  return duration > 0 ? easeMove((elapsed - delay) / duration, move.skew) : 1;
}

/**
 * Gives the factor by which a play scales the lifts of a group (design 5.2). The lifts end before
 * the first sound, also in a short count-in, and they keep their order.
 *
 * @param motion The rest motion of an animal of the group.
 * @param leadSec The wall clock seconds from the play to its first sound.
 * @returns The factor, from 0 to 1.
 */
export function liftScale(motion: RestMotion, leadSec: number): number {
  return Math.min(1, Math.max(0, leadSec) / motion.fitSec);
}
