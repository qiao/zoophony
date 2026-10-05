/**
 * The reasons why `parseMidi()` refuses a file (design 3.3). The UI shows the message text of
 * design 2.8 for each reason.
 */
export type MidiError = 'not-midi' | 'format-2' | 'too-large';

/** The high nibble of the status byte of a channel message. */
export type ChannelKind = 0x80 | 0x90 | 0xa0 | 0xb0 | 0xc0 | 0xd0 | 0xe0;

/** A channel message of a track, as the file holds it. */
export interface MidiChannelEvent {
  readonly type: 'channel';
  /** Ticks from the start of the track. */
  readonly tick: number;
  readonly kind: ChannelKind;
  /** 0 to 15. Channel 10 of the UI is 9. */
  readonly channel: number;
  readonly data1: number;
  /** 0 for a message with one data byte (program change and channel pressure). */
  readonly data2: number;
  /** The byte offset of `data1` in the file. `tools/patch-demos.ts` changes programs there. */
  readonly dataOffset: number;
}

/** A tempo event (FF 51). */
export interface MidiTempoEvent {
  readonly type: 'tempo';
  readonly tick: number;
  /** Above 0. */
  readonly microsecondsPerQuarter: number;
}

/** A time signature event (FF 58). */
export interface MidiTimeSignatureEvent {
  readonly type: 'time-signature';
  readonly tick: number;
  /** Above 0. */
  readonly numerator: number;
  /** A power of 2, for example 8 for 6/8. */
  readonly denominator: number;
}

/**
 * An event that the app uses. The parser removes SysEx and the meta events that the app does
 * not use. The track name (FF 03) and the port (FF 21) are fields of {@link MidiTrack}.
 */
export type MidiEvent = MidiChannelEvent | MidiTempoEvent | MidiTimeSignatureEvent;

/** One track chunk (MTrk) of the file. */
export interface MidiTrack {
  /** The text of the first FF 03 event of the track, or '' if the track has none. */
  readonly name: string;
  /** The port number of the first FF 21 event of the track, or 0 if the track has none. */
  readonly port: number;
  /** The tick of the end of track event (FF 2F), or the tick of the last event with no FF 2F. */
  readonly endTick: number;
  /** In the order of the file, so the ticks do not decrease. */
  readonly events: readonly MidiEvent[];
}

/** A Standard MIDI File of format 0 or 1. */
export interface MidiFile {
  readonly format: 0 | 1;
  /** Above 0. The parser refuses SMPTE time division. */
  readonly ticksPerQuarter: number;
  /** At least one track. */
  readonly tracks: readonly MidiTrack[];
}

/** The result of `parseMidi()`. */
export type MidiParseResult =
  | { readonly ok: true; readonly file: MidiFile }
  | { readonly ok: false; readonly error: MidiError };
