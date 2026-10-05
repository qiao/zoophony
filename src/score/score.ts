import { buildBeats } from './beats.ts';
import { assignPlayers } from './players.ts';
import { assignSeats } from './seats.ts';
import { titleSequenceName } from './sequence-name.ts';
import { buildSynthEvents, listPresets } from './synth.ts';
import { buildTimeline } from './timeline.ts';
import type { ScoreResult, SectionSize } from './types.ts';

/**
 * Builds the score of a Standard MIDI File: the seats, the player notes, the beats, the synth
 * events, and the presets (design 3.1, 3.2). This is the entry of `score/` for the app. The
 * sound and the visuals both come from this score.
 *
 * @param bytes The bytes of the file.
 * @param sectionSize The value of the setting "Section size" (2.8, 3.8).
 * @returns The score, or the reason to refuse the file. The UI shows the text of design 2.8 for
 *   each reason. A file with more than 100,000 beats is `not-midi` (3.3).
 */
export function buildScore(bytes: Uint8Array, sectionSize: SectionSize): ScoreResult {
  const result = buildTimeline(bytes);
  if (!result.ok) {
    return result;
  }
  const timeline = result.timeline;
  const durationSec = timeline.notes.reduce((end, note) => Math.max(end, note.endSec), 0);
  const beats = buildBeats(timeline, durationSec);
  if (!beats) {
    return { ok: false, error: 'not-midi' };
  }
  const seating = assignSeats(timeline);
  const cast = assignPlayers(timeline, seating, sectionSize);
  return {
    ok: true,
    score: {
      durationSec,
      sequenceName: titleSequenceName(timeline.sequenceName),
      orchestral: cast.orchestral,
      seats: cast.seats,
      notes: cast.notes,
      beats,
      synthEvents: buildSynthEvents(timeline, seating.noteSeats),
      presets: listPresets(timeline.notes),
    },
  };
}
