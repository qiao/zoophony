/** The processor sends this when a transport change takes effect, and one time each second. */
export interface ClockAnchor {
  /** AudioContext seconds at the start of the block where the change took effect. */
  readonly contextTime: number;
  /** Song seconds at that block start. */
  readonly songTime: number;
  /** Playback rate. 0 while paused. */
  readonly rate: number;
}

/** The fields of `AudioTimestamp` that the clock reads. */
export interface OutputTimestamp {
  /** The context time of the frame that the output device plays now. */
  readonly contextTime: number;
  /** The `performance.now()` value at that moment. */
  readonly performanceTime: number;
}

/**
 * The time window of the anchor list, in context seconds (design 6.7). It is longer than the
 * largest output latency, so the heard time is never earlier than the newest anchor minus this
 * window.
 */
const ANCHOR_WINDOW_SEC = 1;

/**
 * Calculates the context time that the listener hears now, from `getOutputTimestamp()`
 * (design 6.7). The timestamp already includes the output latency. The `performance.now()`
 * difference makes the value smooth between two updates of the timestamp.
 *
 * @param timestamp The value of `AudioContext.getOutputTimestamp()`.
 * @param performanceNow The value of `performance.now()`.
 * @returns Context seconds.
 */
export function heardTimeFromTimestamp(timestamp: OutputTimestamp, performanceNow: number): number {
  return timestamp.contextTime + (performanceNow - timestamp.performanceTime) / 1000;
}

/**
 * Calculates the context time that the listener hears now, from the latency values: the second
 * method of design 6.7, which the spike compares with the first.
 *
 * @param currentTime `AudioContext.currentTime`.
 * @param outputLatency `AudioContext.outputLatency`, or 0 if the browser has no value.
 * @param baseLatency `AudioContext.baseLatency`.
 * @returns Context seconds.
 */
export function heardTimeFromLatency(
  currentTime: number,
  outputLatency: number,
  baseLatency: number,
): number {
  return currentTime - (outputLatency > 0 ? outputLatency : baseLatency);
}

/**
 * Chooses the heard context time from the two methods of design 6.7. Firefox calculates its
 * timestamp from `currentTime - outputLatency` and moves `performanceTime` back by the same
 * latency, so the timestamp method gives `currentTime` and loses the latency. A timestamp
 * method that is later than the latency method by more than half of the output latency
 * therefore does not include the latency, and the function uses the latency method.
 *
 * @param fromTimestamp The result of {@link heardTimeFromTimestamp}.
 * @param fromLatency The result of {@link heardTimeFromLatency}.
 * @param outputLatency `AudioContext.outputLatency`, or 0 if the browser has no value.
 * @returns Context seconds.
 */
export function chooseHeardTime(
  fromTimestamp: number,
  fromLatency: number,
  outputLatency: number,
): number {
  if (outputLatency > 0 && fromTimestamp - fromLatency > outputLatency / 2) {
    return fromLatency;
  }
  return fromTimestamp;
}

/**
 * Calculates the song time at a heard context time. The anchor in effect is the last one with a
 * context time at or before the heard time. Thus the old anchor stays in effect until the
 * listener hears the block of the new one.
 *
 * @param anchors The anchors, in the order of arrival.
 * @param heardTime The context time that the listener hears.
 * @param durationSec The song length.
 * @returns Song seconds from 0 to the song length, or 0 with no anchor.
 */
export function songTimeAt(
  anchors: readonly ClockAnchor[],
  heardTime: number,
  durationSec: number,
): number {
  const anchor = anchors.findLast((item) => item.contextTime <= heardTime) ?? anchors[0];
  if (!anchor) {
    return 0;
  }
  const songTime = anchor.songTime + (heardTime - anchor.contextTime) * anchor.rate;
  return Math.min(Math.max(songTime, 0), durationSec);
}

/**
 * Adds an anchor, and removes the anchors that can no longer be in effect. The heard time is at
 * or after the cutoff `anchor.contextTime - ANCHOR_WINDOW_SEC`. Thus an anchor can no longer be
 * in effect when a later anchor has a context time at or before the cutoff.
 *
 * @param anchors The anchors, in the order of arrival.
 * @param anchor The new anchor.
 * @returns A new list: the last anchor at or before the cutoff, and all anchors after it.
 */
export function addAnchor(anchors: readonly ClockAnchor[], anchor: ClockAnchor): ClockAnchor[] {
  const list = [...anchors, anchor];
  const cutoff = anchor.contextTime - ANCHOR_WINDOW_SEC;
  const first = list.findLastIndex((item) => item.contextTime <= cutoff);
  return first > 0 ? list.slice(first) : list;
}
