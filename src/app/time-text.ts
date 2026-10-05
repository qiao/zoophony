/**
 * Gives the length of a song in whole seconds, as the demo list and the bar show it (design 8.2).
 * A file can round a tempo, so that a song ends just below a whole second: K. 315 ends at
 * 254.9998 s and shows as 4:15.
 *
 * @param durationSec The song length, `Score.durationSec`.
 * @returns `Math.floor(durationSec + 0.001)`.
 */
export function wholeSeconds(durationSec: number): number {
  return Math.floor(durationSec + 0.001);
}

/**
 * Gives the clock text of a time: minutes, a colon, and two digits of seconds (design 2.8).
 *
 * @param seconds The time in whole seconds. A value below 0 shows as 0.
 * @returns The text, for example "1:23" or "0:05".
 */
export function clockText(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  return `${minutes}:${String(whole % 60).padStart(2, '0')}`;
}

/**
 * Gives a count with its unit in the singular or the plural.
 *
 * @param count The count.
 * @param unit The unit in the singular.
 * @returns The text, for example "1 minute" or "23 seconds".
 */
function counted(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? '' : 's'}`;
}

/**
 * Gives the spoken text of a time for a screen reader (design 2.8). A time of 0 s gives
 * "0 seconds". A whole minute gives no seconds: "5 minutes".
 *
 * @param seconds The time in whole seconds. A value below 0 reads as 0.
 * @returns The text, for example "1 minute 23 seconds".
 */
export function spokenTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  if (minutes === 0) {
    return counted(rest, 'second');
  }
  return rest === 0
    ? counted(minutes, 'minute')
    : `${counted(minutes, 'minute')} ${counted(rest, 'second')}`;
}

/**
 * Gives the `aria-valuetext` of the seek bar (design 2.8).
 *
 * @param current The current time in whole seconds.
 * @param length The song length in whole seconds.
 * @returns The text, for example "1 minute 23 seconds of 5 minutes 16 seconds".
 */
export function seekValueText(current: number, length: number): string {
  return `${spokenTime(current)} of ${spokenTime(length)}`;
}
