/**
 * Measures the level of the right arm on each string (research of 2026-10-17, round `bow-arm`,
 * rule B2): for each bowed species, the bow in the middle of the bow range on each string, in the
 * playing frames with no idle motion, with the hold of the tree and with the string turn and the
 * stick tilt of `main` (9°, or 7° on the contrabass, and no tilt). The hand holds the bow with no
 * tilt at the grip of the tilted bow (`heldBowAt()`). The arm takes the elbow of the hold for the
 * place of the bow, and the hand rolls its back to that elbow one time, as in the first pass of
 * `poseBowed()`. It prints the height of the right elbow and of the right wrist above
 * the right shoulder joint, in cm.
 *
 * Usage, from the root of the worktree:
 *
 *     node docs/research/2026-10-17-bow-arm/arm-levels.ts
 */
import { MathUtils, Quaternion, Vector3 } from 'three';

import { buildPlayer } from '../../../src/models/player.ts';
import type { SpeciesId } from '../../../src/models/species.ts';
import { bowedRig, holdOf, playingFrames } from '../../../src/pose/bowed-rig.ts';
import type { BowedHold, BowedInstrument } from '../../../src/pose/bowed-rig.ts';
import {
  createBowPlaces,
  gripHand,
  heldBowAt,
  instrumentAt,
  rollToward,
  shoulderTurn,
  stringsAt,
} from '../../../src/pose/bowed.ts';
import { mixDirection } from '../../../src/pose/blend.ts';
import { poseShoulder, solveArm } from '../../../src/pose/ik.ts';

const PLAYERS: readonly [SpeciesId, BowedInstrument][] = [
  ['rabbit', 'violin'],
  ['fox-red', 'violin'],
  ['cat', 'viola'],
  ['dog', 'cello'],
  ['hippo', 'contrabass'],
];

/**
 * Gives the height of the right elbow and wrist above the shoulder joint on each string.
 *
 * @param species The species.
 * @param instrument The instrument.
 * @param hold The hold.
 * @returns For each string, the heights in cm.
 */
function levels(species: SpeciesId, instrument: BowedInstrument, hold: BowedHold): string[] {
  const rig = bowedRig(buildPlayer(species, instrument), instrument, hold);
  const frames = playingFrames(rig);
  const { place, strings, bow, hand } = createBowPlaces();
  const tilted = { grip: new Vector3(), rotation: new Quaternion() };
  stringsAt(rig, instrumentAt(rig, frames, 1, place), strings);
  const shoulder = poseShoulder(
    rig.armR,
    frames.chest,
    rig.chestBind,
    shoulderTurn(rig, 1, new Quaternion()),
  );
  const pole = mixDirection(
    new Vector3(...hold.poleR),
    new Vector3(...hold.poleTipR),
    0.5,
    new Vector3(),
  ).applyQuaternion(frames.chest.rotation);
  const [low, high] = rig.bowRange;
  return [0, 1, 2, 3].map((string) => {
    heldBowAt(rig, strings, string, (low + high) / 2, 0, tilted, bow);
    gripHand(rig, bow, 0, hand);
    let elbow = solveArm(rig.armR.bind, shoulder.position, shoulder.rotation, hand.wrist, pole).elbow;
    gripHand(rig, bow, rollToward(rig, bow, elbow), hand);
    elbow = solveArm(rig.armR.bind, shoulder.position, shoulder.rotation, hand.wrist, pole).elbow;
    const up = (p: Vector3): string => (100 * (p.y - shoulder.position.y)).toFixed(1);
    return `${up(elbow)} / ${up(hand.wrist)}`;
  });
}

console.log('| Species | Hold | Elbow / wrist cm, string 0 (lowest) | String 1 | String 2 | String 3 |');
console.log('|---|---|---|---|---|---|');
for (const [species, instrument] of PLAYERS) {
  const hold = holdOf(species, instrument);
  const main: BowedHold = {
    ...hold,
    stringTurn: (instrument === 'contrabass' ? 7 : 9) * MathUtils.DEG2RAD,
    bowTilt: 0,
  };
  for (const [label, h] of [
    ['main', main],
    ['branch', hold],
  ] as const) {
    console.log(`| ${species} ${instrument} | ${label} | ${levels(species, instrument, h).join(' | ')} |`);
  }
}
