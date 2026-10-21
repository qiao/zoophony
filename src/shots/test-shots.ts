import { patchedDemo } from '../../tools/patch-demos.ts';
import { writeSmf } from '../midi/test-smf.ts';
import { stringQuartetFile, violinPianoDuoFile, windQuintetFile } from '../models/test-chamber.ts';
import { pianoSoloFile } from '../score/test-audit-files.ts';
import { layoutScene } from '../models/layout-scene.ts';
import type { SceneLayout } from '../models/layout.ts';
import { ModelCache } from '../models/model-cache.ts';
import { scoreOf } from '../score/test-score.ts';
import type { Score } from '../score/types.ts';
import { prepareShots } from './prepare.ts';
import type { ShotPlan } from './types.ts';

/** The demos of the shot tests. */
export const SHOT_DEMOS = [
  'boulanger-matin.mid',
  'beethoven-9.mid',
  'mozart-k525.mid',
  'bach-bwv1048.mid',
  'beethoven-8.mid',
  'mozart-k315.mid',
] as const;

/** The seed of the shot plans of the tests: the seed of the app. */
export const TEST_SEED = 1;

/** The score, the layout, the models, and the shot plan of one demo. */
export interface ShotScene {
  readonly file: string;
  readonly score: Score;
  readonly layout: SceneLayout;
  readonly models: ModelCache;
  readonly plan: ShotPlan;
}

/**
 * Builds the scene and the shot plan of a file with the real modules. Only tests use this
 * function, so it does not enter the first download.
 *
 * @param file The name of the file.
 * @param bytes The bytes of the file.
 * @param seed The seed of the plan.
 * @returns The scene.
 */
export function shotSceneOf(file: string, bytes: Uint8Array, seed = TEST_SEED): ShotScene {
  const score = scoreOf(bytes);
  const models = new ModelCache();
  const layout = layoutScene(score, models);
  return { file, score, layout, models, plan: prepareShots(score, layout, seed, models) };
}

/** The bytes of one demo after the changes of `demos/patches.json`. */
interface DemoBytes {
  readonly file: string;
  readonly bytes: Uint8Array;
}

/**
 * Reads the demos of the shot tests.
 *
 * @returns The bytes of each demo, in the order of {@link SHOT_DEMOS}.
 * @throws Error if a demo is missing.
 */
export async function shotDemos(): Promise<DemoBytes[]> {
  return Promise.all(
    SHOT_DEMOS.map(async (file) => ({ file, bytes: (await patchedDemo(file)).bytes })),
  );
}

/**
 * Builds the scenes and the shot plans of the demos of the shot tests.
 *
 * @returns One scene for each demo, in the order of {@link SHOT_DEMOS}.
 */
export async function demoShotScenes(): Promise<ShotScene[]> {
  return (await shotDemos()).map((demo) => shotSceneOf(demo.file, demo.bytes));
}

/**
 * Builds the scenes and the shot plans of the chamber test files (design 4.2): a piano solo, a
 * duo of a violin and a piano, a string quartet, and a wind quintet. None has a conductor.
 *
 * @returns One scene for each file.
 */
export function chamberShotScenes(): ShotScene[] {
  return (
    [
      ['piano-solo.mid', pianoSoloFile()],
      ['violin-piano.mid', violinPianoDuoFile()],
      ['string-quartet.mid', stringQuartetFile()],
      ['wind-quintet.mid', windQuintetFile()],
    ] as const
  ).map(([file, events]) => shotSceneOf(file, writeSmf(events)));
}
