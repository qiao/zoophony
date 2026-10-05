import { transportWeight } from '../pose/rest.ts';
import type { Transport } from '../pose/types.ts';

/** The transport before the first play: the players stay in the rest pose (design 5.2). */
export const NOT_STARTED: Transport = { playing: false, changedAtWall: null, weightAtChange: 0 };

/**
 * Gives the transport after a play or a pause (design 5.1, 5.2). It keeps the weight of the
 * playing pose at the change, so that the pose lifts or lowers the instruments from where they
 * are, also after fast changes.
 *
 * @param transport The transport before the change.
 * @param playing True for a play, false for a pause or a stop.
 * @param wallTime The wall clock time of the change, in seconds.
 * @returns The new transport, or `transport` if it already has this play state.
 */
export function changeTransport(
  transport: Transport,
  playing: boolean,
  wallTime: number,
): Transport {
  if (transport.playing === playing) {
    return transport;
  }
  return {
    playing,
    changedAtWall: wallTime,
    weightAtChange: transportWeight(transport, wallTime),
  };
}

/** The play state of the page: the transport of the pose and the guard of the song end. */
export interface PlayState {
  readonly transport: Transport;
  /**
   * True from a play until the song time reads less than the song length. After a play at the
   * song end, `Player.now()` gives the end time until the listener hears the new anchor (6.5,
   * 6.8). The end check waits for this flag to clear.
   */
  readonly endPending: boolean;
}

/** The play state before the first play, and after a new demo replaces the old one. */
export const STOPPED: PlayState = { transport: NOT_STARTED, endPending: false };

/**
 * Gives the play state after a play or a pause of the user (design 5.2, 6.5).
 *
 * @param state The play state before the change.
 * @param playing True for a play, false for a pause.
 * @param wallTime The wall clock time of the change, in seconds.
 * @returns The new play state, or `state` if it already has this play state.
 */
export function setPlaying(state: PlayState, playing: boolean, wallTime: number): PlayState {
  const transport = changeTransport(state.transport, playing, wallTime);
  if (transport === state.transport) {
    return state;
  }
  return { transport, endPending: playing };
}

/**
 * Gives the play state after a frame reads the song time of the `Player` (design 6.5). The
 * processor pauses at the song length, so the transport pauses when the song time reaches it.
 * After a play, the check waits until the song time reads less than the song length: a play at
 * the end restarts the song at 0, but the old anchor gives the end time for a few frames.
 *
 * @param state The play state before the frame.
 * @param songTime The song time of `Player.now()`, in seconds.
 * @param durationSec The song length, `Score.durationSec`.
 * @param wallTime The wall clock time of the frame, in seconds.
 * @returns The new play state, or `state` if nothing changes.
 */
export function followSongTime(
  state: PlayState,
  songTime: number,
  durationSec: number,
  wallTime: number,
): PlayState {
  if (!state.transport.playing) {
    return state;
  }
  if (songTime < durationSec) {
    return state.endPending ? { transport: state.transport, endPending: false } : state;
  }
  if (state.endPending) {
    return state;
  }
  return { transport: changeTransport(state.transport, false, wallTime), endPending: false };
}
