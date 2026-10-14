import { describe, expect, it } from 'vitest';

import { patchedDemos } from '../../tools/patch-demos.ts';
import { scoreOf } from '../score/test-score.ts';
import { shardOf } from '../test-shards.ts';
import type { PosedSkeleton } from './test-kinematics.ts';
import { sceneOf } from './test-scene.ts';
import type { TestScene } from './test-scene.ts';
import { depthLimit, pairText, sweepDepths, targetErrors } from './test-sweep.ts';
import type { RoleSweep, SweepPlayer, SweepSample } from './test-sweep.ts';

/** The other checks of a role in one set of samples, such as the gap to a stand. */
export interface RoleChecks {
  /** Gets each posed sample of the set. */
  readonly visit: (posed: PosedSkeleton, sample: SweepSample) => void;
  /** Checks the results after the last sample of the set. */
  readonly check: () => void;
}

/**
 * Registers the sweep tests of a role in the demos of one shard (design 9.3). Each player of the
 * role plays each set of samples of the role. Each point of each moving part stays at most the
 * contact depth of the role in each obstacle, or at most a depth that a decision accepts. Each
 * hand with note targets, or the part that it holds, stays near its targets. Each shard file
 * calls it with its own shard, so that Vitest runs the shards in separate workers, and a new demo
 * joins a shard with no new file.
 *
 * @param role The role.
 * @param shard The shard, from 1 to `shards`.
 * @param shards The number of shard files.
 * @param checksOf Gives the other checks of the role for a player and a set of samples.
 */
export function describeRoleClearance(
  role: RoleSweep,
  shard: number,
  shards: number,
  checksOf?: (scene: TestScene, player: SweepPlayer, set: string) => RoleChecks,
): void {
  describe(`the clearance of the ${role.role} (design 9.3)`, async () => {
    const demos = (await patchedDemos()).filter((demo) => role.hasRole(scoreOf(demo.bytes)));
    for (const demo of shardOf(demos, shard, shards)) {
      const scene = sceneOf(demo.bytes);
      for (const player of role.players(scene)) {
        it(`keeps the arms of the ${player.name} out of the body and the instrument in ${demo.file}`, () => {
          for (const { name, samples } of role.sampleSets(scene)) {
            const checks = checksOf?.(scene, player, name);
            for (const pair of sweepDepths(role, player, samples, checks?.visit)) {
              const limit = depthLimit(role, pair, name);
              expect
                .soft(pair.depth, `${name}: ${pairText(pair)}`)
                .toBeLessThanOrEqual(limit.depth);
            }
            checks?.check();
          }
          for (const { side, error, song } of targetErrors(player)) {
            expect
              .soft(error, `hand ${side} at its note target, song ${song.toFixed(2)} s`)
              .toBeLessThanOrEqual(role.targetError);
          }
        });
      }
    }
  });
}
