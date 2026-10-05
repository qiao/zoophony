import type { TestFile } from '../midi/test-smf.ts';
import { layoutScene } from '../models/layout-scene.ts';
import type { SceneLayout } from '../models/layout.ts';
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
  const layout = layoutScene(score);
  return { score, layout, plan: preparePoses(score, layout, seed) };
}

/** A transport that started to play at the wall time 0 and still plays. */
export const PLAYING: Transport = { playing: true, changedAtWall: 0, previousChangeAtWall: null };

/** The transport before the first play. */
export const NOT_STARTED: Transport = {
  playing: false,
  changedAtWall: null,
  previousChangeAtWall: null,
};

/**
 * Makes the audibility of all seats of a score, with no change.
 *
 * @param score The score.
 * @returns One entry for each seat: all seats sound.
 */
export function allAudible(score: Score): SeatAudibility[] {
  return score.seats.map(() => ({ audible: true, changedAtWall: 0, previousChangeAtWall: null }));
}
