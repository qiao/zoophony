import type { PlayerNote, Technique } from '../score/types.ts';
import { lastAtOrBefore } from './blend.ts';
import type { InstrumentOf } from './family.ts';
import { gestureSize } from './loudness.ts';
import { FINGERING_COSTS, HAND_FRAMES, TUNINGS, fingerboardPlace, planHand } from './fingering.ts';
import type { HandStep, StrokePitch } from './fingering.ts';
import { CHORD_SEC, PHRASE_GAP_SEC, groupChords } from './note-groups.ts';
import { clamp01, smoothstep } from './rest.ts';

/** The bowed strings of design 4.6. */
type Bowed = InstrumentOf<'bowed'>;

/** The values of the bow motion of the bowed strings (design 5.3). */
export const BOW_MOTION = {
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
  /**
   * The string crossing (`docs/reference/string-technique.md`, section 2.3). The turn of the bow
   * to the string of the next note takes at most `crossSec`, and at most `crossShare` of the time
   * from the note start to the next note. It ends `crossLeadSec` before the next note, as the
   * crossing of a violinist leads the bow change by about 15° of the phase of a stroke pair.
   */
  crossSec: 0.08,
  crossShare: 0.3,
  crossLeadSec: 0.01,
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
} as const;

/**
 * The values of the left hand of the bowed strings (design 5.3,
 * `docs/reference/string-technique.md`, sections 1.5 to 1.7). The hand keeps its position, and the
 * fingers play the notes. A shift takes a part of the note before it, and the finger of the new
 * note lands before the bow change.
 */
export const LEFT_HAND = {
  /** The finger of a new note lands this long before the note, and a shift ends then. */
  landSec: 0.03,
  /** A shift starts at the earliest after this share of the time from the note before to the note. */
  shiftShare: 0.5,
  /** The most time of a shift. Six professional violinists took 0.29 s to 0.46 s. */
  shiftSec: 0.35,
  /** The most time of a change of the finger or of the stop string with no shift. */
  fingerSec: 0.08,
  /** The time constant of the press of the finger after the note start. */
  pressSec: 0.12,
  /** The vibrato of a stopped note (`docs/reference/string-technique.md`, section 1.7). */
  vibrato: {
    /** A note of at least this length gets vibrato, in seconds. */
    minSec: 0.35,
    /** The vibrato starts this long after the note start, in seconds. */
    delaySec: 0.15,
    /** The vibrato grows to its full width in this time, in seconds. */
    fadeSec: 0.2,
    /** The vibrato stops in this time before the end of the note or the start of a shift. */
    stopSec: 0.1,
    /** The rate of each instrument, in hertz. */
    hz: { violin: 5.5, viola: 5.5, cello: 5.5, contrabass: 5 },
    /** The seeded change of the rate of each player, in hertz, to each side. */
    hzSpread: 0.4,
    /** The width of each instrument, in cents to each side of the pitch. */
    cents: { violin: 20, viola: 20, cello: 15, contrabass: 15 },
    /** The share that a high position and a loud note each add to the width, half each. */
    wider: 0.5,
    /** The position at which a high position adds its full share, in semitones. */
    highPosition: 12,
  },
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
  /**
   * The string of the bow, from 0 (the lowest) to 3. A double stop lies between two strings. The
   * plan of the left hand chooses it ({@link planHand}).
   */
  readonly string: number;
  /** The plan of the left hand: the position, the hand place, and the finger of the note. */
  readonly hand: HandStep;
  /**
   * The width of the vibrato to each side, as a part of the target `fingerboard`. 0 for no
   * vibrato: an open string, a pizzicato note, or a note shorter than `LEFT_HAND.vibrato.minSec`.
   */
  readonly vibrato: number;
  /** The rate of the vibrato of the player, in hertz. */
  readonly vibratoHz: number;
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
  /** The string of the bow, from 0 to 3. */
  string: number;
  /**
   * The middle of the hand frame on the target `fingerboard`, from 0 to 1. It changes only in a
   * shift.
   */
  fingerboard: number;
  /** The reach of the finger from the middle of the hand frame, from -1 to 1. */
  reach: number;
  /** The string under the finger, from 0 to 3. */
  stopString: number;
  /** The vibrato move of the hand along the strings, as a part of the target `fingerboard`. */
  vibrato: number;
  /**
   * The press of the finger: it lands before a stopped note, is 1 at the note start, and then
   * fades. 0 on an open string and in a shift.
   */
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
    reach: 0,
    stopString: 0,
    vibrato: 0,
    press: 0,
    gesture: 1,
  };
}

/**
 * Gives the rate of the vibrato of a player (`docs/reference/string-technique.md`, section 1.7):
 * the rate of the instrument, with a seeded change of each player.
 *
 * @param instrument The bowed string.
 * @param unit A seeded number of the player, from 0 to 1.
 * @returns The rate, in hertz.
 */
export function vibratoRate(instrument: Bowed, unit: number): number {
  const v = LEFT_HAND.vibrato;
  return v.hz[instrument] + (2 * unit - 1) * v.hzSpread;
}

/**
 * Gives the width of the vibrato of a stopped note to each side, as a part of the target
 * `fingerboard` (design 5.3). The width in cents of the instrument grows by up to
 * `LEFT_HAND.vibrato.wider` in a high position and in a loud note, half for each. A cent moves
 * the finger less high on the string, as the string length gives.
 *
 * @param instrument The bowed string.
 * @param hand The plan of the left hand for the note.
 * @param loudness The loudness of the note, from 0 to 1.
 * @returns The width. 0 for an open string.
 */
export function vibratoWidth(instrument: Bowed, hand: HandStep, loudness: number): number {
  if (hand.open) {
    return 0;
  }
  const v = LEFT_HAND.vibrato;
  const high = clamp01(
    (hand.position - FINGERING_COSTS.homePosition) /
      (v.highPosition - FINGERING_COSTS.homePosition),
  );
  const cents = v.cents[instrument] * (1 + v.wider * 0.5 * (high + clamp01(loudness)));
  const semitones = Math.max(1, hand.semitones);
  // The slope of `fingerboardPlace()` at the note, for each semitone.
  const slope = fingerboardPlace(semitones + 0.5) - fingerboardPlace(semitones - 0.5);
  return (cents / 100) * slope;
}

/** The pitches, the times, the technique, and the loudness of one stroke. */
interface StrokeNotes extends StrokePitch {
  /** The technique of the first note of the stroke. */
  readonly technique: Technique;
  /** The highest loudness of the notes that start the stroke. */
  readonly loudness: number;
}

/**
 * Gives the pitches and the times of the strokes of one player. Notes that start together form
 * one stroke, and an earlier note that still sounds at a new stroke joins it: two pitches make a
 * double stop. A stroke ends at the start of the next stroke at the latest.
 *
 * @param notes The notes of the player, sorted by start.
 * @param loudness The loudness of each note, in the order of `notes`.
 * @returns One entry for each stroke, with its technique and its loudness.
 */
function strokePitches(notes: readonly PlayerNote[], loudness: readonly number[]): StrokeNotes[] {
  const groups = groupChords(notes, loudness);
  // The notes of the earlier strokes that may still sound.
  let sounding: readonly PlayerNote[] = [];
  return groups.map((g, k): StrokeNotes => {
    const next = groups[k + 1];
    sounding = sounding.filter((held) => held.endSec > g.start + CHORD_SEC);
    let low = g.low;
    let high = g.high;
    for (const held of sounding) {
      low = Math.min(low, held.pitch);
      high = Math.max(high, held.pitch);
    }
    sounding = [...sounding, ...notes.slice(g.first, g.first + g.count)];
    return {
      start: g.start,
      end: next ? Math.min(g.end, next.start) : g.end,
      low,
      high,
      technique: notes[g.first]?.technique ?? 'normal',
      loudness: g.loudness,
    };
  });
}

/**
 * Builds the bow strokes of one bowed string player (design 5.3). Notes that start together
 * form one stroke, a double stop. The plan of the left hand ({@link planHand}) gives each stroke
 * its string, its position, and its finger: the hand keeps its position, and the fingers play
 * the notes. The bow changes direction on each stroke. A phrase starts with a down-bow at the
 * frog. The length of a stroke comes from the note length and the gesture size. Pizzicato
 * strokes keep the bow where it is. A tremolo stroke makes short fast strokes around the place of
 * the bow. A stopped bowed note of at least `LEFT_HAND.vibrato.minSec` gets vibrato.
 *
 * @param notes The notes of the player, sorted by start.
 * @param loudness The loudness of each note, in the order of `notes` (design 5.3).
 * @param range The part of the bow hair that the player uses, in meters from the frog end of the
 *   hair. A small player cannot reach the tip of a long bow.
 * @param amplitude The seeded amplitude of the player, near 1.
 * @param instrument The bowed string of the player.
 * @param vibratoHz The rate of the vibrato of the player, from {@link vibratoRate}.
 * @returns The strokes, sorted by start, with no overlap.
 */
export function buildStrokes(
  notes: readonly PlayerNote[],
  loudness: readonly number[],
  range: BowRange,
  amplitude: number,
  instrument: Bowed,
  vibratoHz: number,
): Stroke[] {
  const m = BOW_MOTION;
  const pitches = strokePitches(notes, loudness);
  const plan = planHand(pitches, TUNINGS[instrument], HAND_FRAMES[instrument], FINGERING_COSTS);

  const strokes: Stroke[] = [];
  const [low, high] = range;
  const span = high - low;
  let bow = low + m.frogStart * span;
  let direction = -1;
  let previousEnd = -Infinity;
  let bowed = false;
  for (const [k, p] of pitches.entries()) {
    const fingered = plan[k];
    if (!fingered) {
      continue;
    }
    const technique = p.technique;
    const duration = Math.max(0, p.end - p.start);
    const gesture = gestureSize(p.loudness, amplitude);
    const phrase = p.start - previousEnd >= PHRASE_GAP_SEC;
    let from = bow;
    let to = bow;
    let tremolo = 0;
    let retake = false;
    if (technique === 'tremolo') {
      if (phrase || !bowed) {
        from = low + m.tremoloStart * span;
        retake = true;
      }
      tremolo = Math.max(0, Math.min(m.tremoloAmplitude * gesture, from - low, high - from));
      to = from + tremolo * Math.sin(2 * Math.PI * m.tremoloHz * duration);
      bowed = true;
    } else if (technique === 'normal') {
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
    const vibrato =
      technique !== 'pizzicato' && duration >= LEFT_HAND.vibrato.minSec
        ? vibratoWidth(instrument, fingered.hand, p.loudness)
        : 0;
    strokes.push({
      start: p.start,
      end: p.end,
      technique,
      string: fingered.string,
      hand: fingered.hand,
      vibrato,
      vibratoHz,
      gesture,
      bowFrom: from,
      bowTo: to,
      tremolo,
      retake,
    });
    bow = to;
    previousEnd = p.end;
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
 * Gives the quintic ease `10x³ − 15x⁴ + 6x⁵`: its speed is a bell with no jump at the ends.
 *
 * @param x The time share, clamped to 0 to 1.
 * @returns The share of the move.
 */
function quintic(x: number): number {
  const t = clamp01(x);
  return t * t * t * (10 + t * (6 * t - 15));
}

/**
 * Gives the press of the finger of a stroke (design 5.3). The finger lands in the time `land`
 * before the note, presses fully at the note start, and then the press fades. An open string has
 * no press.
 *
 * @param stroke The stroke.
 * @param time The song time.
 * @param land The time of the landing before the note, in seconds.
 * @returns The press, from 0 to 1.
 */
function pressOf(stroke: Stroke, time: number, land: number): number {
  if (stroke.hand.open) {
    return 0;
  }
  const dt = time - stroke.start;
  if (dt >= 0) {
    return Math.exp(-dt / LEFT_HAND.pressSec);
  }
  return land > 0 ? smoothstep(1 + dt / land) : 0;
}

/**
 * Writes the left hand of a bowed string player at one time (design 5.3). The hand frame keeps
 * its place in a position, and moves only in a shift to the next position. A shift takes the
 * second part of the note before it, at most `LEFT_HAND.shiftSec`, with a quintic ease, and it
 * ends when the finger of the next note lands, `LEFT_HAND.landSec` before the note. The finger
 * turns toward the next note and moves to its string with the shift, or in at most
 * `LEFT_HAND.fingerSec` before the landing. The press of a finger lifts in a shift, and a
 * stopped note of the stroke has vibrato, with its phase from the note start. The vibrato stops
 * before the end of the note and before a shift.
 *
 * @param current The stroke at the time.
 * @param next The next stroke, or `undefined` after the last stroke.
 * @param time The song time, at or after the start of `current`.
 * @param out The state to write: the fingerboard, the reach, the stop string, the vibrato, and
 *   the press.
 */
function leftHandAt(current: Stroke, next: Stroke | undefined, time: number, out: BowState): void {
  const l = LEFT_HAND;
  const hand = current.hand;
  out.fingerboard = hand.place;
  out.reach = hand.reach;
  out.stopString = hand.stopString;
  let shift = 0;
  let stop = current.end;
  let landing = 0;
  if (next) {
    const interval = next.start - current.start;
    const land = Math.min(l.landSec, 0.25 * interval);
    const landed = next.start - land;
    let x: number;
    if (next.hand.position !== hand.position) {
      const from = Math.max(
        landed - l.shiftSec,
        Math.min(current.start + l.shiftShare * interval, current.end),
      );
      shift = quintic((time - from) / (landed - from));
      x = shift;
      stop = Math.min(stop, from);
      out.fingerboard += (next.hand.place - hand.place) * shift;
    } else {
      const from = Math.max(current.start, landed - l.fingerSec);
      x = smoothstep((time - from) / (landed - from));
    }
    out.reach += (next.hand.reach - hand.reach) * x;
    out.stopString += (next.hand.stopString - hand.stopString) * x;
    landing = pressOf(next, time, land);
  }

  out.vibrato = 0;
  if (current.vibrato > 0) {
    const v = l.vibrato;
    const dt = time - current.start;
    const grow = smoothstep((dt - v.delaySec) / v.fadeSec);
    const fade = 1 - smoothstep((time - (stop - v.stopSec)) / v.stopSec);
    out.vibrato = current.vibrato * grow * fade * Math.sin(2 * Math.PI * current.vibratoHz * dt);
  }

  out.press = Math.max(pressOf(current, time, 0) * (1 - shift), landing);
}

/**
 * Calculates the bow and the hands of a bowed string player at one time (design 5.3). The
 * state is a function of the strokes and the time only. Each note event happens at the note
 * start: the stroke of the bow starts, or the finger plucks. The motion before the note (the
 * landing of the bow, the retake, and the return of the plucking finger) ends at the note start.
 * The shift of the left hand and the finger of the note end a little earlier, when the finger
 * lands (`LEFT_HAND.landSec`), and the string crossing of the bow ends `BOW_MOTION.crossLeadSec`
 * before the note.
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
    out.reach = 0;
    out.stopString = 1.5;
    out.vibrato = 0;
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
    out.fingerboard = first.hand.place;
    out.reach = first.hand.reach;
    out.stopString = first.hand.stopString;
    out.vibrato = 0;
    out.press = pressOf(first, time, LEFT_HAND.landSec);
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

  // The bow crosses to the string of the next note just before it.
  out.string = current.string;
  if (next) {
    const interval = next.start - current.start;
    const cross = Math.min(m.crossSec, m.crossShare * interval);
    const end = next.start - Math.min(m.crossLeadSec, 0.1 * interval);
    const x = cross > 0 ? smoothstep((time - (end - cross)) / cross) : 0;
    out.string += (next.string - current.string) * x;
  }
  leftHandAt(current, next, time, out);

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

  out.gesture = current.gesture;
}
