import { describe, expect, it } from 'vitest';

import { noteOff, noteOn, note, programChange, tempo, track } from '../midi/test-smf.ts';
import type { TestEvent } from '../midi/test-smf.ts';
import { scoreOf } from '../score/test-score.ts';
import type { PlayerNote } from '../score/types.ts';
import { noteLoudness } from './loudness.ts';
import { groupChords } from './note-groups.ts';

/** The notes of one player, with their loudness. */
interface PlayerNotes {
  readonly notes: readonly PlayerNote[];
  readonly loudness: readonly number[];
}

/**
 * Builds the notes and the loudness of one violin player. At 125 BPM and 480 ticks for each
 * quarter note, one tick is 1 ms.
 */
function notesOf(...events: (readonly TestEvent[])[]): PlayerNotes {
  const score = scoreOf(
    { tracks: [track([tempo(0, 125), programChange(0, 0, 40)], ...events)] },
    'one-per-part',
  );
  return { notes: score.notes, loudness: [...noteLoudness(score)] };
}

describe('groupChords (design 5.3)', () => {
  it('joins the notes that start within 50 ms of the first note of a group', () => {
    const { notes, loudness } = notesOf(
      note(0, 0, 60, 400),
      note(30, 0, 67, 500),
      note(50, 0, 64, 300),
      note(51, 0, 72, 600),
      note(700, 0, 62, 900),
    );
    const groups = groupChords(notes, loudness);
    expect(groups.map((g) => [g.start, g.first, g.count])).toEqual([
      [0, 0, 3],
      [0.051, 3, 1],
      [0.7, 4, 1],
    ]);
    expect(groups[0]).toMatchObject({ end: 0.5, low: 60, high: 67 });
  });

  it('keeps the highest loudness of a group, and 0 with no loudness', () => {
    const { notes, loudness } = notesOf(
      [noteOn(0, 0, 60, 40), noteOff(400, 0, 60)],
      [noteOn(10, 0, 64, 120), noteOff(400, 0, 64)],
    );
    expect(groupChords(notes, loudness)[0]?.loudness).toBeCloseTo((120 / 127) * (100 / 127), 6);
    expect(groupChords(notes)[0]?.loudness).toBe(0);
  });
});
