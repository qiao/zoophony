import type { SynthEvent } from '../score/types.ts';

/**
 * The synth events of a score as typed arrays, one array for each field of `SynthEvent`
 * (design 3.2, 6.4). Index `i` of each array belongs to event `i`. The main thread transfers the
 * buffers to the worklet with no copy.
 */
export interface SynthEventTable {
  /** Song seconds, in ascending order. */
  readonly timeSec: Float64Array<ArrayBuffer>;
  /** portIndex * 16 + channel. */
  readonly channel: Uint16Array<ArrayBuffer>;
  /** High nibble of the MIDI status byte, 0x80 to 0xe0. */
  readonly kind: Uint8Array<ArrayBuffer>;
  readonly data1: Uint8Array<ArrayBuffer>;
  readonly data2: Uint8Array<ArrayBuffer>;
  /** The seat of a note event, or -1 for an event of a full channel. */
  readonly seatIndex: Int16Array<ArrayBuffer>;
}

/**
 * Copies synth events into a table of typed arrays.
 *
 * @param events The events, sorted by `timeSec`.
 * @returns The table.
 * @throws Error if the events are not sorted by time.
 */
export function packSynthEvents(events: readonly SynthEvent[]): SynthEventTable {
  const count = events.length;
  const table: SynthEventTable = {
    timeSec: new Float64Array(count),
    channel: new Uint16Array(count),
    kind: new Uint8Array(count),
    data1: new Uint8Array(count),
    data2: new Uint8Array(count),
    seatIndex: new Int16Array(count),
  };
  let previous = -Infinity;
  events.forEach((event, i) => {
    if (event.timeSec < previous) {
      throw new Error(`Synth event ${i} at ${event.timeSec} s comes before ${previous} s.`);
    }
    previous = event.timeSec;
    table.timeSec[i] = event.timeSec;
    table.channel[i] = event.channel;
    table.kind[i] = event.kind;
    table.data1[i] = event.data1;
    table.data2[i] = event.data2;
    table.seatIndex[i] = event.seatIndex;
  });
  return table;
}

/**
 * Lists the buffers of a table, for the transfer list of `postMessage`.
 *
 * @param table The table.
 * @returns The six buffers.
 */
export function tableBuffers(table: SynthEventTable): ArrayBuffer[] {
  return [
    table.timeSec.buffer,
    table.channel.buffer,
    table.kind.buffer,
    table.data1.buffer,
    table.data2.buffer,
    table.seatIndex.buffer,
  ];
}

/**
 * Calculates the number of synth channels that a table needs: 16 for each port, up to the port
 * of the highest channel (design 3.4, 6.4).
 *
 * @param table The table.
 * @returns A multiple of 16, at least 16.
 */
export function synthChannelCount(table: SynthEventTable): number {
  const highest = table.channel.reduce((max, channel) => Math.max(max, channel), 0);
  return (Math.floor(highest / 16) + 1) * 16;
}
