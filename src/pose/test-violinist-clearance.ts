import { describeRoleClearance } from './test-role-clearance.ts';
import { VIOLINIST_SWEEP } from './test-sweep-roles.ts';

/**
 * The number of shard files of the test of the violinist clearance
 * (`violinist-clearance-<shard>.test.ts`, design 9.3). Each demo has a violin section, and the
 * sweep of one rabbit takes about 9 s for each demo, so each shard holds two demos.
 */
export const VIOLINIST_CLEARANCE_SHARDS = 3;

/**
 * Registers the tests of the clearance of the violinist in the demos of one shard (design 4.4,
 * 5.3): the sweep of {@link VIOLINIST_SWEEP} in a full play, the lift of the violin, the rest pose,
 * and the lowering after the song end, with the bow hair on the strings in each stroke. The shard
 * takes its demos from the patched demos with a violin seat.
 *
 * @param shard The shard, from 1 to {@link VIOLINIST_CLEARANCE_SHARDS}.
 */
export function describeViolinistClearanceShard(shard: number): void {
  describeRoleClearance(VIOLINIST_SWEEP, shard, VIOLINIST_CLEARANCE_SHARDS);
}
