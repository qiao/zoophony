import type { TestFile } from '../midi/test-smf.ts';
import { layoutScene } from '../models/layout-scene.ts';
import type { SceneLayout } from '../models/layout.ts';
import { ModelCache } from '../models/model-cache.ts';
import type { PlayerModel } from '../models/player.ts';
import type { InstrumentId } from '../models/instruments/types.ts';
import { scoreOf } from '../score/test-score.ts';
import type { Score, SectionSize } from '../score/types.ts';
import { preparePoses } from './plan.ts';
import type { PosePlan } from './plan.ts';
import type { SeatAudibility, Transport } from './types.ts';

/** The score, the layout, and the pose plan of a test file. */
export interface TestScene {
  readonly score: Score;
  readonly layout: SceneLayout;
  readonly plan: PosePlan;
  /** The player models that the layout and the plan share. */
  readonly models: ModelCache;
}

/**
 * Builds the score, the layout, and the pose plan of a test file with the real modules. Only
 * tests use this function, so it does not enter the first download.
 *
 * @param file The file as events, or its bytes.
 * @param seed The seed of the pose.
 * @param sectionSize The value of the setting "Section size".
 * @returns The scene.
 */
export function sceneOf(
  file: TestFile | Uint8Array,
  seed = 1,
  sectionSize: SectionSize = 'auto',
): TestScene {
  const score = scoreOf(file, sectionSize);
  const models = new ModelCache();
  const layout = layoutScene(score, models);
  return { score, layout, plan: preparePoses(score, layout, seed, models), models };
}

/** A transport that started to play at the wall time 0 and still plays. */
export const PLAYING: Transport = { playing: true, changedAtWall: 0, weightAtChange: 0 };

/** The transport before the first play. */
export const NOT_STARTED: Transport = { playing: false, changedAtWall: null, weightAtChange: 0 };

/**
 * Makes the audibility of all seats of a score, with no change.
 *
 * @param score The score.
 * @returns One entry for each seat: all seats sound.
 */
export function allAudible(score: Score): SeatAudibility[] {
  return score.seats.map(() => ({ audible: true, changedAtWall: 0, previousChangeAtWall: null }));
}

/** One player of a test scene, with its model. */
export interface ScenePlayer<I extends InstrumentId = InstrumentId> {
  /** The index of the player in the layout and in the plan. */
  readonly index: number;
  readonly instrument: I;
  readonly model: PlayerModel;
}

/**
 * Finds the first player of each instrument in a scene, with its model.
 *
 * @param scene The scene.
 * @param instruments The instruments.
 * @returns One player for each instrument, in the order of `instruments`.
 * @throws Error if the scene has no player of an instrument.
 */
export function firstPlayers<I extends InstrumentId>(
  scene: TestScene,
  instruments: readonly I[],
): ScenePlayer<I>[] {
  return instruments.map((instrument) => {
    const index = scene.layout.players.findIndex((p) => p.cast.instrument === instrument);
    const cast = scene.layout.players[index]?.cast;
    if (!cast) {
      throw new Error(`The test file has no ${instrument}.`);
    }
    return {
      index,
      instrument,
      model: scene.models.get(cast.species, cast.instrument, cast.kettles),
    };
  });
}
