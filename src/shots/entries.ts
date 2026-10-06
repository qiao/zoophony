import { lastAtOrBefore } from '../pose/blend.ts';
import type { Beat, PlayerNote } from '../score/types.ts';

/** The shortest rest before an entry of the camera, in full bars (design 5.6). */
export const ENTRY_REST_BARS = 2;

/** An entry of a seat after a long rest: a cut point and a subject of the camera. */
export interface Entry {
  /** The start of the first note of the entry, in song seconds. */
  readonly start: number;
  readonly seatIndex: number;
}

/**
 * Finds each entry of a seat for the camera (design 5.6): the first note of a seat after a rest of
 * at least two full bars. The start of the song counts as the end of a rest.
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
    if (note.startSec >= end && fullBars(end, note.startSec) >= ENTRY_REST_BARS) {
      entries.push({ start: note.startSec, seatIndex: seat });
    }
    lastEnd[seat] = Math.max(end, note.endSec);
  }
  return entries.toSorted((a, b) => a.start - b.start || a.seatIndex - b.seatIndex);
}
