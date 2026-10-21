import { lastAtOrBefore } from '../pose/blend.ts';
import type { Beat, PlayerNote } from '../score/types.ts';

/** The shortest rest before an entry of the camera, in full bars (design 5.6). */
const ENTRY_REST_BARS = 2;

/**
 * The shortest rest before an entry of the camera, in seconds (design 5.6). Two bars of the
 * Boulanger demo last 2.5 s, and its seats then had 125 entries in 280 s: one in each 2.2 s.
 */
const ENTRY_REST_SEC = 4;

/** An entry of a seat after a long rest: a cut point and a subject of the camera. */
interface Entry {
  /** The start of the first note of the entry, in song seconds. */
  readonly start: number;
  readonly seatIndex: number;
  /** The start of the rest before the entry: the end of the last note before it, or 0. */
  readonly restFrom: number;
}

/**
 * Finds each entry of a seat for the camera (design 5.6): the first note of a seat after a rest of
 * at least two full bars and at least 4 s. The start of the song counts as the end of a rest.
 *
 * @param beats The conducted beats of the score.
 * @param notes The notes of the score, sorted by start.
 * @param seats The number of seats of the score.
 * @param hasPlayers Tells whether a seat has players. The sound-only seat has none.
 * @returns The entries, sorted by start, then by seat.
 */
export function findEntries(
  beats: readonly Beat[],
  notes: readonly PlayerNote[],
  seats: number,
  hasPlayers: (seatIndex: number) => boolean,
): Entry[] {
  const downbeats = Float64Array.from(
    beats.filter((b) => b.indexInBar === 0),
    (b) => b.timeSec,
  );
  /** Counts the full bars in a rest: the downbeats in it, less the bar of its end. */
  const fullBars = (from: number, to: number): number =>
    lastAtOrBefore(downbeats, to) - lastAtOrBefore(downbeats, from - 1e-9) - 1;
  const lastEnd = new Float64Array(seats);
  const entries: Entry[] = [];
  for (const note of notes) {
    const seat = note.seatIndex;
    if (!hasPlayers(seat)) {
      continue;
    }
    const end = lastEnd[seat] ?? 0;
    const rest = note.startSec - end;
    if (rest >= ENTRY_REST_SEC - 1e-9 && fullBars(end, note.startSec) >= ENTRY_REST_BARS) {
      entries.push({ start: note.startSec, seatIndex: seat, restFrom: end });
    }
    lastEnd[seat] = Math.max(end, note.endSec);
  }
  return entries.toSorted((a, b) => a.start - b.start || a.seatIndex - b.seatIndex);
}
