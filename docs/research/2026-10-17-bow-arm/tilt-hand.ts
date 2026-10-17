/**
 * Prints the local rotations of the right hand, the right forearm, and the bow of the red fox
 * violinist on string 1 at 0.2 m of the hair, in the playing frames, with the stick leaned 0° and
 * 30° (research of 2026-10-17, round `bow-arm`, rule B8). The fingers turn the stick by the tilt
 * (`heldBowAt()`), so the hand keeps nearly its turn, and the bow bone turns in the hand.
 *
 * Usage, from the root of the worktree:
 *
 *     node docs/research/2026-10-17-bow-arm/tilt-hand.ts
 */
import { MathUtils, Quaternion } from 'three';
import { buildPlayer } from '../../../src/models/player.ts';
import { BONE_NAMES, boneIndex } from '../../../src/models/rig.ts';
import { bowedRig, holdOf, playingFrames } from '../../../src/pose/bowed-rig.ts';
import { poseBowed } from '../../../src/pose/bowed.ts';
import { createBowState } from '../../../src/pose/strokes.ts';
const model = buildPlayer('fox-red', 'violin');
for (const tilt of [0, 30]) {
  const rig = bowedRig(model, 'violin', { ...holdOf('fox-red', 'violin'), bowTilt: tilt * MathUtils.DEG2RAD });
  const rot = new Float32Array(BONE_NAMES.length * 4);
  const state = { ...createBowState(), string: 1, crossMean: 1, bow: 0.2, loudness: 0.5 };
  poseBowed(rig, playingFrames(rig), state, 1, rot, [0, 0, 0]);
  const q = (b: string) => new Quaternion().fromArray(rot, boneIndex(b as never) * 4);
  console.log(tilt, 'handR', q('handR').toArray().map((v) => v.toFixed(3)).join(','), 'forearmR', q('forearmR').toArray().map((v) => v.toFixed(3)).join(','), 'bow', q('bow').toArray().map((v) => v.toFixed(3)).join(','));
}
