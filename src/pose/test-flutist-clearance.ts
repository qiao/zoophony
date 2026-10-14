import { describeRoleClearance } from './test-role-clearance.ts';
import { FLUTIST_SWEEP } from './test-sweep-roles.ts';

/**
 * The number of shard files of the test of the flutist clearance
 * (`flutist-clearance-<shard>.test.ts`, design 9.3). The demos with flutes split into three
 * shards.
 */
export const FLUTIST_CLEARANCE_SHARDS = 3;

/**
 * Registers the tests of the clearance of the flutist in the demos of one shard (design 4.4,
 * 5.3): the sweep of {@link FLUTIST_SWEEP} in a full play, the lift of the flute, the rest pose,
 * and the lowering after the song end, with the palms on their grips. The shard takes its demos
 * from the patched demos with a flute seat.
 *
 * @param shard The shard, from 1 to {@link FLUTIST_CLEARANCE_SHARDS}.
 */
export function describeFlutistClearanceShard(shard: number): void {
  describeRoleClearance(FLUTIST_SWEEP, shard, FLUTIST_CLEARANCE_SHARDS);
}
