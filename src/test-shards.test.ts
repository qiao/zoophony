import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { SHOT_FRAME_SHARDS } from './shots/test-shot-frames.ts';
import { SHOT_DEMOS } from './shots/test-shots.ts';
import { shardFileFaults, shardOf } from './test-shards.ts';

/**
 * Gives the items of all shards of a sweep, in the order of the shards.
 *
 * @param items The items of the sweep.
 * @param shards The number of shards.
 * @returns The items of shard 1, then of shard 2, and so on.
 */
function allShards<T>(items: readonly T[], shards: number): T[] {
  return Array.from({ length: shards }, (_, k) => shardOf(items, k + 1, shards)).flat();
}

describe('the shards of the slow sweeps (design 9.3)', () => {
  it('puts each demo of the shot frame tests into one shard file', () => {
    expect(allShards(SHOT_DEMOS, SHOT_FRAME_SHARDS).toSorted()).toEqual(SHOT_DEMOS.toSorted());
    expect(
      shardFileFaults(join(import.meta.dirname, 'shots'), 'shot-frames', SHOT_FRAME_SHARDS),
    ).toEqual([]);
  });
});
