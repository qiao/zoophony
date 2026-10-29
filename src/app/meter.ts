import type { PlayerNote } from '../score/types.ts';

/** The number of bars of the level meter on the row of the current demo (design 2.8). */
export const METER_BARS = 9;

/** The frames of a meter track in one second of song time. */
const METER_RATE = 20;

/** The lowest MIDI key of the first bar. A lower key goes into the first bar. */
const LOW_KEY = 28;

/** The keys of one bar. A key above the last bar goes into the last bar. */
const BAR_KEYS = 8;

/** The level of a held note after its decay, as a share of its first level. */
const SUSTAIN = 0.55;

/** The time constant of the decay of a held note, in seconds. */
const DECAY_SEC = 0.6;

/** The time in which a note falls to 0 after its key release, in seconds. */
const RELEASE_SEC = 0.3;

/** The gain of the soft limit that turns the sum of the notes of a bar into a level. */
const LIMIT_GAIN = 1.6;

/** The share of the level of a note that also goes into each bar beside its bar. */
const SPREAD = 0.4;

/**
 * The levels of the meter for each frame of a piece (design 2.8). The song time gives the frame,
 * so the meter follows a seek, a pause, and the speed with no state.
 */
export interface MeterTrack {
  /** The level of each bar in each frame, from 0 to 1, at `frame * METER_BARS + bar`. */
  readonly levels: Float32Array;
  /** The number of frames. */
  readonly frames: number;
}

/**
 * Gives the bar of a key: the keys from 28 go into 9 bands of 8 keys, from low to high.
 *
 * @param pitch The MIDI key, 0 to 127.
 * @returns The bar, from 0 to `METER_BARS - 1`.
 */
export function meterBar(pitch: number): number {
  return Math.min(METER_BARS - 1, Math.max(0, Math.floor((pitch - LOW_KEY) / BAR_KEYS)));
}

/**
 * Gives the level of one note at a time: the velocity at the note on, a decay to 55% while the
 * key is held, and a linear fall to 0 in 0.3 s after the key release.
 *
 * @param note The note.
 * @param timeSec The song time, in seconds.
 * @returns The level from 0 to 1, or 0 outside the note.
 */
function noteLevel(note: PlayerNote, timeSec: number): number {
  if (timeSec < note.startSec) {
    return 0;
  }
  const peak = note.velocity / 127;
  const held = (t: number): number =>
    peak * (SUSTAIN + (1 - SUSTAIN) * Math.exp(-(t - note.startSec) / DECAY_SEC));
  if (timeSec <= note.endSec) {
    return held(timeSec);
  }
  return held(note.endSec) * Math.max(0, 1 - (timeSec - note.endSec) / RELEASE_SEC);
}

/**
 * Calculates the meter track of a score (design 2.8): nine bars from the low keys to the high
 * keys, each with the sum of the levels of its notes, through a soft limit. A note also adds 40%
 * of its level to each bar beside its bar, so that the meter has the soft shape of the mockup.
 * Only the first player of each seat counts, so that the section size does not change the meter.
 *
 * @param notes The notes of the score, `Score.notes`.
 * @param durationSec The length of the score, `Score.durationSec`.
 * @returns The track.
 */
export function meterTrack(notes: readonly PlayerNote[], durationSec: number): MeterTrack {
  const frames = Math.ceil((durationSec + RELEASE_SEC) * METER_RATE) + 1;
  const levels = new Float32Array(frames * METER_BARS);
  for (const note of notes) {
    if (note.player !== 0) {
      continue;
    }
    const bar = meterBar(note.pitch);
    const first = Math.max(0, Math.ceil(note.startSec * METER_RATE));
    const last = Math.min(frames - 1, Math.floor((note.endSec + RELEASE_SEC) * METER_RATE));
    for (let frame = first; frame <= last; frame++) {
      const level = noteLevel(note, frame / METER_RATE);
      for (let near = Math.max(0, bar - 1); near <= Math.min(METER_BARS - 1, bar + 1); near++) {
        const i = frame * METER_BARS + near;
        levels[i] = (levels[i] ?? 0) + (near === bar ? level : level * SPREAD);
      }
    }
  }
  for (let i = 0; i < levels.length; i++) {
    levels[i] = 1 - Math.exp(-LIMIT_GAIN * (levels[i] ?? 0));
  }
  return { levels, frames };
}

/**
 * Gives the levels of the bars at a song time, between the two nearest frames. Before the
 * start and after the end, each bar is 0.
 *
 * @param track The meter track of the piece.
 * @param songSec The song time, in seconds.
 * @param out The array of the result, with `METER_BARS` entries. Each call writes all of them.
 * @returns `out`.
 */
export function meterLevels(track: MeterTrack, songSec: number, out: Float32Array): Float32Array {
  const position = songSec * METER_RATE;
  const frame = Math.floor(position);
  const share = position - frame;
  for (let bar = 0; bar < METER_BARS; bar++) {
    const level = (f: number): number =>
      f >= 0 && f < track.frames ? (track.levels[f * METER_BARS + bar] ?? 0) : 0;
    out[bar] = level(frame) * (1 - share) + level(frame + 1) * share;
  }
  return out;
}

/** The time in which the ring of a seat fades to 0 after its last note ends, in seconds. */
const GLOW_FADE_SEC = 0.3;

/** The level of a note at the velocity 0. The velocity 127 gives the level 1. */
const GLOW_FLOOR = 0.5;

/**
 * The spans of sound of each seat, for the ring on the dot of a seat row (design 2.8). A span
 * holds the notes of a seat that overlap or touch. The spans of a seat are sorted and disjoint.
 */
export interface SeatSpans {
  /** The start, the end, and the level of each span, at `span * 3`, in seconds and from 0 to 1. */
  readonly spans: Float64Array;
  /**
   * The first span of each seat, and one more entry at the end: the spans of seat `i` are from
   * `first[i]` to `first[i + 1] - 1`.
   */
  readonly first: Uint32Array;
}

/**
 * Calculates the spans of sound of each seat (design 2.8): the notes of all players of a seat
 * that overlap or touch become one span, with the level of its loudest note.
 *
 * @param notes The notes of the score, `Score.notes`, sorted by `startSec`.
 * @param seatCount The number of seats, `Score.seats.length`.
 * @returns The spans.
 */
export function seatSpans(notes: readonly PlayerNote[], seatCount: number): SeatSpans {
  const bySeat: number[][] = Array.from({ length: seatCount }, () => []);
  for (const note of notes) {
    const spans = bySeat[note.seatIndex];
    if (!spans) {
      continue;
    }
    const level = GLOW_FLOOR + ((1 - GLOW_FLOOR) * note.velocity) / 127;
    const last = spans.length - 3;
    if (last >= 0 && note.startSec <= (spans[last + 1] ?? 0)) {
      spans[last + 1] = Math.max(spans[last + 1] ?? 0, note.endSec);
      spans[last + 2] = Math.max(spans[last + 2] ?? 0, level);
    } else {
      spans.push(note.startSec, Math.max(note.startSec, note.endSec), level);
    }
  }

  const first = new Uint32Array(seatCount + 1);
  for (const [seat, spans] of bySeat.entries()) {
    first[seat + 1] = (first[seat] ?? 0) + spans.length / 3;
  }
  return { spans: Float64Array.from(bySeat.flat()), first };
}

/**
 * Gives the level of the ring of each seat at a song time (design 2.8): the level of a span
 * while it sounds, then a linear fade to 0 in 0.3 s after its end. The song time alone gives
 * the level, so the ring follows a seek, a pause, and the speed with no state. A silent seat
 * (design 6.6) has the level 0.
 *
 * @param spans The spans of the piece, from {@link seatSpans}.
 * @param songSec The song time, in seconds.
 * @param audible True for each seat that sounds. A missing entry sounds.
 * @param out The array of the result, with one entry for each seat. Each call writes all of them.
 * @returns `out`.
 */
export function seatLevels(
  spans: SeatSpans,
  songSec: number,
  audible: readonly boolean[],
  out: Float32Array,
): Float32Array {
  const data = spans.spans;
  for (let seat = 0; seat < out.length; seat++) {
    const begin = spans.first[seat] ?? 0;
    const end = spans.first[seat + 1] ?? begin;
    let level = 0;
    if (audible[seat] !== false) {
      // The last span that starts at or before the song time.
      let low = begin;
      let high = end;
      while (low < high) {
        const mid = (low + high) >>> 1;
        if ((data[mid * 3] ?? 0) <= songSec) {
          low = mid + 1;
        } else {
          high = mid;
        }
      }
      // The spans are disjoint, so the spans before a span that has faded have also faded.
      for (let span = low - 1; span >= begin; span--) {
        const spanEnd = data[span * 3 + 1] ?? 0;
        if (spanEnd + GLOW_FADE_SEC <= songSec) {
          break;
        }
        const peak = data[span * 3 + 2] ?? 0;
        const fade = songSec <= spanEnd ? 1 : 1 - (songSec - spanEnd) / GLOW_FADE_SEC;
        level = Math.max(level, peak * fade);
      }
    }
    out[seat] = level;
  }
  return out;
}
