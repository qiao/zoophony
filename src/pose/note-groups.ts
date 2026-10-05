import type { PlayerNote } from '../score/types.ts';

/**
 * A note that starts at most this long after the first note of a group joins the group, as a
 * chord joins in design 3.8. A bowed string bows the group as a double stop, and a wind player
 * shows its highest note (design 5.3).
 */
export const CHORD_SEC = 0.05;

/**
 * A rest of at least this length ends a phrase (design 5.3). The next bow stroke is a down-bow at
 * the frog, and a wind player breathes in before the next phrase.
 */
export const PHRASE_GAP_SEC = 0.5;

/** The notes of one player that start within {@link CHORD_SEC} of the first of them. */
export interface NoteGroup {
  /** The start of the first note, in song seconds. */
  readonly start: number;
  /** The latest end of the notes of the group. */
  readonly end: number;
  /** The lowest and the highest pitch of the notes of the group. */
  readonly low: number;
  readonly high: number;
  /** The highest loudness of the notes of the group. */
  readonly loudness: number;
  /** The index of the first note of the group in the notes of the player. */
  readonly first: number;
  /** The number of notes of the group. */
  readonly count: number;
}

/**
 * Groups the notes of one player that start together (design 5.3, as a chord of 3.8).
 *
 * @param notes The notes of the player, sorted by start.
 * @param loudness The loudness of each note, in the order of `notes`. A missing value is 0.
 * @returns The groups, sorted by start. Each note is in one group.
 */
export function groupChords(
  notes: readonly PlayerNote[],
  loudness: readonly number[] = [],
): NoteGroup[] {
  const groups: NoteGroup[] = [];
  for (let i = 0; i < notes.length;) {
    const first = notes[i];
    if (!first) {
      break;
    }
    let end = first.endSec;
    let low = first.pitch;
    let high = first.pitch;
    let loud = loudness[i] ?? 0;
    let j = i + 1;
    for (; j < notes.length; j++) {
      const next = notes[j];
      if (!next || next.startSec - first.startSec > CHORD_SEC) {
        break;
      }
      end = Math.max(end, next.endSec);
      low = Math.min(low, next.pitch);
      high = Math.max(high, next.pitch);
      loud = Math.max(loud, loudness[j] ?? 0);
    }
    groups.push({ start: first.startSec, end, low, high, loudness: loud, first: i, count: j - i });
    i = j;
  }
  return groups;
}
