import type { DemoId } from '../app/demos.ts';

/** The loudness of each demo at the input of the limiter, in LUFS (design 6.8). */
export const TARGET_LOUDNESS = -18;

/**
 * The integrated loudness of each demo through the output chain with the gain 0 dB, in LUFS
 * (ITU-R BS.1770-4). An offline render in Node of each full demo measured it on 2026-10-05, with
 * the stage mix, the room of the synth, and the hall reverb (`docs/research/room-and-mix.md`).
 */
export const DEMO_LOUDNESS = {
  'boulanger-matin': -18.0,
  'beethoven-5': -15.0,
  'grieg-ase': -17.7,
  'mozart-k488': -22.1,
  'mozart-k315': -20.6,
} as const satisfies Record<DemoId, number>;

/**
 * Gives the gain that brings a demo to {@link TARGET_LOUDNESS} (design 6.8). The app gives it
 * to the `Player` as `PlayerScore.gainDb`. A file of the user gets 0 dB, and the limiter
 * catches its peaks.
 *
 * @param id The demo.
 * @returns The gain in dB.
 */
export function demoGainDb(id: DemoId): number {
  return Math.round((TARGET_LOUDNESS - DEMO_LOUDNESS[id]) * 10) / 10;
}
