import type { DemoId, StageFile } from '../app/demos.ts';

/** The loudness of each demo at the output of the chain, after the limiter, in LUFS (design 6.8). */
export const TARGET_LOUDNESS = -18;

/**
 * The loudness of each demo that {@link pieceGainDb} corrects, in LUFS: the target minus the
 * piece gain that gives {@link TARGET_LOUDNESS} (ITU-R BS.1770-4, integrated) after the limiter
 * and its trim. `docs/research/demo-loudness.md` measured it on 2026-10-06 for each full demo,
 * with the SoundFont of design 6.2, the stage mix, the room of the synth, and the code of
 * `output-chain.ts` in an OfflineAudioContext of headless Chromium. For a demo that the limiter
 * does not touch, the value is the loudness with the piece gain 0 dB.
 */
export const DEMO_LOUDNESS = {
  'boulanger-matin': -18.4,
  'beethoven-9': -13.6,
  'mozart-k525': -29.1,
  'bach-bwv1048': -19.3,
  'beethoven-8': -21.1,
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
