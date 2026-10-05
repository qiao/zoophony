import { parseMidi } from '../midi/parse.ts';
import type { ChannelKind, MidiChannelEvent, MidiError, MidiFile } from '../midi/types.ts';
import { TempoMap } from './tempo-map.ts';

/** A channel event in song seconds (design 3.1). There is no SysEx. */
export interface TimedEvent {
  readonly timeSec: number;
  /** portIndex * 16 + channel (3.4). */
  readonly synthChannel: number;
  readonly kind: ChannelKind;
  readonly data1: number;
  readonly data2: number;
}

/** A time signature of the file, at a tick and at its time in seconds. */
export interface TimeSignature {
  readonly tick: number;
  readonly timeSec: number;
  readonly numerator: number;
  /** A power of 2, for example 8 for 6/8. */
  readonly denominator: number;
}

/**
 * The events of a file in song seconds, after the file rules of design 3.3. This is the input of
 * the program map, the seats, and the synth events (design 3.1).
 */
export interface Timeline {
  /** The merge rule for articulation channels applies only to format 1 (3.7). */
  readonly format: 0 | 1;
  /** The name (FF 03) of the first track, or ''. */
  readonly sequenceName: string;
  readonly tempoMap: TempoMap;
  /** Sorted by tick. The first is at tick 0. A file with none gets 4/4 (3.3). */
  readonly timeSignatures: readonly TimeSignature[];
  /**
   * The channel events of all tracks, sorted by time. Events at the same tick keep the order of
   * their tracks, then the order in their track.
   */
  readonly events: readonly TimedEvent[];
}

/** The result of {@link buildTimeline}. */
export type TimelineResult =
  | { readonly ok: true; readonly timeline: Timeline }
  | { readonly ok: false; readonly error: MidiError };

/**
 * Parses a Standard MIDI File and puts the events of all tracks in one list in song seconds
 * (design 3.1, 3.3).
 *
 * @param bytes The bytes of the file.
 * @returns The timeline, or the reason to refuse the file. The UI shows the text of design 2.8
 *   for each reason.
 */
export function buildTimeline(bytes: Uint8Array): TimelineResult {
  const parsed = parseMidi(bytes);
  if (!parsed.ok) {
    return parsed;
  }
  const file = parsed.file;
  const tempoMap = new TempoMap(file);
  const events = mergeTracks(file).map((event): TimedEvent => ({
    timeSec: tempoMap.toSeconds(event.tick),
    synthChannel: event.channel,
    kind: event.kind,
    data1: event.data1,
    data2: event.data2,
  }));
  return {
    ok: true,
    timeline: {
      format: file.format,
      sequenceName: file.tracks[0]?.name ?? '',
      tempoMap,
      timeSignatures: timeSignatures(file, tempoMap),
      events,
    },
  };
}

/** Puts the channel events of all tracks in one list, sorted by tick with a stable sort. */
function mergeTracks(file: MidiFile): MidiChannelEvent[] {
  return file.tracks
    .flatMap((track) => track.events)
    .filter((event) => event.type === 'channel')
    .toSorted((a, b) => a.tick - b.tick);
}

/**
 * Collects the time signatures of all tracks. Of two at the same tick, the later one applies.
 * Before the first one, the MIDI default 4/4 applies (design 3.3).
 */
function timeSignatures(file: MidiFile, tempoMap: TempoMap): TimeSignature[] {
  const events = file.tracks
    .flatMap((track) => track.events)
    .filter((event) => event.type === 'time-signature')
    .toSorted((a, b) => a.tick - b.tick);
  const result: TimeSignature[] = [{ tick: 0, timeSec: 0, numerator: 4, denominator: 4 }];
  for (const event of events) {
    const signature: TimeSignature = {
      tick: event.tick,
      timeSec: tempoMap.toSeconds(event.tick),
      numerator: event.numerator,
      denominator: event.denominator,
    };
    if (result.at(-1)?.tick === event.tick) {
      result[result.length - 1] = signature;
    } else {
      result.push(signature);
    }
  }
  return result;
}
