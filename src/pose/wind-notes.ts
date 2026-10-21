import type { PlayerNote } from '../score/types.ts';
import { lastAtOrBefore } from './blend.ts';
import { PHRASE_GAP_SEC, groupChords, joinSpans, spanEnvelope } from './note-groups.ts';
import { clamp01, smoothstep } from './rest.ts';

/** The times of the note layer of the woodwinds and the brass, in seconds (design 5.3). */
export const WIND_MOTION = {
  /** The breath in takes this time, and it ends at the first note of the phrase. */
  inhaleSec: 0.4,
  /** The breath out lasts the phrase, but at least this time. */
  exhaleSec: 1,
  /** The fingers take at most this time to move to the next note. They arrive at the note start. */
  fingerSec: 0.06,
  /** The trombone slide takes at most this time to move to the next note. */
  slideSec: 0.1,
} as const;

/**
 * How the fingers of a player follow the pitch (design 5.3). A woodwind player closes the holes
 * with both hands. A brass player presses the valves with one hand. The trombone has a slide.
 */
export type Fingering = 'holes' | 'valves-left' | 'valves-right' | 'slide';

/**
 * The fundamental of each brass tube, as a MIDI key: F1, B♭2, B♭1, and B♭0. The horn is a single
 * F horn of about 3.7 m, so its written C4 is the fourth partial (design 5.3).
 */
export const BRASS_FUNDAMENTALS = { horn: 29, trumpet: 46, trombone: 34, tuba: 22 } as const;

/**
 * The partials of the trumpet, the trombone, and the tuba, in semitones above the fundamental:
 * the notes that the player plays with no valve and the slide in the first position. The list
 * has no seventh partial (34 semitones). It is about 31 cents flat, so players play its notes
 * from the eighth partial (design 5.3). Thus the trombone plays A♭4 in the third position, and
 * the trumpet plays the written A5 with two valves.
 */
const PARTIALS = [0, 12, 19, 24, 28, 31, 36, 38, 40, 42, 43, 45, 46, 48] as const;

/**
 * The partials of the horn, in semitones above its fundamental: the open notes of the single F
 * horn chart of Weidner (design 5.3). Above the eighth partial (the written C5), the chart takes
 * only the 10th, 12th, and 16th partials. Thus the horn plays the written D5 with the valve 1, the
 * written F♯5 with 2, and the written A5 with 1-2.
 */
const HORN_PARTIALS = [0, 12, 19, 24, 28, 31, 36, 40, 43, 48] as const;

/** The number of pressed valves for each semitone below a partial: none, 2, 1, 1+2, 2+3, 1+3, all. */
const VALVES = [0, 1, 1, 2, 2, 2, 3] as const;

/** The lowest semitone below a partial that a valve or the slide reaches: the seventh position. */
const MAX_LOWER = 6;

/**
 * Gives the semitones below the nearest partial at or above a key. A valve combination or a
 * slide position lowers a partial by these semitones. A key below the reach of the partials
 * gives the largest value.
 *
 * @param key The MIDI key.
 * @param fundamental The MIDI key of the fundamental of the tube. It selects the partials of the
 *   tube: {@link HORN_PARTIALS} for the horn, and {@link PARTIALS} for the other brass.
 * @returns The semitones, from 0 to 6.
 */
export function semitonesBelowPartial(key: number, fundamental: number): number {
  const partials = fundamental === BRASS_FUNDAMENTALS.horn ? HORN_PARTIALS : PARTIALS;
  for (const partial of partials) {
    const lower = fundamental + partial - key;
    if (lower >= 0 && lower <= MAX_LOWER) {
      return lower;
    }
  }
  return key > fundamental + (partials.at(-1) ?? 0) ? 0 : MAX_LOWER;
}

/**
 * Gives the trombone slide position of a key: 1 to 7, on the partials of B♭1. F♯4, G4, and A♭4
 * take the positions 5, 4, and 3, because the partials have no seventh partial.
 *
 * @param key The MIDI key.
 * @returns The position, from 1 (closed) to 7.
 */
export function slidePosition(key: number): number {
  return 1 + semitonesBelowPartial(key, BRASS_FUNDAMENTALS.trombone);
}

/**
 * Gives the distance of a slide position from the first position, as a part of the distance of
 * the seventh position (design 5.3). Each position lowers the pitch by one semitone, so the tube
 * of position n is 2^((n - 1) / 12) times the tube of the first position. The slide moves by half
 * of the added tube, so each step is longer than the step before, as on a real slide.
 *
 * @param position The position, from 1 to 7.
 * @returns The part, from 0 at the first position to 1 at the seventh position.
 */
function slideTravel(position: number): number {
  return (2 ** ((position - 1) / 12) - 1) / (2 ** (MAX_LOWER / 12) - 1);
}

/**
 * Gives how closed the hands of a woodwind player are for a key, from 0 (open) to 1 (closed).
 * A low note of an octave closes the holes of both hands. Up the octave, the right hand opens
 * first, then the left hand. Thus each pitch class has its own shape of the hands.
 *
 * @param key The MIDI key.
 * @returns The closed part of the left hand and of the right hand.
 */
export function holesClosed(key: number): readonly [left: number, right: number] {
  const pc = ((key % 12) + 12) % 12;
  return [clamp01(1 - (pc - 6) / 6), clamp01(1 - pc / 6)];
}

/**
 * Gives how far the fingers of each hand close for a key, from 0 to 1 (design 5.3).
 *
 * @param key The MIDI key.
 * @param fingering The fingering of the instrument.
 * @param fundamental The fundamental of a brass tube. The woodwinds ignore it.
 * @returns The close of the left fingers and of the right fingers. A hand that only holds the
 *   instrument gives -1.
 */
function fingersOf(
  key: number,
  fingering: Fingering,
  fundamental: number,
): readonly [left: number, right: number] {
  switch (fingering) {
    case 'holes':
      return holesClosed(key);
    case 'valves-left':
      return [(VALVES[semitonesBelowPartial(key, fundamental)] ?? 0) / 3, -1];
    case 'valves-right':
      return [-1, (VALVES[semitonesBelowPartial(key, fundamental)] ?? 0) / 3];
    case 'slide':
      return [-1, -1];
    default: {
      const unhandled: never = fingering;
      throw new Error(`The fingering "${String(unhandled)}" is not known.`);
    }
  }
}

/** The note that a wind player shows from one time on: one note of a chord, or one note alone. */
interface WindNote {
  /** The note start, in song seconds. */
  readonly start: number;
  /** The end of the sound, in song seconds. */
  readonly end: number;
  readonly pitch: number;
}

/**
 * Gives the notes that a wind player shows (design 5.3). A wind instrument plays one note at a
 * time, but a seat at its cap can give one player two notes (3.8). The player shows the last
 * note that started. Of the notes that start within 50 ms of each other (a chord), it shows the
 * highest.
 *
 * @param notes The notes of the player, sorted by start.
 * @returns The shown notes, sorted by start.
 */
export function windNotes(notes: readonly PlayerNote[]): WindNote[] {
  return groupChords(notes).map((g) => ({ start: g.start, end: g.end, pitch: g.high }));
}

/** The note data of a wind player that the pose looks up at each frame. */
export interface WindTrack {
  /** The start of each shown note, sorted. */
  readonly starts: Float64Array;
  /** The close of the left and the right fingers for each note, from 0 to 1, or -1 to hold. */
  readonly fingersL: Float32Array;
  readonly fingersR: Float32Array;
  /** The part of the slide travel of each note: 0 at the first position, 1 at the seventh. */
  readonly slide: Float32Array;
  /** The time of the move to each note: it ends at the note start. */
  readonly fingerMove: Float32Array;
  readonly slideMove: Float32Array;
  /** The start and the end of each phrase. */
  readonly phraseStarts: Float64Array;
  readonly phraseEnds: Float64Array;
}

/**
 * Calculates the note data of a wind player (design 5.3): the fingers and the slide of each
 * shown note, and the phrases for the breath.
 *
 * @param notes The notes of the player, sorted by start.
 * @param fingering The fingering of the instrument.
 * @param fundamental The fundamental of a brass tube. The woodwinds ignore it.
 * @returns The note data.
 */
export function buildWindTrack(
  notes: readonly PlayerNote[],
  fingering: Fingering,
  fundamental: number,
): WindTrack {
  const shown = windNotes(notes);
  const m = WIND_MOTION;
  const phrases = joinSpans(shown, PHRASE_GAP_SEC);
  const gapBefore = (i: number): number => {
    const previous = shown[i - 1];
    const note = shown[i];
    return previous && note ? note.start - previous.start : Infinity;
  };
  return {
    starts: Float64Array.from(shown, (n) => n.start),
    fingersL: Float32Array.from(shown, (n) => fingersOf(n.pitch, fingering, fundamental)[0]),
    fingersR: Float32Array.from(shown, (n) => fingersOf(n.pitch, fingering, fundamental)[1]),
    slide: Float32Array.from(shown, (n) =>
      fingering === 'slide' ? slideTravel(slidePosition(n.pitch)) : 0,
    ),
    fingerMove: Float32Array.from(shown, (_, i) => Math.min(m.fingerSec, gapBefore(i))),
    slideMove: Float32Array.from(shown, (_, i) => Math.min(m.slideSec, gapBefore(i))),
    phraseStarts: Float64Array.from(phrases, (p) => p.start),
    phraseEnds: Float64Array.from(phrases, (p) => p.end),
  };
}

/** The fingers, the slide, and the breath of a wind player at one time. The pose reads it. */
export interface WindState {
  /** The close of the left and the right fingers, from 0 to 1, or -1 to hold. */
  fingersL: number;
  fingersR: number;
  /** The part of the slide travel: 0 at the first position, 1 at the seventh. */
  slide: number;
  /** The breath: 1 at the start of a phrase, after the breath in. */
  breath: number;
}

/**
 * Makes a wind state with no motion.
 *
 * @returns The state.
 */
export function createWindState(): WindState {
  return { fingersL: 0, fingersR: 0, slide: 0, breath: 0 };
}

/**
 * Gives the breath of a phrase from its start on: it falls over the phrase, in at least 1 s.
 *
 * @param time The song time.
 * @param end The end of the phrase.
 * @param start The start of the phrase.
 * @returns The breath, from 0 to 1.
 */
function exhale(time: number, end: number, start: number): number {
  return 1 - smoothstep((time - start) / Math.max(WIND_MOTION.exhaleSec, end - start));
}

/**
 * Moves from the value of the note before to the value of a note, in the move time before the
 * note start.
 *
 * @param values The value of each note.
 * @param moves The move time of each note.
 * @param starts The note starts.
 * @param i The index of the last note at or before the time.
 * @param time The song time.
 * @param first The value before the first note.
 * @returns The value at the time.
 */
function moveTo(
  values: Float32Array,
  moves: Float32Array,
  starts: Float64Array,
  i: number,
  time: number,
  first: number,
): number {
  const current = i < 0 ? first : (values[i] ?? first);
  const next = values[i + 1];
  const start = starts[i + 1];
  const move = moves[i + 1];
  if (next === undefined || start === undefined || move === undefined || time < start - move) {
    return current;
  }
  return current + (next - current) * smoothstep((time - start + move) / move);
}

/**
 * Calculates the fingers, the slide, and the breath of a wind player at a song time (design
 * 5.3). The fingers and the slide arrive at the note start. Before the first note, the fingers
 * and the slide keep the values of the first note.
 *
 * @param track The note data.
 * @param time The song time of the note layer.
 * @param out The state to write.
 */
export function windStateAt(track: WindTrack, time: number, out: WindState): void {
  const i = lastAtOrBefore(track.starts, time);
  const firstL = track.fingersL[0] ?? 0;
  const firstR = track.fingersR[0] ?? 0;
  out.fingersL = moveTo(track.fingersL, track.fingerMove, track.starts, i, time, firstL);
  out.fingersR = moveTo(track.fingersR, track.fingerMove, track.starts, i, time, firstR);
  out.slide = moveTo(track.slide, track.slideMove, track.starts, i, time, track.slide[0] ?? 0);
  // The breath in rises in the 0.4 s before a phrase.
  out.breath = spanEnvelope(
    track.phraseStarts,
    track.phraseEnds,
    time,
    WIND_MOTION.inhaleSec,
    exhale,
  ).weight;
}
