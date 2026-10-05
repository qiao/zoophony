import { RHYTHM_CHANNEL } from './drum-map.ts';
import type { Note, Timeline } from './timeline.ts';
import type { ScorePreset, SynthEvent } from './types.ts';

/** The bank of the drum kits in the preset list (design 3.2, 6.2). */
const DRUM_KIT_BANK = 128;

/**
 * Makes the events for the synth from the timeline (design 3.2). The timeline has no SysEx, and
 * it reads a note on with velocity 0 as a note off. The events keep the order of the timeline,
 * which is the order of the synth for events at the same time.
 *
 * @param timeline The channel events of the file in song seconds.
 * @param noteSeats The seat of each note of `timeline.notes`, from `assignSeats()`.
 * @returns The events, sorted by time. A note on or a note off has the seat of its note, also in
 *   the sound-only seat. Each other event has the seat index -1.
 */
export function buildSynthEvents(timeline: Timeline, noteSeats: readonly number[]): SynthEvent[] {
  return timeline.events.map((event) => ({
    timeSec: event.timeSec,
    channel: event.synthChannel,
    kind: event.kind,
    data1: event.data1,
    data2: event.data2,
    seatIndex: event.note < 0 ? -1 : (noteSeats[event.note] ?? -1),
  }));
}

/**
 * Lists the presets that the notes of a file play, in the order of first use (design 3.2). A
 * melodic note uses the bank of its channel at its program change. A note of a rhythm channel
 * uses its drum kit in bank 128.
 *
 * @param notes The notes of the file.
 * @returns Each preset one time.
 */
export function listPresets(notes: readonly Note[]): ScorePreset[] {
  const presets = new Map<number, ScorePreset>();
  for (const note of notes) {
    const drumKit = note.channel === RHYTHM_CHANNEL;
    const bank = drumKit ? DRUM_KIT_BANK : note.bank;
    const key = bank * 128 + note.program;
    if (!presets.has(key)) {
      presets.set(key, { bank, program: note.program, drumKit });
    }
  }
  return [...presets.values()];
}
