import { sustainsAfterSeek } from '../score/program-map.ts';
import type { SynthEventTable } from './synth-events.ts';

/** The transport state of the processor between two blocks (design 6.4). */
export interface TransportState {
  readonly playing: boolean;
  /** Song seconds at the start of the next block. */
  readonly songSec: number;
  /** Playback rate, above 0. It stays the same while paused. */
  readonly rate: number;
  /** The index of the next event to send. */
  readonly cursor: number;
}

/** A transport command from the `Player`. */
export type TransportCommand =
  | { readonly type: 'play' }
  | { readonly type: 'pause' }
  | { readonly type: 'seek'; readonly songSec: number }
  | { readonly type: 'rate'; readonly rate: number };

/** The synth actions that one transport command needs. */
export interface TransportActions {
  /** Release all notes. */
  readonly release: boolean;
  /** Reset the synth, then send the events of {@link chaseEvents} at the cursor. */
  readonly chase: boolean;
  /** Start the held notes of {@link restartPlan} at the cursor again. */
  readonly restartHeld: boolean;
}

/** The result of one transport command. */
export interface CommandResult {
  readonly state: TransportState;
  readonly actions: TransportActions;
  /** True if the command changed the transport, so the processor posts a clock anchor. */
  readonly changed: boolean;
}

/** The events of one block, and the transport state after it. */
export interface BlockPlan {
  readonly state: TransportState;
  /** The first event of the block. */
  readonly from: number;
  /** The index after the last event of the block. */
  readonly to: number;
  /** True if the song ended in this block. The processor then releases all notes and pauses. */
  readonly ended: boolean;
}

/** The held notes to start again at a cursor, and the note offs to skip after it. */
export interface RestartPlan {
  /** Event indices of the note ons to send again, in event order. */
  readonly notes: Int32Array;
  /**
   * The number of note offs to skip for each `channel * 128 + key`. The synth pairs note offs
   * with note ons first in, first out. Thus the note off of a held note that does not start
   * again would else end a later note on the same key.
   */
  readonly skip: Uint16Array;
}

/** The transport state of a newly loaded score. */
export const INITIAL_TRANSPORT: TransportState = { playing: false, songSec: 0, rate: 1, cursor: 0 };

const NOTE_OFF = 0x80;

const NOTE_ON = 0x90;

const CONTROL_CHANGE = 0xb0;

const PROGRAM_CHANGE = 0xc0;

const CHANNEL_PRESSURE = 0xd0;

const PITCH_BEND = 0xe0;

/** Controllers whose order matters, so a chase sends each one (bank, data entry, RPN, NRPN). */
const ORDERED_CONTROLLERS = new Set([0, 6, 32, 38, 96, 97, 98, 99, 100, 101, 121]);

/** Controllers that CC 121 (reset all controllers) resets, after RP-015. */
const RESET_BY_CC_121 = [1, 11, 64, 65, 66, 67];

const RESET_ALL_CONTROLLERS = 121;

const NO_ACTIONS: TransportActions = { release: false, chase: false, restartHeld: false };

/**
 * Finds the first event at or after a song time.
 *
 * @param timeSec The event times, in ascending order.
 * @param songSec The song time.
 * @returns The index of the first event with `timeSec >= songSec`, or the event count.
 */
export function eventIndexAt(timeSec: Float64Array, songSec: number): number {
  let low = 0;
  let high = timeSec.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if ((timeSec[middle] ?? Infinity) < songSec) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
}

/**
 * Applies one transport command.
 *
 * @param state The state before the command.
 * @param command The command.
 * @param timeSec The event times, in ascending order.
 * @param durationSec The song length.
 * @returns The new state, the synth actions, and the change flag.
 */
export function applyCommand(
  state: TransportState,
  command: TransportCommand,
  timeSec: Float64Array,
  durationSec: number,
): CommandResult {
  switch (command.type) {
    case 'play': {
      if (state.playing) {
        return { state, actions: NO_ACTIONS, changed: false };
      }
      if (state.songSec >= durationSec) {
        // Play at the end starts the song again from the start.
        return {
          state: { ...state, playing: true, songSec: 0, cursor: 0 },
          actions: { release: true, chase: true, restartHeld: true },
          changed: true,
        };
      }
      return {
        state: { ...state, playing: true },
        actions: { release: false, chase: false, restartHeld: true },
        changed: true,
      };
    }
    case 'pause': {
      if (!state.playing) {
        return { state, actions: NO_ACTIONS, changed: false };
      }
      return {
        state: { ...state, playing: false },
        actions: { release: true, chase: false, restartHeld: false },
        changed: true,
      };
    }
    case 'seek': {
      const songSec = Math.min(Math.max(command.songSec, 0), durationSec);
      return {
        state: { ...state, songSec, cursor: eventIndexAt(timeSec, songSec) },
        actions: { release: true, chase: true, restartHeld: state.playing },
        changed: true,
      };
    }
    case 'rate': {
      if (!(command.rate > 0) || command.rate === state.rate) {
        return { state, actions: NO_ACTIONS, changed: false };
      }
      return { state: { ...state, rate: command.rate }, actions: NO_ACTIONS, changed: true };
    }
  }
}

/**
 * Selects the events of one block. An event is due when its time is before the song time at the
 * end of the block. Thus each event starts at the start of the block that holds its time, up to
 * one block early.
 *
 * @param state The state at the block start.
 * @param timeSec The event times, in ascending order.
 * @param blockSec The block length in context seconds, such as 128 / 48000.
 * @param durationSec The song length.
 * @returns The event range and the state at the block end.
 */
export function planBlock(
  state: TransportState,
  timeSec: Float64Array,
  blockSec: number,
  durationSec: number,
): BlockPlan {
  if (!state.playing) {
    return { state, from: state.cursor, to: state.cursor, ended: false };
  }
  const endSec = state.songSec + blockSec * state.rate;
  let to = state.cursor;
  while (to < timeSec.length && (timeSec[to] ?? Infinity) < endSec) {
    to += 1;
  }
  if (to === timeSec.length && endSec >= durationSec) {
    return {
      state: { ...state, playing: false, songSec: durationSec, cursor: to },
      from: state.cursor,
      to,
      ended: true,
    };
  }
  return { state: { ...state, songSec: endSec, cursor: to }, from: state.cursor, to, ended: false };
}

/**
 * Lists the events that restore the channel state at a cursor after a synth reset: the
 * programs, the controllers, the pitch bend, and the channel pressure (design 6.5).
 *
 * The program changes and the controllers of {@link ORDERED_CONTROLLERS} keep their order. For
 * each other controller, the pitch bend, and the channel pressure, only the last value of each
 * channel remains.
 *
 * @param table The events.
 * @param cursor The index of the first event after the seek point.
 * @returns Event indices, in event order.
 */
export function chaseEvents(table: SynthEventTable, cursor: number): Int32Array {
  const ordered: number[] = [];
  /** The last event index of each `channel:kind:controller` key. */
  const last = new Map<string, number>();
  for (let i = 0; i < cursor; i++) {
    const kind = table.kind[i];
    const channel = table.channel[i];
    const data1 = table.data1[i];
    if (kind === PROGRAM_CHANGE) {
      ordered.push(i);
    } else if (kind === CONTROL_CHANGE && data1 !== undefined) {
      if (ORDERED_CONTROLLERS.has(data1)) {
        ordered.push(i);
      } else {
        last.set(`${channel}:${kind}:${data1}`, i);
      }
      if (data1 === RESET_ALL_CONTROLLERS) {
        for (const controller of RESET_BY_CC_121) {
          last.delete(`${channel}:${CONTROL_CHANGE}:${controller}`);
        }
        last.delete(`${channel}:${PITCH_BEND}:0`);
        last.delete(`${channel}:${CHANNEL_PRESSURE}:0`);
      }
    } else if (kind === PITCH_BEND || kind === CHANNEL_PRESSURE) {
      last.set(`${channel}:${kind}:0`, i);
    }
  }
  return Int32Array.from([...ordered, ...last.values()].toSorted((a, b) => a - b));
}

/**
 * Tells if an event ends a note: a note off, or a note on with velocity 0.
 *
 * @param table The events.
 * @param index The event index.
 * @returns True for a note end.
 */
function isNoteEnd(table: SynthEventTable, index: number): boolean {
  const kind = table.kind[index];
  return kind === NOTE_OFF || (kind === NOTE_ON && table.data2[index] === 0);
}

/**
 * Finds the notes that start before a cursor and end after it. Note offs end note ons first in,
 * first out, as in the synth (design 3.3).
 *
 * @param table The events.
 * @param cursor The index of the first event after the seek point.
 * @returns Event indices of the held note ons, in event order.
 */
export function heldNotes(table: SynthEventTable, cursor: number): Int32Array {
  const open = new Map<number, number[]>();
  for (let i = 0; i < cursor; i++) {
    const key = (table.channel[i] ?? 0) * 128 + (table.data1[i] ?? 0);
    if (isNoteEnd(table, i)) {
      open.get(key)?.shift();
    } else if (table.kind[i] === NOTE_ON) {
      const notes = open.get(key);
      if (notes) {
        notes.push(i);
      } else {
        open.set(key, [i]);
      }
    }
  }
  return Int32Array.from([...open.values()].flat().toSorted((a, b) => a - b));
}

/**
 * Plans the restart of the held notes at a cursor. A held note starts again if its channel is
 * not a rhythm channel and the program of its channel has a long sound
 * (`sustainsAfterSeek()` of `score/`, design 6.5).
 *
 * @param table The events.
 * @param cursor The index of the first event after the seek or pause point.
 * @param channelCount The number of synth channels.
 * @returns The note ons to send again, and the note offs to skip.
 */
export function restartPlan(
  table: SynthEventTable,
  cursor: number,
  channelCount: number,
): RestartPlan {
  const programs = new Uint8Array(channelCount);
  for (let i = 0; i < cursor; i++) {
    if (table.kind[i] === PROGRAM_CHANGE) {
      programs[table.channel[i] ?? 0] = table.data1[i] ?? 0;
    }
  }
  const skip = new Uint16Array(channelCount * 128);
  const notes: number[] = [];
  for (const index of heldNotes(table, cursor)) {
    const channel = table.channel[index] ?? 0;
    const rhythm = channel % 16 === 9;
    if (!rhythm && sustainsAfterSeek(programs[channel] ?? 0)) {
      notes.push(index);
    } else {
      const key = channel * 128 + (table.data1[index] ?? 0);
      skip[key] = (skip[key] ?? 0) + 1;
    }
  }
  return { notes: Int32Array.from(notes), skip };
}

/**
 * Decides if the processor sends an event. A note off that a {@link RestartPlan} skips is not
 * sent. The function then takes one count from `skip`, so it changes `skip` in place.
 *
 * @param table The events.
 * @param index The event index.
 * @param skip The note offs to skip, by `channel * 128 + key`.
 * @returns True if the processor sends the event.
 */
export function takeEvent(table: SynthEventTable, index: number, skip: Uint16Array): boolean {
  if (!isNoteEnd(table, index)) {
    return true;
  }
  const key = (table.channel[index] ?? 0) * 128 + (table.data1[index] ?? 0);
  const count = skip[key] ?? 0;
  if (count > 0) {
    skip[key] = count - 1;
    return false;
  }
  return true;
}
