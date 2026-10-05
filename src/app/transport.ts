import { countInAt } from '../pose/count-in.ts';
import { REST_TIMES, seatWeight, transportWeight } from '../pose/rest.ts';
import type { SeatAudibility, Transport } from '../pose/types.ts';

/** The transport before the first play: the players stay in the rest pose (design 5.2). */
export const NOT_STARTED: Transport = {
  playing: false,
  changedAtWall: null,
  weightAtChange: 0,
  startSec: 0,
  holdSec: REST_TIMES.hold,
};

/**
 * Gives the start point of a play (design 6.5): the song time of the pause, or 0 at the song end.
 * The `Player` starts the sound there after the count-in.
 *
 * @param songTime The song time of `Player.now()` at the play.
 * @param durationSec The song length, `Score.durationSec`.
 * @returns The start point, from 0 to below the song length.
 */
export function startPoint(songTime: number, durationSec: number): number {
  return songTime >= durationSec ? 0 : Math.max(0, songTime);
}

/**
 * Gives the transport after a play or a pause (design 5.1, 5.2). It keeps the weight of the
 * playing pose at the change, so that the pose lifts or lowers the instruments from where they
 * are, also after fast changes. A play keeps its start point for the count-in of the pose. A
 * pause in the count-in, before the song time passes the start point, lowers the instruments at
 * once.
 *
 * @param transport The transport before the change.
 * @param playing True for a play, false for a pause or a stop.
 * @param wallTime The wall clock time of the change, in seconds.
 * @param songTime For a play, the start point ({@link startPoint}). For a pause, the song time of
 *   `Player.now()`.
 * @returns The new transport, or `transport` if it already has this play state.
 */
export function changeTransport(
  transport: Transport,
  playing: boolean,
  wallTime: number,
  songTime: number,
): Transport {
  if (transport.playing === playing) {
    return transport;
  }
  const weightAtChange = transportWeight(transport, wallTime);
  if (playing) {
    return {
      playing,
      changedAtWall: wallTime,
      weightAtChange,
      startSec: songTime,
      holdSec: REST_TIMES.hold,
    };
  }
  return {
    playing,
    changedAtWall: wallTime,
    weightAtChange,
    startSec: transport.startSec,
    holdSec: songTime <= transport.startSec ? 0 : REST_TIMES.hold,
  };
}

/**
 * Gives the audibility of a seat after a mute, a solo, or their end (design 5.5, 6.6). It keeps
 * the weight of the playing pose of the seat at the change, so that the pose lifts or lowers the
 * instruments from where they are, also after fast changes.
 *
 * @param audibility The audibility before the change, or `undefined` for a seat with no change.
 *   Such a seat sounds.
 * @param audible True if the seat sounds after the change.
 * @param wallTime The wall clock time of the change, in seconds.
 * @returns The new audibility, or `audibility` if it already has this state.
 */
export function changeAudibility(
  audibility: SeatAudibility | undefined,
  audible: boolean,
  wallTime: number,
): SeatAudibility | undefined {
  const before = audibility ? audibility.audible : true;
  if (before === audible) {
    return audibility;
  }
  return {
    audible,
    changedAtWall: wallTime,
    weightAtChange: audibility ? seatWeight(audibility, wallTime) : 1,
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
 * @param songTime For a play, the start point ({@link startPoint}). For a pause, the song time of
 *   `Player.now()`.
 * @returns The new play state, or `state` if it already has this play state.
 */
export function setPlaying(
  state: PlayState,
  playing: boolean,
  wallTime: number,
  songTime: number,
): PlayState {
  const transport = changeTransport(state.transport, playing, wallTime, songTime);
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
  return {
    transport: changeTransport(state.transport, false, wallTime, songTime),
    endPending: false,
  };
}

/** A play of the user: the new play state and the count-in that the `Player` plays first. */
export interface PlayStart {
  readonly state: PlayState;
  /** The count-in in song seconds, for `Player.play()` (design 6.5). */
  readonly countInSec: number;
}

/**
 * Starts a play of the user (design 5.4, 6.5). The start point is the pause point, or 0 at the
 * song end. The count-in comes from the beats at the start point: from the song start, the ready
 * pause and one beat, else one beat. The pose and the `Player` thus use one count-in.
 *
 * @param state The play state before the play.
 * @param songTime The song time of `Player.now()` at the play.
 * @param durationSec The song length, `Score.durationSec`.
 * @param beats The times of the conducted beats, `PosePlan.beats`.
 * @param wallTime The wall clock time of the play, in seconds.
 * @returns The new play state and the count-in.
 */
export function startPlay(
  state: PlayState,
  songTime: number,
  durationSec: number,
  beats: Float64Array,
  wallTime: number,
): PlayStart {
  const start = startPoint(songTime, durationSec);
  return {
    state: setPlaying(state, true, wallTime, start),
    countInSec: countInAt(beats, start).lengthSec,
  };
}

/**
 * Gives the play state after a seek of the user (design 5.2, 6.5). A seek during play ends the
 * count-in, and the sound starts at the seek point. The seek point becomes the start point, so
 * that a later pause before the old start point keeps the hold of 3 s. A seek while paused does
 * not change the transport: the next play starts from the seek point.
 *
 * @param state The play state before the seek.
 * @param songSec The seek point, in song seconds.
 * @returns The new play state, or `state` while paused.
 */
export function seekPlayState(state: PlayState, songSec: number): PlayState {
  if (!state.transport.playing) {
    return state;
  }
  return { transport: { ...state.transport, startSec: songSec }, endPending: state.endPending };
}
