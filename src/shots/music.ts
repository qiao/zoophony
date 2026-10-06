import { lastAtOrBefore } from '../pose/blend.ts';
import { findEntries } from './entries.ts';
import { noteLoudness } from '../pose/loudness.ts';
import type { Score } from '../score/types.ts';

/** The values of the music rules of the shots (design 5.6). */
export const MUSIC_RULES = {
  /** A seat with players is active in a window when its notes cover this part of it. */
  activeCoverage: 0.3,
  /** Activity is `coverage × (activityBase + loudness)`. */
  activityBase: 0.3,
  /** A tutti: this part of the seats with players is active. */
  tuttiShare: 0.65,
  /** A tutti: the mean loudness of the active seats is at least this value. */
  tuttiLoudness: 0.55,
} as const;

/** The notes of one seat, for the windows of the shots. */
interface SeatNotes {
  /** The merged spans of the notes: a start, then an end, for each span. Sorted. */
  readonly spans: Float64Array;
  /** The starts of the notes, sorted. */
  readonly starts: Float64Array;
  /** The end of each note, in the order of `starts`. */
  readonly ends: Float64Array;
  /** The loudness of each note, in the order of `starts` (design 5.3). */
  readonly loudness: Float32Array;
  /** The longest note, in seconds. */
  readonly longestSec: number;
}

/** The music of a score that the shot plan reads (design 5.6). */
export interface ScoreMusic {
  /** One entry for each seat. */
  readonly seats: readonly SeatNotes[];
  /** True for each seat with players. The sound-only seat has none. */
  readonly hasPlayers: readonly boolean[];
  /** The number of seats with players. */
  readonly playerSeats: number;
  /** The start of each entry after a long rest (design 5.4), sorted. */
  readonly entryStarts: Float64Array;
  /** The seat of each entry, in the order of `entryStarts`. */
  readonly entrySeats: Int32Array;
  /** The times of all conducted beats, sorted. */
  readonly beats: Float64Array;
  /** The times of the downbeats, sorted. The index of a downbeat is its bar. */
  readonly downbeats: Float64Array;
}

/** The music of one window of time (design 5.6). */
export interface WindowMusic {
  /** The part of the window that the merged notes of each seat cover, from 0 to 1. */
  readonly coverage: Float64Array;
  /** The highest loudness of the notes of each seat in the window, from 0 to 1. */
  readonly loudness: Float64Array;
  /** `coverage × (0.3 + loudness)` for each seat with players, else 0. */
  readonly activity: Float64Array;
  /** The sum of the activity of all seats. */
  readonly totalActivity: number;
  /** True for each seat with players and a coverage of at least 0.3. */
  readonly active: readonly boolean[];
  /** The number of active seats. */
  readonly activeCount: number;
  /** The mean loudness of the active seats, or 0 with no active seat. */
  readonly meanLoudness: number;
  /** True if 65% or more of the seats with players are active, with a mean loudness of 0.55. */
  readonly tutti: boolean;
}

/**
 * Merges the spans of sorted notes.
 *
 * @param starts The starts, sorted.
 * @param ends The ends, in the order of the starts.
 * @returns A start, then an end, for each merged span.
 */
function mergeSpans(starts: Float64Array, ends: Float64Array): Float64Array {
  const out: number[] = [];
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i] ?? 0;
    const end = ends[i] ?? 0;
    const last = out.length - 1;
    if (last > 0 && start <= (out[last] ?? 0)) {
      out[last] = Math.max(out[last] ?? 0, end);
    } else {
      out.push(start, end);
    }
  }
  return Float64Array.from(out);
}

/**
 * Prepares the music of a score for the windows of the shots: the notes and the merged spans of
 * each seat, the entries, and the beats.
 *
 * @param score The score.
 * @returns The music.
 */
export function prepareMusic(score: Score): ScoreMusic {
  const loudness = noteLoudness(score);
  const bySeat = score.seats.map((): number[] => []);
  for (const [i, note] of score.notes.entries()) {
    bySeat[note.seatIndex]?.push(i);
  }
  const seats = bySeat.map((indices): SeatNotes => {
    const starts = Float64Array.from(indices, (i) => score.notes[i]?.startSec ?? 0);
    const ends = Float64Array.from(indices, (i) => score.notes[i]?.endSec ?? 0);
    let longestSec = 0;
    for (let k = 0; k < starts.length; k++) {
      longestSec = Math.max(longestSec, (ends[k] ?? 0) - (starts[k] ?? 0));
    }
    return {
      spans: mergeSpans(starts, ends),
      starts,
      ends,
      loudness: Float32Array.from(indices, (i) => loudness[i] ?? 0),
      longestSec,
    };
  });
  const hasPlayers = score.seats.map((seat) => seat.playerCount > 0);
  const entries = findEntries(
    score.beats,
    score.notes,
    score.seats.length,
    (seat) => hasPlayers[seat] ?? false,
  );
  return {
    seats,
    hasPlayers,
    playerSeats: hasPlayers.filter(Boolean).length,
    entryStarts: Float64Array.from(entries, (e) => e.start),
    entrySeats: Int32Array.from(entries, (e) => e.seatIndex),
    beats: Float64Array.from(score.beats, (b) => b.timeSec),
    downbeats: Float64Array.from(
      score.beats.filter((b) => b.indexInBar === 0),
      (b) => b.timeSec,
    ),
  };
}

/**
 * Calculates the part of a window that the merged spans of a seat cover.
 *
 * @param spans The merged spans: a start, then an end, for each span.
 * @param from The start of the window.
 * @param to The end of the window, after `from`.
 * @returns The covered part, from 0 to 1.
 */
function coverageOf(spans: Float64Array, from: number, to: number): number {
  // The spans are sorted and apart, so their ends are sorted too. Find the first end after `from`.
  let low = 0;
  let high = spans.length / 2;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if ((spans[mid * 2 + 1] ?? 0) <= from) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  let covered = 0;
  for (let k = low; k < spans.length / 2; k++) {
    const start = spans[k * 2] ?? 0;
    if (start >= to) {
      break;
    }
    covered += Math.min(to, spans[k * 2 + 1] ?? 0) - Math.max(from, start);
  }
  return covered / (to - from);
}

/**
 * Finds the highest loudness of the notes of a seat that sound in a window.
 *
 * @param seat The notes of the seat.
 * @param from The start of the window.
 * @param to The end of the window.
 * @returns The loudness, or 0 with no note in the window.
 */
function loudnessIn(seat: SeatNotes, from: number, to: number): number {
  let loudest = 0;
  for (let k = lastAtOrBefore(seat.starts, to - 1e-9); k >= 0; k--) {
    const start = seat.starts[k] ?? 0;
    if (start < from - seat.longestSec) {
      break;
    }
    if ((seat.ends[k] ?? 0) > from) {
      loudest = Math.max(loudest, seat.loudness[k] ?? 0);
    }
  }
  return loudest;
}

/**
 * Reads the music of a window (design 5.6): the coverage, the loudness, and the activity of each
 * seat, and the tutti rule.
 *
 * @param music The music of the score.
 * @param from The start of the window, in song seconds.
 * @param to The end of the window, after `from`.
 * @returns The music of the window.
 */
export function musicIn(music: ScoreMusic, from: number, to: number): WindowMusic {
  const r = MUSIC_RULES;
  const count = music.seats.length;
  const coverage = new Float64Array(count);
  const loudness = new Float64Array(count);
  const activity = new Float64Array(count);
  const active: boolean[] = [];
  let totalActivity = 0;
  let activeCount = 0;
  let loudnessSum = 0;
  for (const [i, seat] of music.seats.entries()) {
    const players = music.hasPlayers[i] ?? false;
    const c = coverageOf(seat.spans, from, to);
    const l = loudnessIn(seat, from, to);
    coverage[i] = c;
    loudness[i] = l;
    const a = players ? c * (r.activityBase + l) : 0;
    activity[i] = a;
    totalActivity += a;
    const isActive = players && c >= r.activeCoverage;
    active.push(isActive);
    if (isActive) {
      activeCount++;
      loudnessSum += l;
    }
  }
  const meanLoudness = activeCount > 0 ? loudnessSum / activeCount : 0;
  return {
    coverage,
    loudness,
    activity,
    totalActivity,
    active,
    activeCount,
    meanLoudness,
    tutti:
      music.playerSeats > 0 &&
      activeCount >= r.tuttiShare * music.playerSeats &&
      meanLoudness >= r.tuttiLoudness,
  };
}

/**
 * Finds the seats with an entry near a time (design 5.6): an entry within a part of a bar.
 *
 * @param music The music of the score.
 * @param time The time, in song seconds.
 * @param reach The largest distance from the time, in seconds.
 * @returns The seats, in the order of the entries.
 */
export function entriesNear(music: ScoreMusic, time: number, reach: number): number[] {
  const seats: number[] = [];
  for (let k = lastAtOrBefore(music.entryStarts, time + reach); k >= 0; k--) {
    if ((music.entryStarts[k] ?? 0) < time - reach) {
      break;
    }
    seats.push(music.entrySeats[k] ?? -1);
  }
  return seats.toReversed();
}

/**
 * Gives the length of the bar at a time: from its downbeat to the next downbeat.
 *
 * @param music The music of the score.
 * @param time The time, in song seconds.
 * @returns The bar length in seconds, or 2 s with fewer than two downbeats.
 */
export function barLengthAt(music: ScoreMusic, time: number): number {
  const { downbeats } = music;
  const i = Math.max(0, Math.min(lastAtOrBefore(downbeats, time), downbeats.length - 2));
  const start = downbeats[i];
  const next = downbeats[i + 1];
  return start !== undefined && next !== undefined ? next - start : 2;
}

/**
 * Gives the length of the beat at a time: from its beat to the next beat.
 *
 * @param music The music of the score.
 * @param time The time, in song seconds.
 * @returns The beat length in seconds, or 0.5 s with fewer than two beats.
 */
export function beatLengthAt(music: ScoreMusic, time: number): number {
  const { beats } = music;
  const i = Math.max(0, Math.min(lastAtOrBefore(beats, time + 1e-6), beats.length - 2));
  const start = beats[i];
  const next = beats[i + 1];
  return start !== undefined && next !== undefined ? next - start : 0.5;
}
