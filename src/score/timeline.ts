import { parseMidi } from '../midi/parse.ts';
import type { ChannelKind, MidiChannelEvent, MidiFile } from '../midi/types.ts';
import { runAll } from './steps.ts';
import type { Steps } from './steps.ts';
import { TempoMap, eventsOfType } from './tempo-map.ts';
import type { FileError } from './types.ts';

/**
 * A channel event in song seconds (design 3.1). There is no SysEx. A note on with velocity 0 is
 * a note off (0x80) with velocity 0.
 */
interface TimedEvent {
  readonly timeSec: number;
  /** portIndex * 16 + channel (3.4). */
  readonly synthChannel: number;
  readonly kind: ChannelKind;
  readonly data1: number;
  readonly data2: number;
  /** The index in {@link Timeline.notes} of the note of a note on or a note off, else -1. */
  readonly note: number;
}

/** One note: a note on and the note off that ends it (design 3.3). */
export interface Note {
  /** The index of the track of the note on. */
  readonly track: number;
  /**
   * The port index: the place of the port of the track in the ports of the file, ordered by
   * port number (3.4).
   */
  readonly port: number;
  /** 0 to 15. Channel 9 of each port is a rhythm channel (3.4). */
  readonly channel: number;
  /** `port * 16 + channel` (3.4). */
  readonly synthChannel: number;
  /** MIDI key, 0 to 127. */
  readonly pitch: number;
  /** 1 to 127. */
  readonly velocity: number;
  readonly startSec: number;
  /** Seconds, at key release. At least `startSec`. */
  readonly endSec: number;
  /**
   * The program of the channel at the note on: the last program change before it, or 0 (3.3).
   * On a rhythm channel, the drum kit (3.6).
   */
  readonly program: number;
  /**
   * The bank select value (CC 0) of the channel at its last program change, or 0. As in the
   * synth, a bank select takes effect at the next program change (3.5).
   */
  readonly bank: number;
}

/** A time signature of the file, at a tick. */
export interface TimeSignature {
  readonly tick: number;
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
  /** The ticks of one quarter note, from the MThd chunk. Above 0. */
  readonly ticksPerQuarter: number;
  readonly tempoMap: TempoMap;
  /** Sorted by tick. The first is at tick 0. A file with none gets 4/4 (3.3). */
  readonly timeSignatures: readonly TimeSignature[];
  /**
   * The channel events of all tracks, sorted by time. Events at the same tick keep the order of
   * their tracks, then the order in their track. The note offs that end the notes at the end of
   * a track come after the events of that track at that tick.
   */
  readonly events: readonly TimedEvent[];
  /** Sorted by `startSec`. At least one. */
  readonly notes: readonly Note[];
  /** The time of the last note-off, in seconds (design 3.2). */
  readonly durationSec: number;
}

/** The result of {@link buildTimeline}. */
type TimelineResult =
  | { readonly ok: true; readonly timeline: Timeline }
  | { readonly ok: false; readonly error: FileError };

/**
 * Parses a Standard MIDI File, puts the events of all tracks in one list in song seconds, and
 * pairs the notes (design 3.1, 3.3).
 *
 * @param bytes The bytes of the file.
 * @returns The timeline, or the reason to refuse the file. The UI shows the text of design 2.8
 *   for each reason.
 */
export function buildTimeline(bytes: Uint8Array): TimelineResult {
  return runAll(buildTimelineSteps(bytes));
}

/** The number of events of the merged tracks in one step of {@link buildTimelineSteps}. */
const EVENTS_PER_STEP = 2000;

/**
 * Builds the timeline of a Standard MIDI File as {@link buildTimeline} does, in steps (design
 * 7.2).
 *
 * @param bytes The bytes of the file.
 * @returns The steps, which return the timeline or the reason to refuse the file.
 */
export function* buildTimelineSteps(bytes: Uint8Array): Steps<TimelineResult> {
  const parsed = parseMidi(bytes);
  if (!parsed.ok) {
    return parsed;
  }
  yield;
  const file = parsed.file;
  const tempoMap = new TempoMap(file);
  const ports = portIndices(file);
  const programs = new ChannelPrograms();
  const pairing = new NotePairing();
  let timeSec = 0;
  let count = 0;
  for (const item of mergeTracks(file)) {
    if (++count % EVENTS_PER_STEP === 0) {
      yield;
    }
    timeSec = tempoMap.toSeconds(item.tick);
    const event = item.event;
    const port = ports[item.track] ?? 0;
    const synthChannel = port * 16 + (event?.channel ?? 0);
    if (!event) {
      pairing.endTrack(item.track, timeSec);
    } else if (event.kind === 0x80 || (event.kind === 0x90 && event.data2 === 0)) {
      pairing.noteOff(synthChannel, event.data1, event.kind === 0x80 ? event.data2 : 0, timeSec);
    } else if (event.kind === 0x90) {
      pairing.noteOn(item.track, port, synthChannel, event, timeSec, programs.at(synthChannel));
    } else {
      programs.apply(synthChannel, event);
      pairing.events.push(timed(event, timeSec, synthChannel, -1));
    }
  }
  pairing.endAll(timeSec);
  if (pairing.notes.length === 0) {
    return { ok: false, error: 'no-notes' };
  }
  return {
    ok: true,
    timeline: {
      format: file.format,
      sequenceName: file.tracks[0]?.name ?? '',
      ticksPerQuarter: file.ticksPerQuarter,
      tempoMap,
      timeSignatures: timeSignatures(file),
      events: pairing.events,
      notes: pairing.notes,
      durationSec: pairing.notes.reduce((end, note) => Math.max(end, note.endSec), 0),
    },
  };
}

/**
 * Gives the port index of each track (design 3.4). Each port is a group of 16 channels. The
 * ports are the port numbers of the tracks with channel events, ordered by number.
 */
function portIndices(file: MidiFile): number[] {
  const used = file.tracks.filter((track) =>
    track.events.some((event) => event.type === 'channel'),
  );
  const ports = [...new Set(used.map((track) => track.port))].toSorted((a, b) => a - b);
  return file.tracks.map((track) => Math.max(0, ports.indexOf(track.port)));
}

/** A channel event of a track, or the end of the track if `event` is undefined. */
interface TrackItem {
  readonly tick: number;
  readonly track: number;
  readonly event: MidiChannelEvent | undefined;
}

/**
 * Puts the channel events of all tracks in one list, sorted by tick with a stable sort. The end
 * of each track is an item after the events of the track.
 */
function mergeTracks(file: MidiFile): TrackItem[] {
  return file.tracks
    .flatMap((track, i): TrackItem[] => [
      ...track.events.flatMap((event) =>
        event.type === 'channel' ? [{ tick: event.tick, track: i, event }] : [],
      ),
      { tick: track.endTick, track: i, event: undefined },
    ])
    .toSorted((a, b) => a.tick - b.tick);
}

function timed(
  event: MidiChannelEvent,
  timeSec: number,
  synthChannel: number,
  note: number,
): TimedEvent {
  return { timeSec, synthChannel, kind: event.kind, data1: event.data1, data2: event.data2, note };
}

/** The preset that a channel plays: a program and a bank. */
interface ChannelPreset {
  readonly program: number;
  readonly bank: number;
}

/**
 * Follows the program and the bank of each synth channel (design 3.5, 3.6). A channel with no
 * program change uses program 0. On a rhythm channel, a program change selects the drum kit,
 * as in GS and GM2.
 */
class ChannelPrograms {
  readonly #presets = new Map<number, ChannelPreset>();
  /** The last bank select value (CC 0) of each synth channel. */
  readonly #bankSelect = new Map<number, number>();

  apply(synthChannel: number, event: MidiChannelEvent): void {
    if (event.kind === 0xb0 && event.data1 === 0) {
      this.#bankSelect.set(synthChannel, event.data2);
    } else if (event.kind === 0xc0) {
      const bank = this.#bankSelect.get(synthChannel) ?? 0;
      this.#presets.set(synthChannel, { program: event.data1, bank });
    }
  }

  at(synthChannel: number): ChannelPreset {
    return this.#presets.get(synthChannel) ?? { program: 0, bank: 0 };
  }
}

/** A note while its note off is not known. */
interface OpenNote {
  readonly track: number;
  readonly port: number;
  readonly channel: number;
  readonly synthChannel: number;
  readonly pitch: number;
  readonly velocity: number;
  readonly startSec: number;
  endSec: number;
  readonly program: number;
  readonly bank: number;
}

/**
 * Pairs note ons with note offs first in, first out on each key of each synth channel, as the
 * synth does (design 3.3). Thus the visuals and the sound end the same note.
 */
class NotePairing {
  readonly events: TimedEvent[] = [];
  readonly notes: OpenNote[] = [];
  /** The open notes of each `synthChannel * 128 + pitch`, oldest first. */
  readonly #open = new Map<number, number[]>();

  noteOn(
    track: number,
    port: number,
    synthChannel: number,
    event: MidiChannelEvent,
    timeSec: number,
    preset: ChannelPreset,
  ): void {
    const note = this.notes.length;
    this.notes.push({
      track,
      port,
      channel: event.channel,
      synthChannel,
      pitch: event.data1,
      velocity: event.data2,
      startSec: timeSec,
      endSec: timeSec,
      program: preset.program,
      bank: preset.bank,
    });
    const key = synthChannel * 128 + event.data1;
    const queue = this.#open.get(key);
    if (queue) {
      queue.push(note);
    } else {
      this.#open.set(key, [note]);
    }
    this.events.push(timed(event, timeSec, synthChannel, note));
  }

  /**
   * Ends the oldest open note on a key. A note off with no open note has no effect on the synth,
   * so the timeline drops it.
   */
  noteOff(synthChannel: number, pitch: number, velocity: number, timeSec: number): void {
    const note = this.#open.get(synthChannel * 128 + pitch)?.shift();
    const open = note === undefined ? undefined : this.notes[note];
    if (note === undefined || !open) {
      return;
    }
    open.endSec = timeSec;
    this.events.push({ timeSec, synthChannel, kind: 0x80, data1: pitch, data2: velocity, note });
  }

  /**
   * Adds a note off for each open note of a track at the end of the track (design 3.3). Each note
   * off ends the oldest open note on its key, as in the synth. That note can come from another
   * track on the same channel.
   */
  endTrack(track: number, timeSec: number): void {
    this.#endOpen(timeSec, track);
  }

  /**
   * Ends all open notes at the end of the last track. Only a note whose key another track ended
   * early can remain open.
   */
  endAll(timeSec: number): void {
    this.#endOpen(timeSec);
  }

  /** Adds a note off for each open note, in ascending order, or only for those of one track. */
  #endOpen(timeSec: number, track?: number): void {
    const open = [...this.#open.values()].flat().toSorted((a, b) => a - b);
    for (const note of open) {
      const item = this.notes[note];
      if (item && (track === undefined || item.track === track)) {
        this.noteOff(item.synthChannel, item.pitch, 0, timeSec);
      }
    }
  }
}

/**
 * Collects the time signatures of all tracks. Of two at the same tick, the later one applies.
 * Before the first one, the MIDI default 4/4 applies (design 3.3).
 */
function timeSignatures(file: MidiFile): TimeSignature[] {
  const result: TimeSignature[] = [{ tick: 0, numerator: 4, denominator: 4 }];
  for (const event of eventsOfType(file, 'time-signature')) {
    const signature: TimeSignature = {
      tick: event.tick,
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
