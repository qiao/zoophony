import { describe, expect, it } from 'vitest';

import { ModelCache } from '../models/model-cache.ts';
import type { PlayerModel } from '../models/player.ts';
import type { InstrumentId } from '../models/instruments/types.ts';
import type { PosePlan } from './plan.ts';
import { createScenePose, poseAt } from './pose-at.ts';
import { ARM_CONTACT_DEPTH, armGaps, clearanceRig } from './test-arm-clearance.ts';
import type { ClearanceRig } from './test-arm-clearance.ts';
import { poseSkeleton } from './test-kinematics.ts';
import { PLAYING, demoSceneOf } from './test-scene.ts';
import type { TestScene } from './test-scene.ts';
import type { Transport } from './types.ts';

let cached: Promise<TestScene> | null = null;

/**
 * Builds the scene of the default demo (design 8.2) one time for all the cases of a test file.
 *
 * @returns The scene.
 * @throws Error if the default demo is missing.
 */
function defaultDemoScene(): Promise<TestScene> {
  cached ??= demoSceneOf('boulanger-matin.mid');
  return cached;
}

/** The times of the samples of one check. */
interface Samples {
  /** The song times. */
  readonly songTimes: readonly number[];
  /** Gives the wall time of a song time. */
  readonly wallOf: (songTime: number) => number;
  /** The transport. */
  readonly transport: Transport;
}

/**
 * Gives the times of a check of the playing pose: song times every `step` seconds from `start` to
 * the end of the song, with the wall clock 10 s to 40 s after the play, so that the idle motion
 * varies.
 *
 * @param scene The scene.
 * @param step The step of the samples, in seconds.
 * @param start The first song time.
 * @returns The samples.
 */
function playSamples(scene: TestScene, step: number, start = 0): Samples {
  const songTimes: number[] = [];
  for (let t = start; t < scene.score.durationSec; t += step) {
    songTimes.push(t);
  }
  return { songTimes, wallOf: (t) => 10 + (t % 30), transport: PLAYING };
}

/**
 * Gives the times of a check of the lift at the start of the song: the wall clock from 0 to
 * 2.5 s. {@link armFaults} poses each of them at the song time 0.
 *
 * @param step The step of the samples, in seconds.
 * @returns The samples. Each song time is the wall time of its sample.
 */
function liftSamples(step: number): Samples {
  const walls: number[] = [];
  for (let wall = 0; wall <= 2.5; wall += step) {
    walls.push(wall);
  }
  // The transport starts to play at the wall time 0, so the players lift in these samples.
  return { songTimes: walls, wallOf: (wall) => wall, transport: PLAYING };
}

/**
 * Lists the arm parts of the players of one instrument that go into the body deeper than
 * {@link ARM_CONTACT_DEPTH}: the forearm, the hand, or the lower half of the upper arm in the
 * torso, the head, or the thighs (design 5.2). A contact is permitted.
 *
 * @param scene The scene.
 * @param plan The plan of the scene.
 * @param models The models of the plan.
 * @param instrument The instrument.
 * @param samples The times of the samples.
 * @param lift `true` to pose the song time 0 at each wall time of the samples.
 * @returns One line for each player and arm part, with its deepest sample. Empty if all keep
 *   their gaps.
 */
function armFaults(
  scene: TestScene,
  plan: PosePlan,
  models: ModelCache,
  instrument: InstrumentId,
  samples: Samples,
  lift = false,
): string[] {
  const rigs = new Map<PlayerModel, ClearanceRig>();
  const seen = new Set<string>();
  const faults = new Map<string, string>();
  const worst = new Map<string, number>();
  for (const [index, place] of scene.layout.players.entries()) {
    const { cast } = place;
    const kind = `${cast.species} ${cast.support} ${cast.seatIndex}`;
    const player = plan.players[index];
    if (cast.instrument !== instrument || seen.has(kind) || !player) {
      continue;
    }
    seen.add(kind);

    const model = models.get(cast.species, cast.instrument, cast.kettles, cast.support);
    const rig = rigs.get(model) ?? clearanceRig(model);
    rigs.set(model, rig);
    const one: PosePlan = { ...plan, players: [player] };
    const buffer = createScenePose(one);
    for (const time of samples.songTimes) {
      const song = lift ? 0 : time;
      const pose = poseAt(one, song, samples.wallOf(time), samples.transport, [], buffer)
        .players[0];
      if (!pose) {
        throw new Error(`The ${instrument} has no pose.`);
      }
      for (const gap of armGaps(rig, poseSkeleton(model, pose), 0.1)) {
        const key = `${cast.species} ${gap.side} ${gap.part} in the ${gap.group}`;
        if (gap.gap < -ARM_CONTACT_DEPTH && gap.gap < (worst.get(key) ?? Infinity)) {
          worst.set(key, gap.gap);
          faults.set(key, `${key}: gap ${gap.gap.toFixed(3)} H at ${time.toFixed(2)} s`);
        }
      }
    }
  }
  return [...faults.values()];
}

/**
 * Registers the test of the arms of some instruments of the default demo in the playing pose
 * (design 5.2, 5.3). Each test file of the play clearance calls it for one family of
 * instruments, so that Vitest runs the families in separate workers.
 *
 * @param instruments The instruments whose arms the test checks.
 */
export function describePlayClearance(instruments: readonly InstrumentId[]): void {
  describe('the arms in the playing pose (design 5.2, 5.3)', () => {
    // The samples: each half second of the default demo, and the lift every 0.1 s. With the
    // elbows of the winds down, the arms go up to 0.3 H into the thighs and 0.2 H into the belly.
    it.each(instruments)('keeps the arms of the %s out of the body', async (instrument) => {
      const scene = await defaultDemoScene();

      const faults = [
        ...armFaults(scene, scene.plan, scene.models, instrument, playSamples(scene, 0.5)),
        ...armFaults(scene, scene.plan, scene.models, instrument, liftSamples(0.1), true),
      ];

      expect(faults).toEqual([]);
    });
  });
}
