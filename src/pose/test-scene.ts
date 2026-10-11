import { patchedDemo } from '../../tools/patch-demos.ts';
import type { TestFile } from '../midi/test-smf.ts';
import { conductorOn, layoutScene } from '../models/layout-scene.ts';
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

/**
 * Builds the scene of a demo (design 8.2) after the changes of `demos/patches.json`, as
 * {@link sceneOf} does.
 *
 * @param file The name of the demo, for example `boulanger-matin.mid`.
 * @returns The scene.
 * @throws Error if the demo is missing.
 */
export async function demoSceneOf(file: string): Promise<TestScene> {
  return sceneOf((await patchedDemo(file)).bytes);
}

/**
 * Builds the scene of a test file as {@link sceneOf} does, and puts the conductor on the podium
 * center also for a chamber group, which has no conductor (design 4.2). The tests of the beats of
 * the baton use it: the baton follows the beats of the score, not the places of the players.
 *
 * @param file The file as events, or its bytes.
 * @returns The scene, with a conductor.
 */
export function conductedSceneOf(file: TestFile | Uint8Array): TestScene {
  const score = scoreOf(file);
  const models = new ModelCache();
  const chamber = layoutScene(score, models);
  const layout = { ...chamber, conductor: chamber.conductor ?? conductorOn(chamber.podium) };
  return { score, layout, plan: preparePoses(score, layout, 1, models), models };
}

/**
 * Gives a value of the conductor of a test scene, such as its plan or its pose.
 *
 * @param value The value, or `null` for a chamber group with no conductor (design 4.2).
 * @returns The value.
 * @throws {Error} If the scene has no conductor.
 */
export function ofConductor<T>(value: T | null): T {
  if (value === null) {
    throw new Error('The test scene has no conductor.');
  }
  return value;
}

/** A transport that started to play at the wall time 0 and still plays. */
export const PLAYING: Transport = {
  playing: true,
  changedAtWall: 0,
  before: null,
  startSec: 0,
  holdSec: 3,
  leadSec: Number.POSITIVE_INFINITY,
};

/** The transport before the first play. */
export const NOT_STARTED: Transport = {
  playing: false,
  changedAtWall: null,
  before: null,
  startSec: 0,
  holdSec: 3,
  leadSec: Number.POSITIVE_INFINITY,
};

/**
 * Makes the audibility of all seats of a score, with no change.
 *
 * @param score The score.
 * @returns One entry for each seat: all seats sound.
 */
export function allAudible(score: Score): SeatAudibility[] {
  return score.seats.map(() => ({ audible: true, changedAtWall: 0, before: null }));
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
      model: scene.models.get(cast.species, cast.instrument, cast.kettles, cast.support),
    };
  });
}
