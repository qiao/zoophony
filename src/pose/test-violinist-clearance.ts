import { describe, expect, it } from 'vitest';

import { note, programChange, tempo, timeSignature, track } from '../midi/test-smf.ts';
import type { TestFile } from '../midi/test-smf.ts';
import { describeRoleClearance, describeSceneClearance } from './test-role-clearance.ts';
import { sceneOf } from './test-scene.ts';
import { STANDING_VIOLINIST_SWEEP, VIOLINIST_SWEEP } from './test-sweep-roles.ts';

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

/** The keys of the solo violin: a note on each string, and high notes of the E string. */
const SOLO_KEYS = [55, 62, 69, 76, 88, 60, 79, 57];

/**
 * A solo violin at 120 BPM: quarter notes across the strings, a whole bow on each string from 4 s,
 * and pizzicato from 12 s. With one player for each part, the chamber form is `solo`, and the
 * rabbit stands (`castScore()` of `models/cast.ts`, design 4.2). The demos have no standing
 * rabbit, and a file of a user can have one.
 */
const SOLO_VIOLIN: TestFile = {
  tracks: [
    [tempo(0, 120), timeSignature(0, 4, 4)],
    track(
      [programChange(0, 0, 40)],
      ...SOLO_KEYS.map((key, i) => note(i * 480, 0, key)),
      ...[55, 62, 69, 76].map((key, i) => note(3840 + i * 1920, 0, key, 3840 + (i + 1) * 1920)),
      [programChange(11520, 0, 45)],
      ...SOLO_KEYS.map((key, i) => note(11520 + i * 480, 0, key)),
    ),
  ],
};

/**
 * Registers the tests of the clearance of a standing violinist (design 4.4, 5.2): the sweep of
 * {@link STANDING_VIOLINIST_SWEEP} for the standing rabbit of a solo violin, built with the real
 * `midi/` and `score/` modules.
 */
export function describeStandingViolinistClearance(): void {
  describe('the clearance of the standing violinist (design 9.3)', () => {
    const scene = sceneOf(SOLO_VIOLIN, 1, 'one-per-part');

    it('stands the rabbit of a solo violin', () => {
      const supports = STANDING_VIOLINIST_SWEEP.players(scene).map(
        (player) => player.model.support,
      );
      expect(supports).toEqual(['stand']);
    });

    describeSceneClearance(STANDING_VIOLINIST_SWEEP, scene, 'a solo violin');
  });
}
