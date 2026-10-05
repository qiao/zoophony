/**
 * The largest distance between the heard song time and the seek point at which the listener
 * hears the seek, in seconds.
 */
export const SEEK_MATCH_SEC = 0.25;

/**
 * Gives the seek point that the listener does not hear yet, after a frame reads the heard song
 * time. `Player.now()` keeps the old anchor until the listener hears the block of the seek
 * (design 6.7, 6.8). While the context is suspended before the first play, no block runs, so
 * `now()` keeps the old song time until the play. The wait ends when the heard song time comes
 * within {@link SEEK_MATCH_SEC} of the seek point.
 *
 * @param seekSec The seek point, or `null` with no seek to wait for.
 * @param heardSec The song time of `Player.now()`.
 * @returns The seek point, or `null` when the listener hears the seek.
 */
export function followSeek(seekSec: number | null, heardSec: number): number | null {
  if (seekSec === null || Math.abs(heardSec - seekSec) <= SEEK_MATCH_SEC) {
    return null;
  }
  return seekSec;
}

/**
 * Gives the song time of the bar and of the start point of a play. Until the listener hears a
 * seek, this is the seek point, so that the seek bar does not jump back and a play starts from
 * the seek point (design 6.5).
 *
 * @param seekSec The seek point that the listener does not hear yet, or `null`.
 * @param heardSec The song time of `Player.now()`.
 * @returns The seek point, else the heard song time.
 */
export function shownSongTime(seekSec: number | null, heardSec: number): number {
  return seekSec ?? heardSec;
}
