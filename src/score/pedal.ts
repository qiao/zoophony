import type { Score } from './types.ts';

/** The controller of the sustain (damper) pedal (MIDI 1.0, CC 64). */
const SUSTAIN = 64;

/** "Reset all controllers" (CC 121) lifts the sustain pedal. */
const RESET_ALL = 121;

/** The lowest value of CC 64 that holds the pedal down (MIDI 1.0: 0 to 63 is up). */
const DOWN = 64;

/** The control change status of a synth event. */
const CONTROL_CHANGE = 0xb0;

/**
 * The changes of the sustain pedal of one seat, sorted by time (design 5.3). The synth gets the
 * same CC 64 events, so the sound and the foot of the pianist follow one rule.
 */
export interface PedalTrack {
  /** The song time of each change, in seconds. */
  readonly times: Float64Array;
  /** 1 when the pedal goes down at the change, and 0 when it goes up. */
  readonly down: Uint8Array;
}

/** The track of a seat with no pedal data: the pedal stays up. */
export const NO_PEDAL: PedalTrack = { times: new Float64Array(0), down: new Uint8Array(0) };

/**
 * Reads the sustain pedal of each seat from the CC 64 events of its synth channels. A value of 64
 * or more holds the pedal down, and "reset all controllers" lifts it. A seat of more than one
 * channel holds the pedal down while one of its channels holds it down.
 *
 * @param score The score.
 * @returns One track for each seat, in the order of `score.seats`.
 */
export function sustainPedals(score: Score): PedalTrack[] {
  return score.seats.map((seat): PedalTrack => {
    const channels = new Set(seat.sources.map((s) => s.port * 16 + s.channel));
    const held = new Set<number>();
    const times: number[] = [];
    const down: number[] = [];
    for (const event of score.synthEvents) {
      if (event.kind !== CONTROL_CHANGE || !channels.has(event.channel)) {
        continue;
      }
      if (event.data1 === SUSTAIN && event.data2 >= DOWN) {
        held.add(event.channel);
      } else if (event.data1 === SUSTAIN || event.data1 === RESET_ALL) {
        held.delete(event.channel);
      } else {
        continue;
      }

      const now = held.size > 0 ? 1 : 0;
      if (now !== (down.at(-1) ?? 0)) {
        times.push(event.timeSec);
        down.push(now);
      }
    }
    return times.length === 0
      ? NO_PEDAL
      : { times: Float64Array.from(times), down: Uint8Array.from(down) };
  });
}
