import type { BoneName } from '../models/rig.ts';
import type { InstrumentId } from '../models/instruments/types.ts';

/**
 * The values of the page that the smoke test reads (`tools/smoke.ts`, design 9.3). Only the dev
 * server gives `window.zoophony`, so the build does not hold it.
 */
export interface DevHook {
  /** The song time of the last frame, in seconds: `Player.now()` after the load, else 0. */
  readonly songTime: number;
  /** True while the transport plays. */
  readonly playing: boolean;
  /** The instrument of each player of the current demo, in the order of `ScenePose.players`. */
  readonly instruments: readonly InstrumentId[];
  /**
   * Gives the rotation of a bone of a player in the last frame.
   *
   * @param player The index of the player in `ScenePose.players`.
   * @param bone The bone.
   * @returns The quaternion (x, y, z, w), or an empty list with no such player.
   */
  rotation(player: number, bone: BoneName): number[];
}

declare global {
  interface Window {
    /** The values of the page for the smoke test. Only the dev server sets it. */
    zoophony?: DevHook;
  }
}
