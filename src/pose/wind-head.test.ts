import { MathUtils, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { note, programChange, tempo, timeSignature, track } from '../midi/test-smf.ts';
import type { TestFile } from '../midi/test-smf.ts';
import { boneIndex } from '../models/rig.ts';
import type { Vec3 } from '../models/tuples.ts';
import { posedAt, posedPiecePoint, posedPoint } from './test-kinematics.ts';
import type { PosedSkeleton } from './test-kinematics.ts';
import { NOT_STARTED, firstPlayers, sceneOf } from './test-scene.ts';
import { FOX_FLUTE_BACK, windHoldOf } from './winds.ts';

/** A flute on its own: eighth notes at 120 BPM for 4 s. */
const FLUTE: TestFile = {
  tracks: [
    [tempo(0, 120), timeSignature(0, 4, 4)],
    track(
      [programChange(0, 0, 73)],
      ...Array.from({ length: 16 }, (_, i) => note(i * 240, 0, 72 + (i % 5), i * 240 + 220)),
    ),
  ],
};

/**
 * Gives the forward direction of a posed bone on the level: its turn of -z, with no y.
 *
 * @param posed The posed skeleton.
 * @param bone The bone.
 * @returns The unit direction.
 */
function facing(posed: PosedSkeleton, bone: 'chest' | 'head'): Vector3 {
  const frame = posed.frames[boneIndex(bone)];
  return new Vector3(0, 0, -1)
    .applyQuaternion(frame?.rotation ?? new Quaternion())
    .setY(0)
    .normalize();
}

describe('the head turn of a wind hold (design 5.3)', () => {
  const scene = sceneOf(FLUTE);
  const [player] = firstPlayers(scene, ['flute']);
  if (!player) {
    throw new Error('The test file has no flute.');
  }
  const species = scene.layout.players[player.index]?.cast.species ?? 'fox-tan';
  const hold = windHoldOf(species, 'flute');
  const { grips } = player.model.instrument;
  const gap = (a: Vec3, b: Vec3): number => new Vector3(...a).distanceTo(new Vector3(...b));

  it('turns the head of the flutist to the left while it plays', () => {
    expect(hold.headTurn).toBeGreaterThan(0);
    for (const t of [0.5, 1.3, 2.9]) {
      const posed = posedAt(scene, player, t);
      const chest = facing(posed, 'chest');
      const head = facing(posed, 'head');
      // A turn to the left moves the facing of the head from -z toward -x.
      const turn = Math.atan2(chest.clone().cross(head).y, chest.dot(head));
      // The sway of the chest tilts both facings a little, so the level turn differs by less than 0.5°.
      expect(turn * MathUtils.RAD2DEG).toBeCloseTo(hold.headTurn * MathUtils.RAD2DEG, 0);
    }
  });

  it('keeps the lip plate at its place under the turned muzzle while the flutist plays', () => {
    if (!grips.mouth) {
      throw new Error('The flute has no grip of the mouth.');
    }
    // The place of the lip plate on the head: the mouth, moved by the hold.
    const lip = new Vector3(...hold.lipShift)
      .multiplyScalar(player.model.body.headHeight)
      .add(new Vector3(...player.model.body.mouth))
      .toArray();
    for (const t of [0.5, 1.3, 2.9]) {
      const posed = posedAt(scene, player, t);
      const mouth = posedPoint(posed, 'head', lip);
      expect(gap(mouth, posedPiecePoint(posed, grips.mouth))).toBeLessThan(1e-6);
    }
  });

  it('turns the right end of the flute back from square to the turned face by the hold', () => {
    const posed = posedAt(scene, player, 1.3);
    const lip = new Vector3(...posedPiecePoint(posed, { bone: 'instrument', at: [0, 0, 0] }));
    const foot = new Vector3(...posedPiecePoint(posed, { bone: 'instrument', at: [0.5, 0, 0] }));
    const along = foot.sub(lip).setY(0).normalize();
    // Square to the face, the level direction of the flute is at right angles to the facing of
    // the head. The sway of the chest tilts both a little, by less than 1°.
    const back = Math.sin(FOX_FLUTE_BACK * MathUtils.DEG2RAD);
    expect(Math.abs(along.dot(facing(posed, 'head')) + back)).toBeLessThan(0.015);
  });

  it('keeps the head square to the chest in the rest pose', () => {
    const posed = posedAt(scene, player, -1, 10, NOT_STARTED);
    const chest = facing(posed, 'chest');
    const head = facing(posed, 'head');
    expect(Math.abs(chest.clone().cross(head).y)).toBeLessThan(0.2);
  });
});
