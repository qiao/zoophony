import type { Vec3 } from '../models/math.ts';
import type { PlayerNote } from '../score/types.ts';
import { lastAtOrBefore } from './blend.ts';
import { gestureSize } from './loudness.ts';
import { groupChords } from './note-groups.ts';
import { clamp01, smoothstep } from './rest.ts';

/** The times and the sizes of the hand motion of the piano and the harp (design 5.3). */
export const HAND_MOTION = {
  /** A hand moves to its next key or string in at most this time. */
  moveSec: 0.15,
  /** A piano hand moves in at most this part of the gap, and stays on its keys for the rest. */
  strikeMove: 0.6,
  /** A piano hand lifts this high in its move, at a gesture size of 1. */
  lift: 0.03,
  /** A harp finger rests on its string for this time before the pluck: at most 0.2 of the gap. */
  restSec: 0.04,
  /** A pluck takes this time: at most 0.3 of the gap to the next note of the hand. */
  pluckSec: 0.08,
  /** A pluck pulls the palm this far from the strings, at a gesture size of 1. */
  pull: 0.025,
  /** One hand plays the notes of a chord within this span, in semitones. */
  span: 12,
  /** The keys of the left and the right hand before the first note: C3 and C5. */
  startKeys: [48, 72],
} as const;

/** How a hand plays: a piano hand strikes the keys, and a harp hand plucks the strings. */
export type HandAction = 'strike' | 'pluck';

/** The notes of a chord that one hand plays. */
export interface HandNote {
  /** The start of the chord, in song seconds. */
  readonly start: number;
  /** The lowest and the highest key of the notes. */
  readonly low: number;
  readonly high: number;
  /** The highest loudness of the chord. */
  readonly loudness: number;
}

/**
 * Gives the notes of a player to its two hands (design 5.3). The left hand plays the low notes
 * and the right hand the high notes. A chord wider than one octave splits at its largest
 * interval: the left hand plays the notes below it. Of two equal intervals, the one nearer to the
 * middle of the chord splits it. A chord within one octave goes to the hand
 * that is nearer to it, so that a melody stays in one hand. At the same distance, it goes to the
 * right hand from middle C up, and to the left hand below.
 *
 * @param notes The notes of the player, sorted by start.
 * @param loudness The loudness of each note, in the order of `notes`.
 * @returns The notes of the left hand and of the right hand, sorted by start.
 */
export function splitHands(
  notes: readonly PlayerNote[],
  loudness: readonly number[],
): readonly [left: HandNote[], right: HandNote[]] {
  const left: HandNote[] = [];
  const right: HandNote[] = [];
  let lastLeft: number = HAND_MOTION.startKeys[0];
  let lastRight: number = HAND_MOTION.startKeys[1];
  for (const group of groupChords(notes, loudness)) {
    const keys = notes
      .slice(group.first, group.first + group.count)
      .map((n) => n.pitch)
      .toSorted((a, b) => a - b);
    const part = (low: number, high: number): HandNote => ({
      start: group.start,
      low,
      high,
      loudness: group.loudness,
    });
    if (group.high - group.low > HAND_MOTION.span) {
      // Of two equal intervals, the one nearer to the middle of the chord splits it.
      const gapAt = (i: number): number => (keys[i] ?? 0) - (keys[i - 1] ?? 0);
      const offMiddle = (i: number): number => Math.abs(i - keys.length / 2);
      let cut = 1;
      for (let i = 2; i < keys.length; i++) {
        if (gapAt(i) > gapAt(cut) || (gapAt(i) === gapAt(cut) && offMiddle(i) < offMiddle(cut))) {
          cut = i;
        }
      }
      const below = keys[cut - 1] ?? group.low;
      const above = keys[cut] ?? group.high;
      left.push(part(group.low, below));
      right.push(part(above, group.high));
      lastLeft = (group.low + below) / 2;
      lastRight = (above + group.high) / 2;
      continue;
    }
    const middle = (group.low + group.high) / 2;
    const toLeft = Math.abs(middle - lastLeft);
    const toRight = Math.abs(middle - lastRight);
    if (toRight < toLeft || (toRight === toLeft && middle >= 60)) {
      right.push(part(group.low, group.high));
      lastRight = middle;
    } else {
      left.push(part(group.low, group.high));
      lastLeft = middle;
    }
  }
  return [left, right];
}

/** The note data of one hand that the pose looks up at each frame. */
export interface HandTrack {
  readonly action: HandAction;
  /** The place of the palm before the first note, in the model axes. */
  readonly first: Vec3;
  /** The start of each note of the hand, sorted. */
  readonly starts: Float64Array;
  /**
   * The start and the end of the move of the hand to each note. A strike ends its move at the
   * note start. A pluck ends it a short rest before the note start.
   */
  readonly moveStarts: Float64Array;
  readonly moveEnds: Float64Array;
  /** The time of the pluck of each note. 0 for a strike. */
  readonly pluckTimes: Float64Array;
  /** The place of the palm for each note, in the model axes: three numbers for each note. */
  readonly points: Float64Array;
  /** The gesture size of each note (design 5.3). */
  readonly gestures: Float64Array;
}

/**
 * Calculates the note data of one hand (design 5.3).
 *
 * @param notes The notes of the hand, sorted by start.
 * @param action How the hand plays.
 * @param pointOf Gives the place of the palm for the lowest and the highest key of a note.
 * @param amplitude The seeded amplitude of the player.
 * @param firstKey The key of the hand before its first note.
 * @returns The note data.
 */
export function buildHandTrack(
  notes: readonly HandNote[],
  action: HandAction,
  pointOf: (low: number, high: number) => Vec3,
  amplitude: number,
  firstKey: number,
): HandTrack {
  const m = HAND_MOTION;
  const plucks = action === 'pluck';
  const gapAfter = (i: number): number => {
    const next = notes[i + 1];
    const note = notes[i];
    return next && note ? next.start - note.start : Infinity;
  };
  const pluckTimes = Float64Array.from(notes, (_, i) =>
    plucks ? Math.min(m.pluckSec, 0.3 * gapAfter(i)) : 0,
  );
  const rests = notes.map((_, i) => (plucks ? Math.min(m.restSec, 0.2 * gapAfter(i - 1)) : 0));
  const moveEnds = Float64Array.from(notes, (n, i) => n.start - (rests[i] ?? 0));
  const moveStarts = Float64Array.from(notes, (_, i) => {
    const gap = gapAfter(i - 1);
    const free = plucks ? gap - (rests[i] ?? 0) - (pluckTimes[i - 1] ?? 0) : m.strikeMove * gap;
    return (moveEnds[i] ?? 0) - Math.min(m.moveSec, free);
  });
  return {
    action,
    first: pointOf(firstKey, firstKey),
    starts: Float64Array.from(notes, (n) => n.start),
    moveStarts,
    moveEnds,
    pluckTimes,
    points: Float64Array.from(notes.flatMap((n) => pointOf(n.low, n.high))),
    gestures: Float64Array.from(notes, (n) => gestureSize(n.loudness, amplitude)),
  };
}

/** The motion of one hand at one time. The pose reads it. */
export interface HandState {
  /** The place of the palm on its keys or strings, in the model axes. */
  readonly point: [number, number, number];
  /** The lift of a piano hand above its keys, in meters. */
  lift: number;
  /** The pull of a harp palm away from the strings, in meters. */
  pull: number;
  /** The close of the fingers after a pluck, from 0 to 1. */
  closed: number;
}

/**
 * Makes a hand state with no motion.
 *
 * @returns The state.
 */
export function createHandState(): HandState {
  return { point: [0, 0, 0], lift: 0, pull: 0, closed: 0 };
}

/**
 * Calculates the motion of one hand at a song time (design 5.3). The hand moves to the place of
 * each note before the note, in at most 0.15 s. A piano hand lifts in the move and strikes the
 * keys at the note start. A harp hand rests on its string, plucks at the note start, and pulls
 * away from the strings. It comes back to the strings in the move to the next note.
 *
 * @param track The note data of the hand.
 * @param time The song time of the note layer.
 * @param out The state to write.
 */
export function handStateAt(track: HandTrack, time: number, out: HandState): void {
  const i = lastAtOrBefore(track.moveStarts, time);
  const p = track.points;
  const moveStart = track.moveStarts[i];
  const moveEnd = track.moveEnds[i];
  const start = track.starts[i];
  if (moveStart === undefined || moveEnd === undefined || start === undefined) {
    out.point[0] = track.first[0];
    out.point[1] = track.first[1];
    out.point[2] = track.first[2];
    out.lift = 0;
    out.pull = 0;
    out.closed = 0;
    return;
  }
  const progress = clamp01((time - moveStart) / (moveEnd - moveStart));
  const eased = smoothstep(progress);
  for (let k = 0; k < 3; k++) {
    // The move starts at the place of the note before, or at the first place.
    const a = (i > 0 ? p[3 * i - 3 + k] : track.first[k]) ?? 0;
    out.point[k] = a + ((p[3 * i + k] ?? a) - a) * eased;
  }
  const gesture = track.gestures[i] ?? 1;
  if (track.action === 'strike') {
    // The lift ends with its full speed at the note start: the hand strikes the keys.
    out.lift = time < moveEnd ? Math.sin(Math.PI * progress) * HAND_MOTION.lift * gesture : 0;
    out.pull = 0;
    out.closed = 0;
    return;
  }
  // Before the move, the hand is away from the strings after the pluck of the note before.
  const before = i > 0 ? (track.gestures[i - 1] ?? 1) * (1 - eased) : 0;
  const pluck = time < start ? 0 : smoothstep((time - start) / (track.pluckTimes[i] ?? 1));
  out.lift = 0;
  out.closed = time < start ? (i > 0 ? 1 - eased : 0) : pluck;
  out.pull = HAND_MOTION.pull * (time < start ? before : gesture * pluck);
}
