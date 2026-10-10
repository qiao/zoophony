import { MathUtils, Quaternion, Vector3 } from 'three';

import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import { toQuat, toVec3 } from '../models/tuples.ts';
import type { Quat, Vec3 } from '../models/tuples.ts';
import { loudnessOf } from '../pose/loudness.ts';
import { BOWED_HOLDS, bowedRig } from '../pose/bowed-rig.ts';
import type { BowedHold } from '../pose/bowed-rig.ts';
import { createRigCache, preparePlayer, seatSeedOf } from '../pose/plan.ts';
import { poseAt } from '../pose/pose-at.ts';
import type { AnimalPose } from '../pose/types.ts';
import type { TestNote } from './notes.ts';
import { TEST_VELOCITY, testPlayerNotes } from './plan.ts';
import type { SheetInstrument, ViewSheet } from './sheets.ts';
import { PLAYING, stillPose } from './view-poses.ts';

/** The moment of play that gives the pose of a model sheet (design 7.1). */
export interface SheetMoment {
  /** The test notes that the player plays. */
  readonly notes: readonly TestNote[];
  /** The song time of the pose, in seconds. */
  readonly time: number;
  /**
   * The hold of a bowed string in place of the hold of the stage, or `null` for the hold of the
   * stage.
   */
  readonly hold: BowedHold | null;
}

/**
 * Makes the play turn of the violin of a sheet: first a turn around the vertical axis, then a
 * tilt that raises the scroll. The violin of the stage points 70° to the left of the front.
 *
 * @param yawDeg The turn around the vertical axis, in degrees. A negative turn moves the scroll
 *   from the left toward the front.
 * @param tiltDeg The tilt of the scroll up, in degrees, after the turn.
 * @returns The turn, in the axes of the chest.
 */
export function shoulderTurn(yawDeg: number, tiltDeg: number): Quat {
  const yaw = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yawDeg * MathUtils.DEG2RAD);
  // The axis of the violin after the turn, and the level axis across it.
  const axis = new Vector3(-1, 0, 0)
    .applyAxisAngle(new Vector3(0, 1, 0), (yawDeg - 20) * MathUtils.DEG2RAD)
    .normalize();
  const across = new Vector3().crossVectors(axis, new Vector3(0, 1, 0)).normalize();
  const tilt = new Quaternion().setFromAxisAngle(across, tiltDeg * MathUtils.DEG2RAD);
  return toQuat(tilt.multiply(yaw));
}

/**
 * The moments of the sheet poses (design 7.1).
 *
 * - The violin of `fox-views.png` and `rabbit-views.png` lies on the left shoulder under the chin:
 *   it moves 0.25 H to the left and 0.05 H up from the stage hold, turns 25° from the left toward
 *   the front (45° to the left of the front), and tilts the scroll up 15°. The left hand holds
 *   the neck at the scroll, at the height of the mouth. The bow plays an A4 on the open A string
 *   in the middle of the hair, 1.4 s into the first down-bow of a phrase, so that the bow paw is
 *   at the chest, as in the sheets. The right elbow keeps the direction of the frog, forward and
 *   down, so that it hangs at the side. With the hold of the stage, the violin was in front of
 *   the chest, and the left hand 0.77 H below the head center. Near the frog, 0.1 s into the
 *   stroke, the bow paw of the red fox came up to its muzzle. With the elbow of the stage, which
 *   turns up toward the tip, the elbow stuck out to the side in the middle of the bow.
 * - The cello of `dog-views.png` plays a G3 on the G string, in the middle of a long down-bow. The
 *   bow lies square across the strings, with the frog out to the right of the player. The stage
 *   slants the bow 20° (design 5.3), and the bow then went down to the right knee.
 * - The polar bear of `polar-bear-views.png` plays C3 with the left hand and C5 with the right
 *   hand.
 */
export const SHEET_MOMENTS = {
  violin: {
    notes: [{ start: 1, length: 4, key: 69 }],
    time: 2.4,
    hold: {
      ...BOWED_HOLDS.violin,
      playShift: [-0.25, 0.05, 0],
      playTurn: shoulderTurn(-25, 15),
      poleTipR: BOWED_HOLDS.violin.poleR,
    },
  },
  cello: {
    notes: [{ start: 1, length: 4, key: 55 }],
    time: 3,
    hold: { ...BOWED_HOLDS.cello, slant: 0 },
  },
  piano: {
    notes: [
      { start: 1, length: 2, key: 48 },
      { start: 1, length: 2, key: 72 },
    ],
    time: 1.5,
    hold: null,
  },
} as const satisfies Readonly<Record<SheetInstrument, SheetMoment>>;

/**
 * Calculates the pose of a model sheet with `poseAt()` (design 5.1, 7.1): the player plays the
 * test notes of the moment of its instrument in a seat of its own, and the head looks to the
 * front.
 *
 * @param model The player model of the sheet.
 * @param sheet The species and the instrument of the sheet.
 * @param moment The moment of the pose.
 * @returns The pose.
 * @throws Error if `poseAt()` gives no pose for the player.
 */
export function sheetPose(
  model: PlayerModel,
  sheet: Pick<ViewSheet, 'species' | 'instrument'>,
  moment: SheetMoment = SHEET_MOMENTS[sheet.instrument],
): AnimalPose {
  const { species, instrument } = sheet;
  const rigs = createRigCache();
  if (moment.hold && (instrument === 'violin' || instrument === 'cello')) {
    rigs.bowedRigs.set(model, bowedRig(model, instrument, moment.hold));
  }

  const notes = testPlayerNotes(moment.notes, 0);
  const head = new Vector3(...(model.skeleton.positions[boneIndex('head')] ?? [0, 0, 0]));
  const ahead: Vec3 = toVec3(head.add(new Vector3(0, 0, -10)));
  const plan = preparePlayer(
    {
      model,
      place: {
        position: [0, 0, 0],
        facing: 0,
        support: model.support,
        cast: {
          seatIndex: 0,
          player: 0,
          species,
          instrument,
          kettles: 4,
          support: model.support,
        },
      },
      notes,
      loudness: notes.map(() => loudnessOf(TEST_VELOCITY)),
      lookTarget: ahead,
      seatSeed: seatSeedOf(1, 0),
    },
    1,
    rigs,
  );

  const pose = poseAt(
    { players: [plan], conductor: null, leader: null, beats: new Float64Array(), endSec: Infinity },
    moment.time,
    0,
    PLAYING,
    [],
  ).players[0];
  if (!pose) {
    throw new Error(`The sheet pose of the ${instrument} has no player.`);
  }
  return stillPose(pose);
}
