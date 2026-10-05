import type { PlayerNote, Technique } from '../score/types.ts';
import { lastAtOrBefore } from './blend.ts';
import { clamp01, smoothstep } from './rest.ts';

/** The values of the bow motion of the bowed strings (design 5.3). */
export const BOW_MOTION = {
  /**
   * A note that starts at most this long after the first note of a stroke joins it, as a chord
   * joins in design 3.8. The player bows the notes of a chord together: a double stop.
   */
  chordSec: 0.05,
  /** A rest of at least this length ends a phrase. The next stroke is a down-bow at the frog. */
  phraseGapSec: 0.5,
  /** The place on the bow where a phrase starts, as a part of the bow range from the frog. */
  frogStart: 0.12,
  /** The place on the bow of a tremolo after a rest, as a part of the bow range. */
  tremoloStart: 0.6,
  /**
   * The length of a stroke, as a part of the bow range: `base + perSecond × duration`, from
   * `min` to `max`, multiplied by the gesture size. A long note uses more bow, and a short note
   * moves the bow faster for its length.
   */
  length: { base: 0.1, perSecond: 0.4, min: 0.06, max: 0.8 },
  /** The highest lift of the bow off the strings in a rest, in meters. */
  lift: 0.03,
  /** A rest of at least this length lifts the bow fully. A shorter rest lifts it less. */
  fullLiftGapSec: 0.4,
  /** A rest shorter than this keeps the bow on the strings. */
  stayGapSec: 0.04,
  /** The most time that the bow takes to leave the strings after a note. */
  liftSec: 0.1,
  /** The most time that the bow takes to come down on the strings before a note. */
  landSec: 0.15,
  /** The rate of the tremolo strokes: two strokes for each cycle. */
  tremoloHz: 7,
  /** The amplitude of the tremolo strokes in meters, multiplied by the gesture size. */
  tremoloAmplitude: 0.02,
  /** The most time that the left hand takes to move to the next note, and the bow to change strings. */
  shiftSec: 0.08,
  /** The change between the bow and pizzicato starts this long before the note. */
  techniqueLeadSec: 0.3,
  /** The change between the bow and pizzicato ends this long before the note. */
  techniqueEndSec: 0.05,
  /** The time of the pluck of a pizzicato note. */
  flickSec: 0.06,
  /** Before a pluck, the finger rests on the string for at most this time. */
  pluckHoldSec: 0.04,
  /** The finger goes back to the string in at most this time before the next pluck. */
  pluckReturnSec: 0.25,
  /** The time constant of the press of the left fingers at each note. */
  pressSec: 0.12,
} as const;

/**
 * The semitones from the open string to the end of the fingerboard. The left hand reaches the
 * end of the target `fingerboard` at this interval.
 */
export const FINGERBOARD_SEMITONES = 20;

/** The open strings of each bowed string, low to high, as MIDI keys (design 4.6). */
export const TUNINGS = {
  violin: [55, 62, 69, 76],
  viola: [48, 55, 62, 69],
  cello: [36, 43, 50, 57],
  contrabass: [28, 33, 38, 43],
} as const;

/** The part of the bow hair that a player uses, in meters from the frog end of the hair. */
export type BowRange = readonly [low: number, high: number];

/** One bow stroke: a note or a double stop of one player, from its start to the next stroke. */
export interface Stroke {
  /** The note start, in song seconds. */
  readonly start: number;
  /** The end of the sound, in song seconds. It is not later than the start of the next stroke. */
  readonly end: number;
  readonly technique: Technique;
  /** The string of the stroke, from 0 (the lowest) to 3. A double stop lies between two strings. */
  readonly string: number;
  /** The place of the left hand on the target `fingerboard`: 0 at the nut, 1 at the end. */
  readonly fingerboard: number;
  /** The gesture size: the loudness of design 5.3 and the amplitude of the player. */
  readonly gesture: number;
  /** The place of the strings on the hair at the start and at the end, in meters from the frog. */
  readonly bowFrom: number;
  readonly bowTo: number;
  /** The tremolo amplitude in meters. 0 for the other techniques. */
  readonly tremolo: number;
  /** Whether the bow moves to `bowFrom` in the rest before the stroke, off the strings. */
  readonly retake: boolean;
}

/** The bow and the hands of a bowed string player at one time. The pose reads it. */
export interface BowState {
  /** The place of the strings on the hair, in meters from the frog end of the hair. */
  bow: number;
  /** The distance of the hair above the strings, in meters. */
  lift: number;
  /** 0 is the bow on the strings, 1 is pizzicato. It is linear in time. */
  pizzicato: number;
  /** The place of the plucking finger across the strings, from -1 to 1. */
  pluck: number;
  /** The string, from 0 to 3. */
  string: number;
  /** The place of the left hand on the fingerboard, from 0 to 1. */
  fingerboard: number;
  /** The press of the left fingers, 1 at the note start, then less. */
  press: number;
  /** The gesture size of the current stroke. */
  gesture: number;
}

/**
 * Makes a bow state with no motion.
 *
 * @returns The state.
 */
export function createBowState(): BowState {
  return {
    bow: 0,
    lift: 0,
    pizzicato: 0,
    pluck: -1,
    string: 0,
    fingerboard: 0,
    press: 0,
    gesture: 1,
  };
}

/** The string and the semitones above the open string of a note. */
interface Stop {
  readonly string: number;
  readonly semitones: number;
}

/**
 * Finds the string of a note: the highest open string at or below the pitch.
 *
 * @param pitch The MIDI key.
 * @param tuning The open strings, low to high.
 * @returns The string and the semitones above it, at most {@link FINGERBOARD_SEMITONES}.
 */
function stopOf(pitch: number, tuning: readonly number[]): Stop {
  let string = 0;
  for (let s = 1; s < tuning.length; s++) {
    if ((tuning[s] ?? Infinity) <= pitch) {
      string = s;
    }
  }
  const semitones = Math.min(FINGERBOARD_SEMITONES, Math.max(0, pitch - (tuning[string] ?? pitch)));
  return { string, semitones };
}

/**
 * Gives the place of the left hand on the fingerboard for a stop. The place follows the string
 * length: one octave is half of the string.
 *
 * @param semitones The semitones above the open string.
 * @returns 0 at the nut, 1 at the end of the fingerboard.
 */
export function fingerboardPlace(semitones: number): number {
  const k = Math.max(1, semitones);
  return (1 - 2 ** (-k / 12)) / (1 - 2 ** (-FINGERBOARD_SEMITONES / 12));
}

/** The string of a stroke and the place of the left hand. */
interface StringPlace {
  readonly string: number;
  readonly fingerboard: number;
}

/**
 * Gives the string and the hand place of a stroke. The high note of a double stop takes its own
 * string, and the low note takes the string below it. The bow lies between the two strings, and
 * the hand lies between the two stops.
 *
 * @param low The lowest pitch of the stroke.
 * @param high The highest pitch of the stroke.
 * @param tuning The open strings.
 * @returns The string coordinate and the hand place.
 */
function stringsOf(low: number, high: number, tuning: readonly number[]): StringPlace {
  const top = stopOf(high, tuning);
  if (high === low) {
    return { string: top.string, fingerboard: fingerboardPlace(top.semitones) };
  }
  const lower = Math.max(0, top.string - 1);
  const semitones = Math.min(FINGERBOARD_SEMITONES, Math.max(0, low - (tuning[lower] ?? low)));
  return {
    string: top.string > 0 ? top.string - 0.5 : 0.5,
    fingerboard: fingerboardPlace((semitones + top.semitones) / 2),
  };
}

/** The notes of a player that start together, with the notes that still sound. */
interface NoteGroup {
  start: number;
  end: number;
  technique: Technique;
  low: number;
  high: number;
  /** The highest loudness of the notes that start. */
  loud: number;
}

/**
 * Builds the bow strokes of one bowed string player (design 5.3). Notes that start together
 * form one stroke, a double stop. The bow changes direction on each stroke. A phrase starts
 * with a down-bow at the frog. The length of a stroke comes from the note length and the
 * gesture size. Pizzicato strokes keep the bow where it is. A tremolo stroke makes short fast
 * strokes around the place of the bow.
 *
 * @param notes The notes of the player, sorted by start.
 * @param loudness The loudness of each note, in the order of `notes` (design 5.3).
 * @param range The part of the bow hair that the player uses, in meters from the frog end of the
 *   hair. A small player cannot reach the tip of a long bow.
 * @param amplitude The seeded amplitude of the player, near 1.
 * @param tuning The open strings of the instrument.
 * @returns The strokes, sorted by start, with no overlap.
 */
export function buildStrokes(
  notes: readonly PlayerNote[],
  loudness: readonly number[],
  range: BowRange,
  amplitude: number,
  tuning: readonly number[],
): Stroke[] {
  const m = BOW_MOTION;
  const groups: NoteGroup[] = [];
  for (let i = 0; i < notes.length;) {
    const first = notes[i];
    if (!first) {
      break;
    }
    const group: NoteGroup = {
      start: first.startSec,
      end: first.endSec,
      technique: first.technique,
      low: first.pitch,
      high: first.pitch,
      loud: loudness[i] ?? 0,
    };
    // Earlier notes that still sound make a double stop with the new note.
    for (let k = i - 1; k >= 0 && k >= i - 8; k--) {
      const held = notes[k];
      if (held && held.endSec > first.startSec + m.chordSec) {
        group.low = Math.min(group.low, held.pitch);
        group.high = Math.max(group.high, held.pitch);
      }
    }
    let j = i + 1;
    for (; j < notes.length; j++) {
      const next = notes[j];
      if (!next || next.startSec - first.startSec > m.chordSec) {
        break;
      }
      group.end = Math.max(group.end, next.endSec);
      group.low = Math.min(group.low, next.pitch);
      group.high = Math.max(group.high, next.pitch);
      group.loud = Math.max(group.loud, loudness[j] ?? 0);
    }
    groups.push(group);
    i = j;
  }

  const strokes: Stroke[] = [];
  const [low, high] = range;
  const span = high - low;
  let bow = low + m.frogStart * span;
  let direction = -1;
  let previousEnd = -Infinity;
  let bowed = false;
  for (const [k, g] of groups.entries()) {
    const next = groups[k + 1];
    const end = next ? Math.min(g.end, next.start) : g.end;
    const duration = Math.max(0, end - g.start);
    const gesture = (0.6 + 0.6 * clamp01(g.loud)) * amplitude;
    const phrase = g.start - previousEnd >= m.phraseGapSec;
    let from = bow;
    let to = bow;
    let tremolo = 0;
    let retake = false;
    if (g.technique === 'tremolo') {
      if (phrase || !bowed) {
        from = low + m.tremoloStart * span;
        retake = true;
      }
      tremolo = Math.max(0, Math.min(m.tremoloAmplitude * gesture, from - low, high - from));
      to = from + tremolo * Math.sin(2 * Math.PI * m.tremoloHz * duration);
      bowed = true;
    } else if (g.technique === 'normal') {
      if (phrase || !bowed) {
        from = low + m.frogStart * span;
        direction = 1;
        retake = true;
      } else {
        direction = -direction;
      }
      const l = m.length;
      const part = Math.min(l.max, Math.max(l.min, l.base + l.perSecond * duration));
      to = Math.min(high, Math.max(low, from + direction * part * span * gesture));
      bowed = true;
    }
    strokes.push({
      start: g.start,
      end,
      technique: g.technique,
      ...stringsOf(g.low, g.high, tuning),
      gesture,
      bowFrom: from,
      bowTo: to,
      tremolo,
      retake,
    });
    bow = to;
    previousEnd = end;
  }
  return strokes;
}

/**
 * Gives the place of the strings on the hair during a stroke. A stroke starts at its full speed
 * and slows to a stop at its end, so the change of direction at the next note is sharp.
 *
 * @param stroke The stroke.
 * @param time The song time, from the start to the end of the stroke.
 * @returns The place, in meters from the frog end of the hair.
 */
function bowInStroke(stroke: Stroke, time: number): number {
  const dt = time - stroke.start;
  if (stroke.technique === 'tremolo') {
    return stroke.bowFrom + stroke.tremolo * Math.sin(2 * Math.PI * BOW_MOTION.tremoloHz * dt);
  }
  const duration = stroke.end - stroke.start;
  const x = duration > 0 ? clamp01(dt / duration) : 1;
  return stroke.bowFrom + (stroke.bowTo - stroke.bowFrom) * (1 - (1 - x) * (1 - x));
}

/**
 * Gives 1 for a pizzicato stroke and 0 for a bowed stroke.
 *
 * @param stroke The stroke.
 * @returns The weight of pizzicato.
 */
function pizzicatoOf(stroke: Stroke): number {
  return stroke.technique === 'pizzicato' ? 1 : 0;
}

/**
 * Calculates the bow and the hands of a bowed string player at one time (design 5.3). The
 * state is a function of the strokes and the time only. Each note event happens at the note
 * start: the stroke of the bow starts, or the finger plucks. The motion before the note (the
 * landing of the bow, the retake, the shift of the left hand, and the return of the plucking
 * finger) ends at the note start.
 *
 * @param strokes The strokes of the player, from {@link buildStrokes}.
 * @param starts The starts of the strokes.
 * @param time The song time of the note layer, in seconds.
 * @param out The state to write.
 */
export function bowStateAt(
  strokes: readonly Stroke[],
  starts: Float64Array,
  time: number,
  out: BowState,
): void {
  const m = BOW_MOTION;
  const i = lastAtOrBefore(starts, time);
  const current = strokes[i];
  const next = strokes[i + 1];
  const first = strokes[0];
  if (!first) {
    out.bow = 0;
    out.lift = m.lift;
    out.pizzicato = 0;
    out.pluck = -1;
    out.string = 1.5;
    out.fingerboard = fingerboardPlace(2);
    out.press = 0;
    out.gesture = 1;
    return;
  }
  if (!current) {
    // Before the first note, the bow waits above the strings and lands at the note start.
    out.bow = first.bowFrom;
    out.lift = m.lift * smoothstep((first.start - time) / m.landSec);
    out.pizzicato = pizzicatoOf(first);
    out.pluck = -1;
    out.string = first.string;
    out.fingerboard = first.fingerboard;
    out.press = 0;
    out.gesture = first.gesture;
    return;
  }

  // The bow on the strings, and the lift and the retake in a rest.
  if (time <= current.end) {
    out.bow = bowInStroke(current, time);
    out.lift = 0;
  } else if (!next) {
    out.bow = current.bowTo;
    out.lift = m.lift * smoothstep((time - current.end) / m.liftSec);
  } else {
    const gap = next.start - current.end;
    out.bow = current.bowTo;
    out.lift = 0;
    if (gap > m.stayGapSec) {
      const up = Math.min(m.liftSec, gap / 3);
      const land = Math.min(m.landSec, gap / 3);
      const height = m.lift * Math.min(1, gap / m.fullLiftGapSec);
      out.lift =
        height * smoothstep(Math.min((time - current.end) / up, (next.start - time) / land));
      if (next.retake) {
        const x = (time - current.end - up) / (gap - up - land);
        out.bow = current.bowTo + (next.bowFrom - current.bowTo) * smoothstep(x);
      }
    }
  }

  // The left hand and the string of the bow move to the next note just before it.
  out.string = current.string;
  out.fingerboard = current.fingerboard;
  if (next) {
    const shift = Math.min(m.shiftSec, 0.5 * (next.start - current.start));
    const x = shift > 0 ? smoothstep((time - (next.start - shift)) / shift) : 0;
    out.string += (next.string - current.string) * x;
    out.fingerboard += (next.fingerboard - current.fingerboard) * x;
  }

  // The change between the bow and pizzicato.
  out.pizzicato = pizzicatoOf(current);
  if (next && pizzicatoOf(next) !== out.pizzicato) {
    const a = Math.max(current.start, next.start - m.techniqueLeadSec);
    const b = Math.max(a + 1e-3, next.start - m.techniqueEndSec);
    out.pizzicato += (pizzicatoOf(next) - out.pizzicato) * clamp01((time - a) / (b - a));
  }

  // The pluck: the finger crosses the strings at the note start, then goes back before the
  // next pluck and rests on the string.
  out.pluck = -1;
  if (current.technique === 'pizzicato') {
    const interval = next ? next.start - current.start : Infinity;
    const flick = Math.min(m.flickSec, 0.4 * interval);
    const dt = time - current.start;
    if (dt < flick) {
      const x = dt / flick;
      out.pluck = -1 + 2 * (1 - (1 - x) * (1 - x));
    } else if (next && next.technique === 'pizzicato') {
      const hold = Math.min(m.pluckHoldSec, 0.2 * interval);
      const back = Math.max(current.start + flick, next.start - m.pluckReturnSec);
      out.pluck = 1 - 2 * smoothstep((time - back) / (next.start - hold - back));
    } else {
      out.pluck = 1;
    }
  }

  out.press = Math.exp(-(time - current.start) / m.pressSec);
  out.gesture = current.gesture;
}
