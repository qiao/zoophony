import type { DemoId, StageFile } from '../app/demos.ts';

/** The loudness of each demo at the input of the limiter, in LUFS (design 6.8). */
export const TARGET_LOUDNESS = -18;

/**
 * The integrated loudness of each demo through the output chain with the piece gain 0 dB and the
 * headroom of the SoundFont (`SOUNDFONT_HEADROOM_DB`), in LUFS (ITU-R BS.1770-4). An offline
 * render in Node of each full demo with the SoundFont of design 6.2 measured it on 2026-10-05,
 * with the stage mix, the room of the synth, and the hall reverb, by the method of
 * `docs/research/room-and-mix.md`.
 */
export const DEMO_LOUDNESS = {
  'boulanger-matin': -18.5,
  'beethoven-5': -16.6,
  'grieg-ase': -18.3,
  'mozart-k488': -25.3,
  'mozart-k315': -22.3,
} as const satisfies Record<DemoId, number>;

/** The values of {@link DEMO_LOUDNESS}, for a lookup with any file name. */
const LOUDNESS_OF_FILE = new Map<string, number>(Object.entries(DEMO_LOUDNESS));

/**
 * Gives the gain of a piece (design 6.8): the gain that brings a demo to
 * {@link TARGET_LOUDNESS}, and 0 dB for a file of the user and for `perf-60.mid`. The app gives
 * it to the `Player` as `PlayerScore.gainDb`. The limiter catches the peaks of a file of the
 * user.
 *
 * @param file The demo or `perf-60.mid`, or `null` for a file of the user.
 * @returns The gain in dB, rounded to 0.1 dB.
 */
export function pieceGainDb(file: StageFile | null): number {
  const loudness = file ? LOUDNESS_OF_FILE.get(file) : undefined;
  return loudness === undefined ? 0 : Math.round((TARGET_LOUDNESS - loudness) * 10) / 10;
}
