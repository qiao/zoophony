import type { MidiError } from '../midi/types.ts';

/**
 * The reasons to refuse a file (design 3.3). The UI shows the message text of design 2.8 for
 * each reason.
 */
export type FileError = MidiError | 'no-notes';

/**
 * One event for the synth, in song seconds (design 3.2). There is no SysEx.
 *
 * Step 2 adds the other types of the `Score` to this module.
 */
export interface SynthEvent {
  readonly timeSec: number;
  /** portIndex * 16 + channel (3.4). */
  readonly channel: number;
  /** High nibble of the MIDI status byte. */
  readonly kind: 0x80 | 0x90 | 0xa0 | 0xb0 | 0xc0 | 0xd0 | 0xe0;
  readonly data1: number;
  readonly data2: number;
  /** The seat of a note event (sound-only notes too), or -1 for an event of a full channel. */
  readonly seatIndex: number;
}

/** A preset that must load before play (an entry of `Score.presets`, design 3.2). */
export interface ScorePreset {
  /** Drum kits use bank 128. */
  readonly bank: number;
  readonly program: number;
  readonly drumKit: boolean;
}
