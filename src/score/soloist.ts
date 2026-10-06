import type { PlayerNote, Seat, SectionId } from './types.ts';

/**
 * The values of the soloist rule (design 3.8). The user decided on 2026-10-06 that a seat that
 * is clearly the soloist sits at the front left of the conductor, as in a concerto (UX audit
 * 2026-10-05, AM3).
 */
export const SOLOIST_RULE = {
  /** The step at which the rule reads the notes, in seconds. */
  stepSec: 0.1,
  /** The soloist sounds in this part of the piece or more, from its first note to its end. */
  coverage: 0.5,
  /**
   * In this part of its sounding time or more, the soloist is above the orchestra: its highest
   * key is above each key of the other pitched seats, or its velocity is above the loudness
   * share times the highest velocity of the other seats.
   */
  above: 0.75,
  /** The velocity of the soloist is at least this factor of the highest other velocity. */
  louder: 1.2,
  /** In this part of its sounding time or more, two or more other seats sound with it. */
  accompanied: 0.6,
  /** The orchestra: at least this many other seats with players. */
  orchestra: 3,
} as const;

/**
 * The sections whose seat can be a soloist. The timpani and the percussion carry no melody, and
 * a choir seat is a group of singers.
 */
const SOLO_SECTIONS: ReadonlySet<SectionId> = new Set<SectionId>([
  'violin',
  'viola',
  'cello',
  'contrabass',
  'harp',
  'piano',
  'flute',
  'oboe',
  'clarinet',
  'bassoon',
  'horn',
  'trumpet',
  'trombone',
  'tuba',
]);

/**
 * The last GM program of a piano: the acoustic and the electric pianos are 0 to 5 (design 3.5).
 * The harpsichord (6), the clavinet (7), the celesta (8), and the organs (16 to 23) also go to
 * the piano section, but they play in the orchestra.
 */
const LAST_PIANO_PROGRAM = 5;

/**
 * Finds if a seat is a piano: a seat of the piano section with a program of a piano. A celesta
 * or a harpsichord of the orchestra plays color or continuo, so it is not a concerto soloist.
 *
 * @param seat The seat.
 * @returns True for a piano.
 */
export function isPianoSeat(seat: Seat): boolean {
  return seat.section === 'piano' && seat.programs.some((p) => p <= LAST_PIANO_PROGRAM);
}

/** The notes of one seat on the grid of the rule. */
interface SeatGrid {
  /** The highest key that sounds at each step, or -1. */
  readonly top: Int8Array;
  /** The highest velocity that sounds at each step, or 0. */
  readonly velocity: Uint8Array;
}

/**
 * Writes the notes of each seat on a grid of steps of 0.1 s.
 *
 * @param seats The seats.
 * @param notes The player notes.
 * @param steps The number of steps.
 * @returns One grid for each seat.
 */
function gridOf(
  seats: readonly Seat[],
  notes: readonly PlayerNote[],
  steps: number,
): readonly SeatGrid[] {
  const grids = seats.map((): SeatGrid => ({
    top: new Int8Array(steps).fill(-1),
    velocity: new Uint8Array(steps),
  }));
  const step = SOLOIST_RULE.stepSec;
  for (const note of notes) {
    const grid = grids[note.seatIndex];
    if (!grid) {
      continue;
    }
    const from = Math.max(0, Math.round(note.startSec / step));
    const to = Math.min(steps, Math.round(note.endSec / step));
    for (let i = from; i < to; i++) {
      grid.top[i] = Math.max(grid.top[i] ?? -1, note.pitch);
      grid.velocity[i] = Math.max(grid.velocity[i] ?? 0, note.velocity);
    }
  }
  return grids;
}

/** The measures of the soloist rule for one seat (design 3.8). */
export interface SoloMeasures {
  /** The part of the piece in which the seat sounds, from the first note of the piece. */
  readonly coverage: number;
  /** The part of its sounding time in which it is above the orchestra. */
  readonly above: number;
  /** The part of its sounding time in which two or more other seats sound with it. */
  readonly accompanied: number;
}

/**
 * Measures a seat for the soloist rule (design 3.8). The seat is a candidate when it has one
 * player, its section can carry a solo, no other seat with players has its section, and at least
 * three other seats have players.
 *
 * @param index The seat.
 * @param seats The seats.
 * @param grids The grid of each seat.
 * @param span The steps from the first note to the end of the piece.
 * @returns The measures, or `null` if the seat is not a candidate.
 */
function measure(
  index: number,
  seats: readonly Seat[],
  grids: readonly SeatGrid[],
  span: readonly [number, number],
): SoloMeasures | null {
  const seat = seats[index];
  const own = grids[index];
  if (!seat || !own || seat.playerCount !== 1 || !SOLO_SECTIONS.has(seat.section)) {
    return null;
  }
  const rule = SOLOIST_RULE;
  const others = seats.flatMap((s, i) => (i !== index && s.playerCount > 0 ? [i] : []));
  // The first violins of a string quartet lead, but they share the section with other seats.
  const shared = others.some((i) => seats[i]?.section === seat.section);
  if (shared || others.length < rule.orchestra) {
    return null;
  }
  let sounding = 0;
  let above = 0;
  let accompanied = 0;
  for (let t = span[0]; t < span[1]; t++) {
    const key = own.top[t] ?? -1;
    if (key < 0) {
      continue;
    }
    sounding++;
    let otherKey = -1;
    let otherVelocity = 0;
    let along = 0;
    for (const i of others) {
      const grid = grids[i];
      const top = grid?.top[t] ?? -1;
      if (top < 0) {
        continue;
      }
      along++;
      otherVelocity = Math.max(otherVelocity, grid?.velocity[t] ?? 0);
      if (SOLO_SECTIONS.has(seats[i]?.section ?? 'percussion')) {
        otherKey = Math.max(otherKey, top);
      }
    }
    if (key > otherKey || (own.velocity[t] ?? 0) >= rule.louder * otherVelocity) {
      above++;
    }
    if (along >= 2) {
      accompanied++;
    }
  }
  const heard = Math.max(1, sounding);
  return {
    coverage: sounding / Math.max(1, span[1] - span[0]),
    above: above / heard,
    accompanied: accompanied / heard,
  };
}

/**
 * Finds if the measures of a seat pass the soloist rule: it sounds in half the piece or more, it
 * is above the orchestra in register or in loudness in three quarters of its sounding time, and
 * two or more other seats sound with it in 0.6 of that time.
 *
 * @param m The measures of a candidate.
 * @returns True if the seat is clearly the soloist.
 */
export function passesSoloistRule(m: SoloMeasures): boolean {
  const rule = SOLOIST_RULE;
  return m.coverage >= rule.coverage && m.above >= rule.above && m.accompanied >= rule.accompanied;
}

/**
 * Measures each seat for the soloist rule (design 3.8).
 *
 * @param seats The seats, with their player counts.
 * @param notes The player notes, sorted by start.
 * @param durationSec The time of the last note-off.
 * @returns The measures of each seat, or `null` for a seat that is not a candidate.
 */
export function measureSoloists(
  seats: readonly Seat[],
  notes: readonly PlayerNote[],
  durationSec: number,
): (SoloMeasures | null)[] {
  const first = notes[0];
  if (!first) {
    return seats.map(() => null);
  }
  const steps = Math.ceil(durationSec / SOLOIST_RULE.stepSec) + 1;
  const grids = gridOf(seats, notes, steps);
  const span = [Math.round(first.startSec / SOLOIST_RULE.stepSec), steps] as const;
  return seats.map((_, i) => measure(i, seats, grids, span));
}

/**
 * Finds the soloist of a score: the seat that sits at the front left of the conductor, as in a
 * concerto (design 3.8, 4.2). A piano seat with players ({@link isPianoSeat}) is the soloist,
 * because a piano with an orchestra has the layout of a piano concerto. Else the soloist is the
 * one seat that clearly leads ({@link SOLOIST_RULE}). Two such seats, as in a double concerto,
 * give no soloist. A celesta, a harpsichord, or an organ is a soloist only by this rule.
 *
 * @param seats The seats, with their player counts.
 * @param notes The player notes, sorted by start.
 * @param durationSec The time of the last note-off.
 * @returns The index of the seat, or `null` if no seat is the soloist.
 */
export function findSoloist(
  seats: readonly Seat[],
  notes: readonly PlayerNote[],
  durationSec: number,
): number | null {
  const piano = seats.findIndex((seat) => isPianoSeat(seat) && seat.playerCount > 0);
  if (piano >= 0) {
    return piano;
  }
  const soloists = measureSoloists(seats, notes, durationSec).flatMap((m, i) =>
    m && passesSoloistRule(m) ? [i] : [],
  );
  return soloists.length === 1 ? (soloists[0] ?? null) : null;
}
