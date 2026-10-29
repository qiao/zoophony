import { buildBeats } from './beats.ts';
import { assignPlayersSteps } from './players.ts';
import { assignSeatsSteps } from './seats.ts';
import { titleSequenceName } from './sequence-name.ts';
import { runAll } from './steps.ts';
import type { Steps } from './steps.ts';
import { buildSynthEvents, listPresets } from './synth.ts';
import { buildTimelineSteps } from './timeline.ts';
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
  return runAll(buildScoreSteps(bytes, sectionSize));
}

/**
 * Builds the score of a Standard MIDI File as {@link buildScore} does, in steps (design 7.2).
 *
 * @param bytes The bytes of the file.
 * @param sectionSize The value of the setting "Section size" (2.8, 3.8).
 * @returns The steps, which return the score or the reason to refuse the file.
 */
export function* buildScoreSteps(bytes: Uint8Array, sectionSize: SectionSize): Steps<ScoreResult> {
  const result = yield* buildTimelineSteps(bytes);
  if (!result.ok) {
    return result;
  }
  const timeline = result.timeline;
  const beats = buildBeats(timeline);
  if (!beats) {
    return { ok: false, error: 'not-midi' };
  }
  yield;
  const seating = yield* assignSeatsSteps(timeline);
  yield;
  const cast = yield* assignPlayersSteps(timeline, seating, sectionSize);
  yield;
  return {
    ok: true,
    score: {
      durationSec: timeline.durationSec,
      sequenceName: titleSequenceName(timeline.sequenceName),
      orchestral: cast.orchestral,
      soloist: cast.soloist,
      vocalSoloists: cast.vocalSoloists,
      seats: cast.seats,
      notes: cast.notes,
      beats,
      synthEvents: buildSynthEvents(timeline, seating.noteSeats),
      presets: listPresets(timeline.notes),
    },
  };
}
