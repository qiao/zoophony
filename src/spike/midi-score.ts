import { BasicMIDI } from 'spessasynth_core';

import type { PlayerScore } from '../audio/player.ts';
import type { ScorePreset, SynthEvent } from '../score/types.ts';

const SYNTH_KINDS: readonly SynthEvent['kind'][] = [0x80, 0x90, 0xa0, 0xb0, 0xc0, 0xd0, 0xe0];

function isSynthKind(kind: number): kind is SynthEvent['kind'] {
  return SYNTH_KINDS.some((item) => item === kind);
}

/**
 * Makes the synth events and the presets of a MIDI file with the parser of spessasynth_core.
 * This is the temporary parser of the spike (design 9.5, step 1). Step 2 replaces it with
 * `midi/` and `score/`, which apply all rules of design section 3.
 *
 * The parser removes SysEx and meta events, reads a note on with velocity 0 as a note off, and
 * orders the ports by number. It gives no seats, so each event has the seat index -1.
 *
 * @param data The bytes of a Standard MIDI File.
 * @returns The fields of the score that the `Player` needs.
 */
export function scoreFromMidi(data: ArrayBuffer): PlayerScore {
  const midi = BasicMIDI.fromArrayBuffer(data);
  const ports = [
    ...new Set(midi.tracks.filter((track) => track.channels.size > 0).map((track) => track.port)),
  ].toSorted((a, b) => a - b);
  const synthEvents: SynthEvent[] = [];
  const presets = new Map<string, ScorePreset>();
  const banks = new Map<number, number>();
  const programs = new Map<number, number>();
  let durationSec = 0;
  for (const { tr, ev } of midi.timeline) {
    const track = midi.tracks[tr];
    const message = track?.events[ev];
    if (!track || !message) {
      continue;
    }
    const kind = message.statusByte & 0xf0;
    // Meta events keep their type byte (below 0x80) in statusByte. SysEx is 0xf0 or 0xf7.
    if (message.statusByte < 0x80 || !isSynthKind(kind)) {
      continue;
    }
    const channel = ports.indexOf(track.port) * 16 + (message.statusByte & 0x0f);
    const data1 = message.data[0] ?? 0;
    const data2 = message.data[1] ?? 0;
    const timeSec = midi.midiTicksToSeconds(message.ticks);
    const noteOff = kind === 0x80 || (kind === 0x90 && data2 === 0);
    if (kind === 0xb0 && data1 === 0) {
      banks.set(channel, data2);
    } else if (kind === 0xc0) {
      programs.set(channel, data1);
    } else if (kind === 0x90 && !noteOff) {
      const drumKit = channel % 16 === 9;
      const preset: ScorePreset = {
        bank: drumKit ? 128 : (banks.get(channel) ?? 0),
        program: programs.get(channel) ?? 0,
        drumKit,
      };
      presets.set(`${preset.bank}:${preset.program}`, preset);
    }
    if (noteOff) {
      durationSec = Math.max(durationSec, timeSec);
    }
    synthEvents.push({
      timeSec,
      channel,
      kind: noteOff ? 0x80 : kind,
      data1,
      data2: noteOff ? 0 : data2,
      seatIndex: -1,
    });
  }
  return {
    durationSec,
    synthEvents: synthEvents.toSorted((a, b) => a.timeSec - b.timeSec),
    presets: [...presets.values()],
  };
}
