import type { DemoId, StageFile } from '../app/demos.ts';
import type { MixName } from './output-chain.ts';

/**
 * The loudness of each demo at the output of the chain, after the limiter, in LUFS (design 6.8):
 * the distribution loudness of music of AES TD1008. Spotify plays at -14 LUFS by default, and
 * EBU R 128 gives -23 LUFS for broadcast. At -16 LUFS, the limiter acts on at most 2 % of the
 * blocks of 50 ms of a demo by more than 1 dB (`pnpm loudness`).
 */
export const TARGET_LOUDNESS = -16;

/**
 * The loudness of each demo that {@link pieceGainDb} corrects, for each mix preset, in LUFS: the
 * target minus the piece gain that gives {@link TARGET_LOUDNESS} (ITU-R BS.1770-4, integrated)
 * after the limiter and its trim. `pnpm loudness --fit --mix <name>` measures it for each full
 * demo, with the SoundFont of design 6.2, the stage mix, the room of the synth, and the code of
 * `output-chain.ts` in an OfflineAudioContext of headless Chromium. For a demo that the limiter
 * does not touch, the value is the loudness with the piece gain 0 dB.
 */
export const DEMO_LOUDNESS: Readonly<Record<MixName, Readonly<Record<DemoId, number>>>> = {
  hall: {
    'boulanger-matin': -18.6,
    'beethoven-9': -10.8,
    'mozart-k525': -29.1,
    'bach-bwv1048': -19.3,
    'beethoven-8': -21.3,
    'mozart-k315': -22.5,
    'beethoven-1': -16.0,
    'brahms-2': -16.5,
    'beethoven-8-4': -17.1,
    'bach-bwv1047': -13.7,
    'bach-bwv1050': -21.6,
    'mendelssohn-op61': -21.1,
    'mozart-k417': -17.3,
    'mozart-k191': -16.1,
  },
  cinematic: {
    'boulanger-matin': -18.6,
    'beethoven-9': -10.8,
    'mozart-k525': -29.1,
    'bach-bwv1048': -19.3,
    'beethoven-8': -21.3,
    'mozart-k315': -22.5,
    'beethoven-1': -16.0,
    'brahms-2': -16.5,
    'beethoven-8-4': -17.1,
    'bach-bwv1047': -13.7,
    'bach-bwv1050': -21.6,
    'mendelssohn-op61': -21.1,
    'mozart-k417': -17.3,
    'mozart-k191': -16.1,
  },
};

/** The values of {@link DEMO_LOUDNESS}, for a lookup with any file name. */
const LOUDNESS_OF_FILE: Readonly<Record<MixName, ReadonlyMap<string, number>>> = {
  hall: new Map(Object.entries(DEMO_LOUDNESS.hall)),
  cinematic: new Map(Object.entries(DEMO_LOUDNESS.cinematic)),
};

/**
 * Gives the gain of a piece (design 6.8): the gain that brings a demo to
 * {@link TARGET_LOUDNESS}, and 0 dB for a file of the user and for `perf-60.mid`. The app gives
 * it to the `Player` as `PlayerScore.gainDb`. The limiter catches the peaks of a file of the
 * user.
 *
 * @param file The demo or `perf-60.mid`, or `null` for a file of the user.
 * @param mix The mix preset of the `Player`.
 * @returns The gain in dB, rounded to 0.1 dB.
 */
export function pieceGainDb(file: StageFile | null, mix: MixName): number {
  const loudness = file ? LOUDNESS_OF_FILE[mix].get(file) : undefined;
  return loudness === undefined ? 0 : Math.round((TARGET_LOUDNESS - loudness) * 10) / 10;
}
