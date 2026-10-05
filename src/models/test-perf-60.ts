import { chord, port, programChange, track } from '../midi/test-smf.ts';
import type { TestFile } from '../midi/test-smf.ts';

/**
 * The seats of `perf-60.mid` (design 9.5): the program, or -1 for the rhythm channel, and the
 * keys of one chord. Each chord has as many notes as the seat has players with the section size
 * "One per part": 60 players in all.
 */
const PERF_60_SEATS: readonly (readonly [program: number, keys: readonly number[]])[] = [
  [40, [67, 69, 71, 72, 74, 76]],
  [40, [60, 62, 64, 65, 67, 69]],
  [41, [55, 57, 59, 60]],
  [42, [43, 45, 47, 48]],
  [43, [31, 33, 35]],
  [73, [76, 79, 84]],
  [68, [69, 72, 76]],
  [71, [60, 64, 67]],
  [70, [43, 48, 52]],
  [60, [53, 57, 60, 65]],
  [56, [67, 72, 76]],
  [57, [48, 52, 55]],
  [58, [36]],
  [47, [45]],
  [-1, [36, 38, 49, 81]],
  [46, [48, 55, 64, 72]],
  [0, [48, 60, 64, 67]],
  [52, [55, 59, 62, 64, 67, 71, 74]],
];

/**
 * Builds the seats of `perf-60.mid` as a test file: one track for each seat, two chords each.
 * Port 0 holds 15 melodic channels and the rhythm channel. Port 1 holds the last two seats. Only
 * tests use this function.
 *
 * @returns The test file.
 */
export function perf60File(): TestFile {
  let next = 0;
  const tracks = PERF_60_SEATS.map(([program, keys]) => {
    if (program < 0) {
      return track([port(0)], chord(0, 9, keys), chord(960, 9, keys, 1440));
    }
    const slot = next < 9 ? next : next + 1;
    next += 1;
    const portIndex = slot < 16 ? 0 : 1;
    const channel = slot % 16;
    return track(
      [port(portIndex), programChange(0, channel, program)],
      chord(0, channel, keys),
      chord(960, channel, keys, 1440),
    );
  });
  return { tracks };
}
