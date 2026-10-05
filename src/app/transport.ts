import type { Transport } from '../pose/types.ts';

/** The transport before the first play: the players stay in the rest pose (design 5.2). */
export const NOT_STARTED: Transport = {
  playing: false,
  changedAtWall: null,
  previousChangeAtWall: null,
};

/**
 * Gives the transport after a play or a pause (design 5.1, 5.2). The time of the last change
 * becomes the time of the change before, so that the pose can lift or lower the instruments from
 * where they are.
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
  return { playing, changedAtWall: wallTime, previousChangeAtWall: transport.changedAtWall };
}
