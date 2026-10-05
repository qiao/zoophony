import type { PlayerNote } from '../score/types.ts';
import { lastAtOrBefore } from './blend.ts';
import { clamp01, smoothstep } from './rest.ts';

/** The values of the passages of a player (design 5.1, the beat layer). */
export const PASSAGE_MOTION = {
  /** A rest shorter than this keeps two notes in one passage. */
  joinSec: 0.3,
  /** The sway starts this long before the first note of a passage (design 5.3). */
  leadSec: 0.3,
  /** The sway ends in this time after the last note of a passage. */
  fadeSec: 1,
} as const;

/** The spans in which a player plays, with no long rest, sorted by start. */
export interface Passages {
  readonly starts: Float64Array;
  readonly ends: Float64Array;
  /** The highest loudness of the notes of each passage (design 5.3). */
  readonly loudness: Float32Array;
}

/** The activity of a player at one time. */
export interface Activity {
  /** 1 while the player plays, from 0 to 1 at the start and at the end of a passage. */
  readonly weight: number;
  /** The loudness of the passage, from 0 to 1. */
  readonly loudness: number;
}

/**
 * Joins the notes of one player into passages.
 *
 * @param notes The notes of the player, sorted by start.
 * @param loudness The loudness of each note, in the order of `notes`.
 * @returns The passages.
 */
export function buildPassages(notes: readonly PlayerNote[], loudness: readonly number[]): Passages {
  const starts: number[] = [];
  const ends: number[] = [];
  const loud: number[] = [];
  for (const [i, note] of notes.entries()) {
    const last = ends.length - 1;
    const end = ends[last];
    if (end !== undefined && note.startSec <= end + PASSAGE_MOTION.joinSec) {
      ends[last] = Math.max(end, note.endSec);
      loud[last] = Math.max(loud[last] ?? 0, loudness[i] ?? 0);
    } else {
      starts.push(note.startSec);
      ends.push(note.endSec);
      loud.push(loudness[i] ?? 0);
    }
  }
  return {
    starts: Float64Array.from(starts),
    ends: Float64Array.from(ends),
    loudness: Float32Array.from(loud),
  };
}

/**
 * Gives the weight of one passage at a time: it rises before the start and falls after the end.
 *
 * @param passages The passages.
 * @param i The index of the passage.
 * @param time The song time.
 * @returns The weight, from 0 to 1.
 */
function passageWeight(passages: Passages, i: number, time: number): number {
  const start = passages.starts[i];
  const end = passages.ends[i];
  if (start === undefined || end === undefined) {
    return 0;
  }
  const m = PASSAGE_MOTION;
  const rise = smoothstep((time - start + m.leadSec) / m.leadSec);
  const fall = time <= end ? 1 : smoothstep(1 - (time - end) / m.fadeSec);
  return Math.min(rise, fall);
}

/**
 * Gives the activity of a player at a song time.
 *
 * @param passages The passages of the player.
 * @param time The song time of the note layer.
 * @returns The weight and the loudness.
 */
export function activityAt(passages: Passages, time: number): Activity {
  const i = lastAtOrBefore(passages.starts, time + PASSAGE_MOTION.leadSec);
  if (i < 0) {
    return { weight: 0, loudness: 0 };
  }
  const current = passageWeight(passages, i, time);
  const previous = passageWeight(passages, i - 1, time);
  return current >= previous
    ? { weight: clamp01(current), loudness: passages.loudness[i] ?? 0 }
    : { weight: clamp01(previous), loudness: passages.loudness[i - 1] ?? 0 };
}
