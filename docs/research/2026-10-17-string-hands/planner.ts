/**
 * A prototype of a position planner for the left hand of the bowed strings (research of
 * 2026-10-17, `docs/research/2026-10-17-string-hands.md`). It is a pure function: it reads the
 * pitches and the times of the strokes of one player, and it gives each stroke a string, a hand
 * position, and a finger. The hand stays in a position while the notes fit in it, and the fingers
 * reach the notes on all strings. A dynamic program (Viterbi) finds the plan of the lowest cost:
 * the cost of each shift, of a high position, of an extension, of an open string, and of a string
 * crossing.
 *
 * The probe `hand-moves.ts` runs it on the string parts of the demos. It is not app code.
 */

/** The hand frame of one instrument: the notes that the four fingers reach in one position. */
export interface HandFrame {
  /**
   * The notes that the fingers reach in a neck position with no extension, as semitones from the
   * position: the place of the first finger, a whole tone above the open string in the first
   * position. The first finger of the violin and the viola also takes the semitone below it.
   */
  readonly reach: readonly [low: number, high: number];
  /** The semitones that an extension or a pivot adds below and above {@link HandFrame.reach}. */
  readonly extend: readonly [down: number, up: number];
  /** The finger of each semitone of the reach and of its extensions, from the lowest. */
  readonly fingers: readonly number[];
  /** The lowest position of the thumb position, in semitones above the open string. */
  readonly thumbFrom: number;
  /** The reach of the thumb position, from the thumb (0) up. */
  readonly thumbReach: number;
  /** The finger of each semitone of the thumb position, from the thumb (0). */
  readonly thumbFingers: readonly number[];
  /** The highest position: the semitones of the first finger (or the thumb) above the open string. */
  readonly top: number;
  /** The vibrating length of the open string, in meters. */
  readonly stringLength: number;
}

/** The weights of the cost of a plan. The unit is free: only the ratios count. */
export interface PlanWeights {
  /** The cost of each shift. */
  readonly shift: number;
  /** The cost of each semitone of a shift. */
  readonly shiftPerSemitone: number;
  /**
   * The time in seconds that makes a shift twice as costly: the shift cost is multiplied by
   * `1 + quickSec / dt`, where `dt` is the time from the start of the last note to the new note.
   */
  readonly quickSec: number;
  /**
   * The factor of the shift cost when the hand is free before the note: after an open string, or
   * after a rest of at least {@link PlanWeights.freeGapSec}.
   */
  readonly freeShift: number;
  /** A rest of at least this length frees the hand for a shift, in seconds. */
  readonly freeGapSec: number;
  /** The cost of each semitone of the position above {@link PlanWeights.homePosition}. */
  readonly height: number;
  /** The position with no height cost: the first position. */
  readonly homePosition: number;
  /** The extra cost of the half position (the first finger one semitone above the nut). */
  readonly halfPosition: number;
  /** The extra cost of a note in the thumb position. */
  readonly thumb: number;
  /** The cost of a note that needs an extension of the hand frame. */
  readonly extension: number;
  /** The cost of an open string for a short note. */
  readonly open: number;
  /** The cost of an open string for a note of at least {@link PlanWeights.longSec}. */
  readonly openLong: number;
  /** A note of at least this length wants vibrato, so an open string costs more, in seconds. */
  readonly longSec: number;
  /** The cost of each string that the bow crosses from one stroke to the next. */
  readonly crossing: number;
}

/** The pitches and the times of one stroke. */
export interface StrokePitch {
  /** The note start, in song seconds. */
  readonly start: number;
  /** The end of the sound, in song seconds. */
  readonly end: number;
  /** The lowest and the highest MIDI key of the stroke. Two keys make a double stop. */
  readonly low: number;
  readonly high: number;
}

/** The plan of the left hand for one stroke. */
export interface HandStep {
  /** The string coordinate of the bow: 0 is the lowest string, and a double stop lies between. */
  readonly string: number;
  /** The position: the semitones of the first finger (or the thumb) above the open string. */
  readonly position: number;
  /** True when the high note of the stroke is an open string. */
  readonly open: boolean;
  /** The finger of the high note: 0 for the thumb or an open string, 1 to 4 for a finger. */
  readonly finger: number;
  /** True when the high note needs an extension of the hand frame. */
  readonly extended: boolean;
  /** The place of the middle of the hand frame, in meters from the nut. */
  readonly handPlace: number;
  /** The place of the stopped high note, in meters from the nut. The nut for an open string. */
  readonly notePlace: number;
}

/** One candidate of a stroke for the dynamic program. */
interface Candidate {
  readonly string: number;
  readonly position: number;
  readonly open: boolean;
  readonly finger: number;
  readonly extended: boolean;
  readonly semitones: number;
  /** The cost of the candidate alone. */
  readonly cost: number;
}

/**
 * Gives the place of a stop on the string, in meters from the nut.
 *
 * @param semitones The semitones above the open string.
 * @param stringLength The vibrating length of the open string, in meters.
 * @returns The place.
 */
export function stopPlace(semitones: number, stringLength: number): number {
  return stringLength * (1 - 2 ** (-semitones / 12));
}

/**
 * Gives the reach of the hand frame in a position, with no extension.
 *
 * @param frame The hand frame.
 * @param position The position.
 * @returns The lowest and the highest semitone from the position.
 */
function reachAt(frame: HandFrame, position: number): readonly [number, number] {
  return position >= frame.thumbFrom ? [0, frame.thumbReach] : frame.reach;
}

/**
 * Gives the place of the middle of the hand frame in a position, in meters from the nut.
 *
 * @param frame The hand frame.
 * @param position The position.
 * @returns The place.
 */
export function handPlaceOf(frame: HandFrame, position: number): number {
  const [low, high] = reachAt(frame, position);
  return stopPlace(position + (low + high) / 2, frame.stringLength);
}

/**
 * Gives the finger that stops a note in a position: 0 for the thumb, 1 (the index finger) to 4.
 *
 * @param frame The hand frame.
 * @param position The position.
 * @param semitones The semitones of the note above the open string.
 * @returns The finger.
 */
function fingerOf(frame: HandFrame, position: number, semitones: number): number {
  const offset = semitones - position;
  if (position >= frame.thumbFrom) {
    return frame.thumbFingers[Math.min(frame.thumbReach, Math.max(0, offset))] ?? 3;
  }
  const first = frame.reach[0] - frame.extend[0];
  return frame.fingers[offset - first] ?? 4;
}

/**
 * Gives the candidates of one stopped or open note on one string, for each position that reaches
 * it.
 *
 * @param frame The hand frame.
 * @param weights The weights.
 * @param string The string.
 * @param semitones The semitones above the open string.
 * @param duration The note length, in seconds.
 * @returns The positions with their finger, their extension, and their cost.
 */
function placesOf(
  frame: HandFrame,
  weights: PlanWeights,
  string: number,
  semitones: number,
  duration: number,
): Candidate[] {
  const out: Candidate[] = [];
  for (let position = 1; position <= frame.top; position++) {
    const thumb = position >= frame.thumbFrom;
    let height = weights.height * Math.max(0, position - weights.homePosition);
    if (position < weights.homePosition) {
      height += weights.halfPosition;
    }
    if (thumb) {
      height += weights.thumb;
    }
    if (semitones === 0) {
      const open = duration >= weights.longSec ? weights.openLong : weights.open;
      out.push({
        string,
        position,
        open: true,
        finger: 0,
        extended: false,
        semitones,
        cost: open + height,
      });
      continue;
    }
    const [low, high] = reachAt(frame, position);
    const offset = semitones - position;
    const [down, up] = thumb ? [0, 0] : frame.extend;
    if (offset < low - down || offset > high + up) {
      continue;
    }
    const extended = offset < low || offset > high;
    out.push({
      string,
      position,
      open: false,
      finger: fingerOf(frame, position, semitones),
      extended,
      semitones,
      cost: height + (extended ? weights.extension : 0),
    });
  }
  return out;
}

/**
 * Gives the candidates of a stroke: a single note on each string that has it, or a double stop
 * on two neighbor strings in one position.
 *
 * @param stroke The stroke.
 * @param tuning The open strings, low to high, as MIDI keys.
 * @param frame The hand frame.
 * @param weights The weights.
 * @returns The candidates. A pitch below the lowest string takes the lowest open string, and a
 *   pitch above the highest place takes the highest place.
 */
function candidatesOf(
  stroke: StrokePitch,
  tuning: readonly number[],
  frame: HandFrame,
  weights: PlanWeights,
): Candidate[] {
  const duration = stroke.end - stroke.start;
  const lowest = tuning[0] ?? 0;
  const topString = tuning.length - 1;
  const highestKey = (tuning[topString] ?? 0) + frame.top + frame.thumbReach;
  const clampKey = (key: number): number => Math.min(highestKey, Math.max(lowest, key));
  const high = clampKey(stroke.high);
  const low = clampKey(stroke.low);

  const singles = (key: number): Candidate[] =>
    tuning.flatMap((open, string) =>
      key >= open ? placesOf(frame, weights, string, key - open, duration) : [],
    );
  if (high === low) {
    return singles(high);
  }

  // A double stop: the high note on a string, and the low note on the string below, in the same
  // position. The bow lies between the two strings.
  const out: Candidate[] = [];
  for (let string = 1; string < tuning.length; string++) {
    const upper = tuning[string] ?? 0;
    const under = tuning[string - 1] ?? 0;
    if (high < upper || low < under) {
      continue;
    }
    const tops = placesOf(frame, weights, string, high - upper, duration);
    const bottoms = placesOf(frame, weights, string - 1, low - under, duration);
    for (const t of tops) {
      const b = bottoms.find((c) => c.position === t.position);
      if (b) {
        out.push({ ...t, string: string - 0.5, cost: t.cost + b.cost });
      }
    }
  }
  return out.length > 0 ? out : singles(high);
}

/**
 * Plans the left hand of one bowed string player (research of 2026-10-17). The hand keeps its
 * position while the fingers reach the notes, and shifts only when the cost of the shift is
 * lower than the cost of the other choices. A shift costs more in a fast passage and less after
 * an open string or a rest, because the hand then has time to move. A high position, an
 * extension, an open string, and a string crossing also cost.
 *
 * @param strokes The strokes of the player, sorted by start.
 * @param tuning The open strings, low to high, as MIDI keys.
 * @param frame The hand frame of the instrument.
 * @param weights The weights of the cost.
 * @returns One step for each stroke.
 */
export function planHand(
  strokes: readonly StrokePitch[],
  tuning: readonly number[],
  frame: HandFrame,
  weights: PlanWeights,
): HandStep[] {
  const layers = strokes.map((s) => candidatesOf(s, tuning, frame, weights));
  const costs: Float64Array[] = [];
  const from: Int32Array[] = [];
  for (const [i, layer] of layers.entries()) {
    const total = new Float64Array(layer.length);
    const back = new Int32Array(layer.length).fill(-1);
    const previous = layers[i - 1];
    const previousCost = costs[i - 1];
    const stroke = strokes[i];
    const before = strokes[i - 1];
    for (const [j, c] of layer.entries()) {
      if (!previous || !previousCost || !stroke || !before) {
        total[j] = c.cost;
        continue;
      }
      const dt = Math.max(1e-3, stroke.start - before.start);
      const gap = stroke.start - before.end;
      let best = Infinity;
      let arg = -1;
      for (const [k, p] of previous.entries()) {
        let move = 0;
        if (p.position !== c.position) {
          const free = p.open || gap >= weights.freeGapSec ? weights.freeShift : 1;
          const distance = Math.abs(p.position - c.position);
          move =
            (weights.shift + weights.shiftPerSemitone * distance) *
            (1 + weights.quickSec / dt) *
            free;
        }
        const value =
          (previousCost[k] ?? Infinity) + move + weights.crossing * Math.abs(p.string - c.string);
        if (value < best) {
          best = value;
          arg = k;
        }
      }
      total[j] = best + c.cost;
      back[j] = arg;
    }
    costs.push(total);
    from.push(back);
  }

  // Walk back from the cheapest end.
  const picks = new Array<number>(layers.length).fill(0);
  const last = costs[costs.length - 1];
  if (last) {
    let arg = 0;
    for (let j = 1; j < last.length; j++) {
      if ((last[j] ?? Infinity) < (last[arg] ?? Infinity)) {
        arg = j;
      }
    }
    for (let i = layers.length - 1; i >= 0; i--) {
      picks[i] = arg;
      arg = from[i]?.[arg] ?? 0;
    }
  }
  return layers.map((layer, i) => {
    const c = layer[picks[i] ?? 0];
    if (!c) {
      throw new Error(`Stroke ${i} has no candidate.`);
    }
    return {
      string: c.string,
      position: c.position,
      open: c.open,
      finger: c.finger,
      extended: c.extended,
      handPlace: handPlaceOf(frame, c.position),
      notePlace: stopPlace(c.semitones, frame.stringLength),
    };
  });
}
