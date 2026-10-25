import { MathUtils, Quaternion, Vector3 } from 'three';

import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import type { SpeciesId } from '../models/species.ts';
import { placePoint } from '../models/instruments/hold.ts';
import { VIOLIN } from '../models/instruments/strings.ts';
import type { PlayTarget, PlayTargetKind } from '../models/instruments/types.ts';
import { IDENTITY, toQuat, toVec3 } from '../models/tuples.ts';
import type { Quat, Vec3 } from '../models/tuples.ts';
import {
  BOWED_HANDS,
  MIDDLE_FINGER,
  createBowPlaces,
  gripHand,
  heldBowAt,
  instrumentAt,
  rollToward,
  shoulderTurn,
  shoulderTurnL,
  stopHandAt,
  stringsAt,
} from './bowed.ts';
import { hangingArm } from './hang.ts';
import type { InstrumentOf } from './family.ts';
import { setFromBasis } from './frames.ts';
import type { TorsoFrames } from './frames.ts';
import { armRig, poseShoulder, solveArm } from './ik.ts';
import { lapPoint } from './lap.ts';
import type { LapPlace } from './lap.ts';
import type { ArmRig } from './ik.ts';
import type { BowRange } from './strokes.ts';

/** The bowed strings of design 4.6. */
export type BowedInstrument = InstrumentOf<'bowed'>;

/**
 * The values of the hold of each bowed string (design 4.6, 4.7). The directions are in the model
 * axes of the bind pose: the player faces -z, and its left is -x.
 */
export interface BowedHold {
  /** The bow tip points to this side of the strings, across them. */
  readonly tip: Vec3;
  /** The left fingers tilt over the neck to this side of the strings. */
  readonly fingers: Vec3;
  /**
   * The tilt of the left hand from the normal of the strings to the side of
   * {@link BowedHold.fingers}, in the playing pose and the rest pose. The fingers point up from
   * the strings, tilted over the neck, and the palm is below the neck, on the other side.
   */
  readonly tiltL: number;
  /**
   * The direction to which the left elbow points while the player plays, with the finger on the
   * highest string, below the fourth position.
   */
  readonly poleL: Vec3;
  /**
   * The direction toward which the left elbow turns for the lower strings and the high positions
   * (design 5.3): toward the body on the violin and the viola, and up on the cello and the
   * contrabass (`docs/reference/string-technique.md`, section 1.8).
   */
  readonly elbowToward: Vec3;
  /** The turn of the left elbow toward {@link BowedHold.elbowToward} for each lower string. */
  readonly elbowPerString: number;
  /**
   * The further turn of the left elbow toward {@link BowedHold.elbowToward} from the fourth
   * position to the sixth position (`docs/reference/string-technique.md`, section 1.5).
   */
  readonly highElbow: number;
  /**
   * The further tilt of the left hand over the neck, to the side of {@link BowedHold.fingers},
   * from the second position to the fifth position (`leftTilt()` of `pose/bowed.ts`): the hand
   * goes up and over the shoulder of the instrument, and the wrist comes up beside it
   * (`docs/reference/string-technique.md`, section 1.5). The finger block keeps its place on the
   * strings.
   */
  readonly highTilt: number;
  /** The direction to which the right elbow points while the bow plays at the frog. */
  readonly poleR: Vec3;
  /**
   * The direction to which the right elbow points while the bow plays at the tip. The direction
   * turns from {@link BowedHold.poleR} with the place of the contact point on the bow range.
   */
  readonly poleTipR: Vec3;
  /** The direction to which the right elbow points in pizzicato. */
  readonly polePizzicato: Vec3;
  /**
   * The share of the turn of the right elbow to the back of the hand in the middle of a change
   * between the bow and pizzicato. The share is 0 at the start and at the end of the change.
   */
  readonly followChange: number;
  /**
   * The far side of the stick for the roll of the right hand (`rollToward()` of `pose/bowed.ts`):
   * the angle of the elbow around the stick, from the back of the hand of the bind pose, at which
   * the roll changes from one end of its range to the other end, in radians. Near it, a small
   * move of the elbow turns the hand by about 200°, so no elbow of the hold comes near it. It is
   * π, the side of the stick opposite to the back of the hand, for a hold with no own value.
   */
  readonly farSideR: number;
  /**
   * The move of the instrument while the player plays, in head heights, in the axes of the parent
   * of the `instrument` bone. It makes room for the arms between the instrument and the body.
   */
  readonly playShift: Vec3;
  /**
   * The turn of the instrument around its bone while the player plays, in the axes of the parent
   * of the `instrument` bone. The holds of the stage keep the turn of the bind pose. The views
   * page turns the violin to the shoulder of its model sheets (design 7.1).
   */
  readonly playTurn: Quat;

  /** The direction to which the right elbow points in the rest pose, in the axes of the root. */
  readonly restPoleR: Vec3;
  /** The direction to which the left elbow points in the rest pose, in the axes of the chest. */
  readonly restPoleL: Vec3;
  /** The bow tip points to this side in pizzicato, as the plucking hand holds it. */
  readonly pizzicatoTip: Vec3;
  /**
   * The turn of the bow around the strings from one string to the next: the angle between two
   * neighbor string planes. A positive turn moves the bow to the low strings on the bass side:
   * `top × axis`, the left of the strings for a viewer at the bridge who looks to the scroll with
   * the top plate up. Each hold takes the real angle of `docs/reference/string-technique.md`,
   * section 2.2, or the largest angle below it with which the bow arm still reaches the full hair
   * (`bowRangeOf()`).
   */
  readonly stringTurn: number;
  /**
   * The turn of the bow around its hair, so that the stick leans toward the fingerboard and the
   * hair touches the strings with its edge: about 30° on the violin, and less on the lower
   * instruments (`docs/reference/string-technique.md`, section 2.1).
   */
  readonly bowTilt: number;
  /**
   * The sounding point: the place of the bow on the strings, as a share of the string length from
   * the bridge, in piano (loudness 0) and in forte (loudness 1). A louder note moves the bow
   * toward the bridge (`docs/reference/string-technique.md`, section 2.4).
   */
  readonly soundingPoint: readonly [piano: number, forte: number];
  /**
   * The turn of the bow in the plane of the strings, from square across them. The frog comes
   * nearer to the right shoulder, so that the short arms of the animals reach the strings.
   */
  readonly slant: number;
  /** The forward turn of the right shoulder bone around y, so that the arm reaches further. */
  readonly reach: number;
  /**
   * The forward turn of the left shoulder bone around y, in the play and in the rest, so that the
   * left arm reaches the fingerboard of a floor instrument far in front of a round body. 0 keeps
   * the shoulder of the bind pose.
   */
  readonly reachL: number;
  /**
   * The free part of the bow hair at each end, in meters. The reached part of the hair
   * (`BowedRig.bowRange`) starts at this distance from the frog and stops at this distance from
   * the tip, so the strokes come no nearer to the ends.
   */
  readonly freeHair: number;
  /**
   * The hair at the frog that the bow plays no part of, in meters, when it is longer than
   * {@link BowedHold.freeHair}. A short arm reaches the frog only nearly straight, and then the
   * forearm crosses the rim of a floor instrument. The reached part of the hair starts at this
   * distance from the frog. 0 keeps the free hair.
   */
  readonly frogHair: number;
  /** The forward lean of the spine. It brings the shoulders nearer to a floor instrument. */
  readonly lean: number;
  /**
   * The turn of the head down while the player plays, in radians, so that the jaw lies on the
   * chin rest, as a violinist rests the jaw on it (`docs/reference/string-technique.md`, section
   * 1.10). 0 keeps the head level.
   */
  readonly headDrop: number;
  /**
   * The place of the left fingers on the target `fingerboard` in the rest pose: 0 at the nut, 1
   * at the end of the fingerboard.
   */
  readonly restPlace: number;
  /**
   * The place of the pluck: 0 at the end of the fingerboard, 1 at the bow contact point. A value
   * below 0 lies over the fingerboard, toward the nut. The right palm is above it.
   */
  readonly pluckPlace: number;
  /**
   * The move of the plucking palm from the strings toward the frog side, in meters: a real
   * bassist brings the hand up from the side and rests the thumb on the edge of the fingerboard
   * (`docs/reference/string-technique.md`, section 2.8). 0 keeps the palm above the strings.
   */
  readonly pluckSide: number;
  /**
   * The end of the part of the fingerboard that the left hand stops, from 0 at the nut to 1 at
   * the end (`stopRangeOf()`). A thick arm that comes from behind the upper bout cannot reach the
   * fingerboard over the bout without going through it. 1 keeps the whole fingerboard.
   */
  readonly stopEnd: number;
  /**
   * The rest pose of the instrument: its axis, the side of its top plate, and the place of its
   * bone (the tail end) on the left thigh. `null` keeps the instrument in its playing place, with
   * {@link BowedHold.playShift} and {@link BowedHold.playTurn}, as the cello and the contrabass
   * stand on the floor.
   */
  readonly rest: {
    /** The direction from the tail end to the scroll. */
    readonly axis: Vec3;
    /** The side of the top plate. */
    readonly top: Vec3;
    /** The place of the tail end on the left thigh. */
    readonly lap: LapPlace;
  } | null;
  /**
   * The largest move of the instrument in the middle of the lift and of the lowering, in head
   * heights, in the axes of the root: a via of the instrument (design 5.2). It keeps a violin or a
   * viola on its way between the lap and the chin off the belly. With {@link BowedHold.liftPlace},
   * it moves the point of the left paw on the neck. `[0, 0, 0]` mixes the rest place and the
   * playing place directly.
   */
  readonly liftReach: Vec3;
  /**
   * The turn of the instrument in the middle of the lift and of the lowering: the direction from
   * the tail end to the scroll, and the side of the top plate, in the axes of the root, as
   * {@link BowedHold.rest} (design 5.2). The instrument turns from the rest to this turn, then to
   * the playing turn. Thus the left paw on the neck can turn on a path that keeps its twist on the
   * forearm away from 180°, and the instrument can stay near the chest. `null` mixes the rest
   * turn and the playing turn directly.
   */
  readonly liftTurn: { readonly axis: Vec3; readonly top: Vec3 } | null;
  /**
   * The place of the left fingers on the target `fingerboard` in the middle of the lift and of the
   * lowering, where the left paw carries the instrument (design 5.2): from 0 at the nut to 1 at the
   * end of the fingerboard. The paw slides from the place of the rest to this place, then to the
   * place of the note. Its point on the neck moves on a straight line from its place at the rest to
   * its place at the play, with the move of {@link BowedHold.liftReach}, and the instrument hangs
   * from it with the turn of the move ({@link BowedHold.liftTurn}). Thus the left arm keeps its
   * bend on the way, as the left hand of a player who brings the instrument up by its neck. `null`
   * moves the tail end of the instrument on that path, and the paw slides directly.
   */
  readonly liftPlace: number | null;
  /**
   * The further tilt of the left hand over the neck in the middle of the lift and of the lowering,
   * in radians (design 5.2): the hand rolls around the neck toward the side of the elbow, by `4 ×
   * weight × (1 - weight)` times this angle, so that the wrist bends less. 0 keeps the tilt of the
   * hold.
   */
  readonly liftTiltL: number;
  /**
   * The direction to which the left elbow points in the middle of the lift and of the lowering, in
   * the axes of the chest (design 5.2). The elbow turns from the rest pole to this pole, then to
   * the playing pole. `null` mixes the rest pole and the playing pole directly.
   */
  readonly liftPoleL: Vec3 | null;
  /**
   * True when the left paw holds the instrument at the left side in the rest pose and the bow
   * hangs from the right paw, also on a seat, as for a soloist who stands (design 5.2). A body with
   * no lap, such as the rabbit, whose round belly covers its short thighs, rests so.
   */
  readonly restAtSide: boolean;
  /** The bow in the rest pose. */
  readonly restBow: {
    /** The place of the grip on the right thigh. */
    readonly lap: LapPlace;
    /** The direction from the frog to the tip. */
    readonly tip: Vec3;
    /** The side of the hair, from the stick. */
    readonly hair: Vec3;
    /**
     * The bow in the middle of the lift and of the lowering, for a bow that rests upright: the
     * tip turns through this side, and the grip moves out of the way of the body. `null` mixes
     * the rest bow and the playing bow directly (design 5.2).
     */
    readonly via: BowVia | null;
  };
  /**
   * The bow in the rest pose of a soloist who stands, and of a player who rests at the side
   * ({@link BowedHold.restAtSide}), in the model axes of the bind pose (design 5.2). `null` keeps
   * the bow in the right hand as in the bind pose.
   */
  readonly standBow: {
    /** The direction from the frog to the tip. */
    readonly tip: Vec3;
    /** The side of the hair, from the stick. */
    readonly hair: Vec3;
    /**
     * The bow in the middle of the lift and of the lowering of the standing rest
     * ({@link BowedHold.restBow}). `null` mixes the hanging bow and the playing bow directly.
     */
    readonly via: BowVia | null;
  } | null;
}

/**
 * The bow in the middle of the lift and of the lowering ({@link BowedHold}). The directions are
 * in the model axes of the bind pose.
 */
export interface BowVia {
  /** The direction from the frog to the tip. */
  readonly tip: Vec3;
  /** The side of the hair, from the stick. */
  readonly hair: Vec3;
  /** The largest move of the grip in the middle of the move, in head heights. */
  readonly reach: Vec3;
}

/** The free part of the bow hair at each end in the holds of the stage, in meters. */
const FREE_HAIR = 0.03;

/**
 * The violin and the viola share their hold under the chin. While the player plays, the right
 * elbow points out, forward, and down at the frog, and out and up at the tip. The left elbow
 * points down and forward, under the instrument and near the chest, as in the reference images.
 * Out and down, it stood 45° out from the side. Straight down, the folded arm dropped the elbow
 * into the haunch. The instrument
 * moves 0.15 H forward and 0.05 H down, so that the frog of the bow on the lowest string keeps
 * the hand off the chin and the long muzzle of the fox, and the right shoulder turns 30°, so that
 * the bow arm still reaches the tip. With the elbows of 2026-10-06, the bow arm went up to 0.48 H
 * into the torso while the players played (2026-10-07). With a move of 0.08 H to the left and the
 * elbow forward and down at the frog, the bow arm went 0.065 H into the chest at the frog on the
 * highest string.
 *
 * The string planes are 17° apart, the lower end of the 17° to 18° of a violinist in motion
 * capture (`docs/reference/string-technique.md`, section 2.2). The reference has no angle of the
 * viola, so the viola takes the angle of the violin. The stick leans 30° toward the fingerboard
 * (section 2.1). The bow plays at 1/8 of the string length from the bridge in piano and at 1/18
 * in forte, as two violinists of Askenfelt (section 2.4).
 *
 * In the rest pose, the instrument stands at 0.85 of the way to the knee, and the bow grip is
 * 0.18 H out from the knee and 0.08 H above it. The left elbow points down and a little back, so
 * that the upper arm hangs at the side. The right elbow points out and a little forward, so that
 * the forearm passes over the front of the thigh: nearer to the side, the arm went into the
 * haunch and the thigh. The bow tip points 0.3 to the front, away from the scroll.
 */
const CHIN_HOLD = {
  tip: [0, 1, 0],
  fingers: [0, 1, 0],
  tiltL: 30 * MathUtils.DEG2RAD,
  poleL: [-0.5, -1, -1],
  elbowToward: [1, 0, 0],
  elbowPerString: 5 * MathUtils.DEG2RAD,
  highElbow: 4 * MathUtils.DEG2RAD,
  highTilt: 0,
  poleR: [1, -1, -1],
  poleTipR: [0.5, 1, -1],
  polePizzicato: [1, -0.5, -1],
  followChange: 0,
  farSideR: Math.PI,
  playShift: [0, -0.05, -0.15],
  playTurn: IDENTITY,
  restPoleR: [1, -0.9, -0.5],
  restPoleL: [0, -1, 0.5],
  pizzicatoTip: [0.3, 1, 0.4],
  stringTurn: 17 * MathUtils.DEG2RAD,
  bowTilt: 30 * MathUtils.DEG2RAD,
  soundingPoint: [1 / 8, 1 / 18],
  slant: -20 * MathUtils.DEG2RAD,
  reach: 30 * MathUtils.DEG2RAD,
  reachL: 0,
  freeHair: FREE_HAIR,
  frogHair: 0,
  lean: 0,
  headDrop: 0,
  restPlace: 0.4,
  pluckPlace: 0.9,
  pluckSide: 0,
  stopEnd: 1,
  rest: {
    axis: [-0.17, 0.95, -0.26],
    top: [0, 0, -1],
    lap: { along: 0.85, offset: [0, 0.06, 0] },
  },
  liftReach: [0, 0, 0],
  liftTurn: null,
  liftPlace: null,
  liftTiltL: 0,
  liftPoleL: null,
  restAtSide: false,
  restBow: {
    lap: { along: 1, offset: [0.18, 0.08, 0] },
    tip: [-1, 0, -0.3],
    hair: [0, -1, 0.2],
    via: null,
  },
  standBow: null,
} as const satisfies BowedHold;

/**
 * The cello and the contrabass share their hold on the floor. While the player plays, the right
 * elbow points out and up, the bow tip points up and to the left in pizzicato, and the elbow turns
 * 0.3 of the way to the back of the hand in the middle of a change. The left elbow points down,
 * so that the arm hugs the instrument. Level and out, the left upper arm of the dog stood 70° out
 * from the side. In the rest pose, the left elbow points down and a little in. The instrument moves a little
 * forward and to the right, so that the bow hand at the tip of a down-bow on the lowest string
 * stays off the right thigh. With the elbow back, (0.5, 0, 1), and the bow tip up and to the
 * right in pizzicato, the bow arm went up to 0.44 H into the torso (2026-10-07).
 *
 * The string planes of the cello are 17° apart, the angle of the violin, because the reference
 * has no angle of the cello (`docs/reference/string-technique.md`, section 2.2). The contrabass
 * takes its own 25°. The stick leans 20° toward the fingerboard on the cello and 10° on the
 * contrabass, less than on the violin (section 2.1). The bow plays at 1/9 of the string length
 * from the bridge in piano and at 1/15 in forte: the mean sounding points of six cellists were
 * 1/9 and 1/12 of the string (section 2.4), and no source measures the contrabass.
 */
const FLOOR_HOLD = {
  tip: [-1, 0, 0],
  fingers: [1, 0, 0],
  tiltL: 30 * MathUtils.DEG2RAD,
  poleL: [-0.6, -1, -0.2],
  elbowToward: [0, 1, 0],
  elbowPerString: 10 * MathUtils.DEG2RAD,
  highElbow: 6 * MathUtils.DEG2RAD,
  highTilt: 0,
  poleR: [1, 1.4, -0.3],
  poleTipR: [1, 1.4, -0.3],
  polePizzicato: [1, 0, 0],
  followChange: 0.3,
  farSideR: Math.PI,
  playShift: [0, 0, -0.05],
  playTurn: IDENTITY,
  restPoleR: [1, -0.6, -0.5],
  restPoleL: [0.3, -1, 0],
  pizzicatoTip: [-1, 1, 0],
  stringTurn: 17 * MathUtils.DEG2RAD,
  bowTilt: 20 * MathUtils.DEG2RAD,
  soundingPoint: [1 / 9, 1 / 15],
  slant: -20 * MathUtils.DEG2RAD,
  reach: 30 * MathUtils.DEG2RAD,
  reachL: 0,
  freeHair: FREE_HAIR,
  frogHair: 0,
  lean: 10 * MathUtils.DEG2RAD,
  headDrop: 0,
  restPlace: 0.4,
  pluckPlace: 0.3,
  pluckSide: 0,
  stopEnd: 1,
  rest: null,
  liftReach: [0, 0, 0],
  liftTurn: null,
  liftPlace: null,
  liftTiltL: 0,
  liftPoleL: null,
  restAtSide: false,
  restBow: {
    lap: { along: 1, offset: [0.2, 0.08, 0] },
    tip: [-0.1, -0.1, -1],
    hair: [0, -1, 0.3],
    via: null,
  },
  standBow: null,
} as const satisfies BowedHold;

/**
 * Makes the play turn of a violin on the shoulder: first a turn around the vertical axis, then a
 * tilt of the scroll. The violin of the chin hold points 70° to the left of the front.
 *
 * @param yawDeg The turn around the vertical axis, in degrees. A negative turn moves the scroll
 *   from the left toward the front.
 * @param tiltDeg The tilt of the scroll up, in degrees, after the turn. A negative tilt lowers it.
 * @returns The turn, in the axes of the chest.
 */
export function violinTurn(yawDeg: number, tiltDeg: number): Quat {
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
 * The violin upright on the left thigh in the rest pose of the rabbit and the red fox: the scroll
 * up and a little forward, the top plate to the front, as the seated violinist of the image of the
 * user (2026-10-16-bow-rest decisions).
 */
const LAP_VIOLIN = { axis: [0, 1, -0.15], top: CHIN_HOLD.rest.top } as const;

/**
 * The upright bow at the right side in the rest pose of the rabbit and the red fox, as the seated
 * violinist of the image of the user (2026-10-16-bow-rest decisions): the tip up and a little out,
 * the hair to the front. In the lift and the lowering, the tip turns through the front, and the grip
 * moves 0.4 H to the front (`BowVia`): with a direct mix, the tip turned through the head, and the
 * bow went up to 14.8 cm into the body of the red fox while the arms lowered.
 */
const UPRIGHT_BOW = {
  tip: [0.1, 1, 0],
  hair: [0, 0, -1],
  via: { tip: [-0.3, 0.3, -1], hair: [0, -1, 0], reach: [0, 0, -0.4] },
} as const satisfies { readonly tip: Vec3; readonly hair: Vec3; readonly via: BowVia };

/**
 * The bow of the standing rest of a soloist who hangs it from the right paw with the tip down, a
 * little forward and out (design 5.2, {@link BowedHold.standBow}). With the bow of the bind pose
 * of the hand, the long forearms of the cat, the rabbit, and the red fox held the bow up in front
 * of the face. In the lift and the lowering, the tip turns through the front, as the tip of the
 * upright bow, and the grip moves 0.3 H out and 0.6 H to the front (2026-10-17-cat-bow
 * decisions): with a direct mix of the hanging bow and the playing bow, the bow went 4.1 cm (cat),
 * 3.9 cm (rabbit), and 3.3 cm (red fox) into the arms (`pnpm pose-depth <role> --soloist`).
 */
const HANGING_BOW = {
  tip: [0.15, -1, -0.3],
  hair: [0, 0, 1],
  via: { ...UPRIGHT_BOW.via, reach: [0.3, 0, -0.6] },
} as const satisfies NonNullable<BowedHold['standBow']>;

/**
 * The hold of the violin on the left shoulder, for the rabbit (design 4.6, 5.3), as a real
 * violinist holds it (violinonline.com, "How to hold the violin", and Simon Fischer, "Basics:
 * Holding the violin", 2026-10-14-fox-rabbit-form decisions): the tail end on the left
 * collarbone against the left side of the neck, under the jaw, the jaw on the violin, the violin
 * about 38° to the left of the front, and the scroll a little up, so that the strings are about
 * level. The violin is 0.83 of the app violin, so that the arms of the A-pose mesh stretch only a
 * little (`violinScale`, 2026-10-23-rabbit-arms decisions). The short arms of 2026-10-24 reach it
 * nearly straight, as the user asked: the scroll points 60° to the left of the front, so that it
 * comes nearer to the left shoulder, and the left paw reaches the fingerboard from 0.06 of its
 * length (0.24 at 45°). The violin sits 0.12 H below the tail end of the chin hold, and the head
 * turns 12° down while the rabbit plays (`headDrop`), so that the jaw lies on the chin rest, as a
 * violinist rests the jaw on it (`docs/reference/string-technique.md`, section 1.10). With the
 * violin 0.08 H lower, 0.015 H further forward, and the head level, the jaw stayed 1.7 cm above the
 * violin (manager review of 2026-10-24, 2026-10-24-violin-review decisions), and with the violin
 * 0.15 H higher than then and the head level, it sat at the mouth (2026-10-24-rabbit-hold
 * decisions). With the shorter arms
 * of 2026-10-14, it sits 0.039 H further back, so that the left paw reaches the nut: at the old
 * place, the paw reached the fingerboard from 0.06 of its length. A turn of the scroll further to
 * the left also reached the nut, but folded the skin of the left arm in 76% to 100% of the play
 * samples (2026-10-14-arms-rest decisions). The back stays straight. The bow lies nearly square
 * across the strings. The right arm has the shoulder turn of the chin hold. At the frog, the right
 * elbow points out and forward, and only a little down, (1.8, -0.3, -1), and the bow keeps 0.06 m
 * of free hair at each end. The user chose the elbow (1.8, -0.7, -1) of the red fox on 2026-10-21
 * ("the rabbit and pig's arms are still very deformed"): with the elbow (1.5, -1.5, -1), the
 * broad side of the long upper arm faced the front as a flat plank, and with this elbow the upper
 * arm reads across the body. With the A-pose mesh, 9 faces of the right arm folded at that elbow
 * in the arm gate (limit 8), and 7 at this elbow (2026-10-23-rabbit-arms decisions). The bow paw goes 2.4 cm into the violin in the worst play sample
 * (2.1 cm before, `docs/research/2026-10-21-arm-form.md`). The right elbow points down at the tip too: up, as in the chin
 * hold, the skin of the studio rabbit folded at the right upper arm (`pnpm fold-probe violinist`).
 * The left elbow points out, down, and a little forward, (-1, -1.4, -0.3), further out than the
 * pole of the chin hold: with that pole, the left paw went 2.3 cm into the violin and the play
 * folded in 3.8% of the samples, and with the pole (-1, -1, -0.5) 2.0 cm and 0.3%
 * (2026-10-14-fox-rabbit-fix decisions). With the A-pose mesh, that pole flattened the left upper
 * arm in the lift just below the limit 0.55 of the arm gate, and this lower pole keeps it at the
 * limit (2026-10-23-rabbit-arms decisions). A
 * pole further in put the elbow under the violin, and turned over faces of the left upper arm of
 * the rabbit mesh in each play sample (2026-10-13-mesh-rabbit decisions).
 *
 * The string planes of the rabbit are 10° apart, below the 17° of the chin hold. A larger turn
 * folds the skin of the right arm and puts the bow paw into the violin at the frog on the E string:
 * the play folded in 2.5% of the samples at 10°, 3.9% at 11°, and 11.1% at 17° (1.7% on `main`),
 * and the paw went 1.7 cm into the violin at 10° and 2.0 cm at 11° (1.4 cm on `main`,
 * 2026-10-17-bow-arm decisions).
 *
 * The rest pose and the lift are those of the red fox (user, 2026-10-24: "the violinists like
 * rabbit and cat should use similar poses and motion as the fox"): the violin stands upright on
 * the top of the left knee, at the knee joint, 0.1 H out and 0.05 H down, with the top plate to
 * the front. On the belly at 0.85 of the way, of 2026-10-24, the scroll came up to the chin, the
 * paw held the neck at the mouth, and the violin went 4.8 cm into the belly. The left paw holds
 * the upper neck, at 0.1 of the fingerboard from the nut (`restPlace`), so that the elbow bends to
 * about 120°: at 0.4, the short arm hung straight to the violin (2026-10-24-violin-poses
 * decisions). The left elbow points down, a little out, and a little back, (-0.6, -1, 0.3)
 * (2026-10-17-rabbit-pose decisions).
 *
 * In the lift and the lowering, the left paw carries the violin at the end of the fingerboard
 * (`liftPlace`): the paw moves on a line from its rest place to its playing place, and 0.1 H in,
 * 0.1 H up, and 0.08 H to the front in the middle (`liftReach`). The violin hangs from the paw and
 * turns upright in the middle, with the scroll up, a little forward, and a little to the left, and
 * the top plate to the body (`liftTurn`). Thus the left elbow bends to 137° at most: with the tail
 * end on the path, the paw went 1.09 H to the front, and the elbow straightened to 180°. With no
 * move to the front, the violin went 3.2 cm into the belly in a lowering. The paw rolls 45° further
 * over the neck (`liftTiltL`), and the elbow points down and to the front (`liftPoleL`): with
 * neither, the paw swung 94° from the line of the forearm (62° now, 2026-10-24-violin-poses
 * decisions). With a direct turn, the paw twist on the forearm went through 180° and the twist bone
 * jumped, as on the red fox, and with the top of the rest of 2026-10-24, the wrist bent past 90°
 * from the knee. The bow tip turns through the front, with the hair to the back, and the grip moves
 * 0.2 H up and 0.4 H to the front: with the via of `UPRIGHT_BOW`, the right paw turned 5,188°/s in
 * a lowering (2026-10-24-violin-rest decisions). With 0.2 H to the front, the right forearm went
 * 2.2 cm into the body in a lowering, with no move up, the right elbow opened to 163° (147° now),
 * and with 0.05 H out, the right paw twisted 145° on its forearm in a lowering (142° on `main`,
 * 2026-10-24-violin-poses decisions). With 0.3 H to the front and the violin at the jaw, the right
 * paw twisted 147° in a lowering (145° now, 2026-10-24-violin-review decisions).
 *
 * The right elbow hangs near the side, as the elbows of the violinist (2026-10-16-rabbit-arm
 * decisions). The belly is widest below the elbow, so the right arm hangs out around it, and the
 * paw does not reach the top of the right thigh. The grip is above the outer side of the right
 * knee, 0.4 H out from the top of the knee, 0.8 H above it, and 0.2 H forward, so that the right
 * elbow bends to about 130° beside the body, and the elbow points down and back. With the grip
 * 0.65 H out and 0.45 H above the knee, of 2026-10-23, the right arm hung straight down the side
 * to the paw, and 2 faces of the right arm folded at rest (7 now, limit 8 of the arm gate,
 * 2026-10-24-violin-poses decisions). With the stick through the middle of the paw of
 * 2026-10-17, the grip 0.55 H out and 0.45 H above the knee turned face 372 of the right upper arm
 * over in each rest sample (2026-10-17-grip-all decisions). With the grip on the belly over the
 * right thigh, the paw was 25 cm from the shoulder joint, so the bent arm put the elbow 19 cm out
 * from the side, the upper arm turned 81° from the vertical, and 20 faces of the right arm turned
 * over. Each grip nearer to the thigh put the forearm into the belly or turned more faces over.
 */
const SHOULDER_HOLD = {
  ...CHIN_HOLD,
  poleL: [-1, -1.4, -0.3],
  playShift: [-0.054, -0.12, 0.165],
  playTurn: violinTurn(-10, 5),
  poleR: [1.8, -0.3, -1],
  freeHair: 0.06,
  poleTipR: CHIN_HOLD.poleR,
  lean: 0,
  headDrop: 12 * MathUtils.DEG2RAD,
  slant: -5 * MathUtils.DEG2RAD,
  stringTurn: 10 * MathUtils.DEG2RAD,
  restPoleL: [-0.6, -1, 0.3],
  restPoleR: [0.3, -1, 1],
  restPlace: 0.1,
  rest: { ...LAP_VIOLIN, lap: { along: 1, offset: [-0.1, -0.05, 0] } },
  liftReach: [-0.1, 0.1, -0.08],
  liftTurn: { axis: [-0.3, 1, -0.6], top: [0, 0, 1] },
  liftPlace: 1,
  liftTiltL: 45 * MathUtils.DEG2RAD,
  liftPoleL: [0, -1, -0.5],
  restBow: {
    lap: { along: 1, offset: [0.4, 0.8, -0.2] },
    tip: UPRIGHT_BOW.tip,
    hair: UPRIGHT_BOW.hair,
    via: { tip: [-0.3, 0.3, -1], hair: [0, 0, 1], reach: [0, 0.2, -0.4] },
  },
  standBow: HANGING_BOW,
} as const satisfies BowedHold;

/**
 * The hold of the violin on the left shoulder, for the red fox (design 4.6, 5.3): the hold of the
 * rabbit, with the tail end against the left side of the short neck of the fox, under its long
 * jaw, 0.087 H further back and 0.035 H higher than on the collarbone of 2026-10-14, where the
 * violin kept 2.4 cm from the neck (2026-10-14-neck-violin decisions). With the shorter arms of
 * 2026-10-14, the violin sits 0.07 H further back and 0.016 H further left, so that the left paw
 * reaches the nut: at the old place, the paw reached the fingerboard from 0.09 of its length.
 * Straight back by 0.06 H, the violin went 1.3 cm into the neck, and with the place of the arms
 * round 1.1 cm (`violin-probe.txt` of the research folder of the decisions). It sits 0.01 H
 * higher, and goes 1.0 cm into the trunk and the neck (2026-10-14-fox-rabbit-fix decisions). The
 * head stays level (`headDrop` 0), because the long jaw already lies on the violin. The
 * shorter neck of 2026-10-17 moves the head and the violin 1.7 cm down, and the violin went 2.4 cm
 * into the body in the play (1.7 cm before), so it sits 0.01 H higher again (2026-10-17-fox-form
 * decisions). The
 * left elbow keeps the pole of the chin hold. A turn of the scroll further
 * to the left also reached the nut, but folded the skin of the right shoulder in 25% to 64% of the
 * play samples (2026-10-14-arms-rest decisions). The bow slants 12° and the right shoulder turns
 * 15°, and the right elbow at the tip points less down: with the bow of the rabbit (5°, 30°), the
 * skin of the right shoulder of the fox mesh folded in 18% of the play samples
 * (`pnpm fold-probe fox-violinist`), and with the full violin, the turn of 15° folds fewer samples
 * than 25°. At the frog, the right elbow points out, forward, and a little down,
 * (1.8, -0.7, -1), and the bow keeps 0.12 m of free hair at each end: with 0.08 m and the violin
 * further back, the bow paw went 3.7 cm into the body at the frog, with 0.1 m and the elbow
 * (1.4, -0.7, -1) 3.0 cm, and with this hold 2.4 cm, with the same share of folded play samples
 * (2026-10-14-fox-rabbit-fix decisions). The bow paw reaches 0.265 m of the hair, more than half.
 * In pizzicato, the bow tip points up, back, and a little out, (0.3, 0.5, 1): with the tip of the
 * chin hold, (0.3, 1, 0.4), the bent wrist of the plucking paw moved the middle of the paw 2.1 cm
 * from the stick, and with this tip 1.2 cm (2026-10-17-grip-all decisions).
 *
 * The rest pose is the upright rest of the rabbit (2026-10-16-bow-rest decisions): the violin
 * stands on the left thigh at 0.8 of the way to the knee, 0.18 H down and 0.2 H forward. With the
 * thighs 25° down of 2026-10-17, the place of 2026-10-16 (0.65 of the way, 0.24 H down, and 0.3 H
 * forward) put the lower end 13.8 cm above the thigh (2026-10-17-fox-form decisions). The left
 * paw holds the violin at 0.4 of the fingerboard (`restPlace` of the chin hold), with the elbow
 * bent to about 110°. The long right arm of the fox reaches the right thigh only nearly straight,
 * and its line from the shoulder to a paw on the top of the thigh passes through the side of the
 * belly: with the grip 0.15 H out at 0.65 of the way, the right upper arm went 6.2 cm into the
 * body. So the grip is at
 * the outer side of the thigh at 0.55 of the way, 0.15 H forward. The stick through the paw of
 * 2026-10-17 moves the hand about 4 cm on the bow, and with the grip 0.3 H out, the right upper arm
 * went 3.9 cm into the body at rest and 5.0 cm while the arms lowered (3.4 cm and 3.7 cm before).
 * The grip is 0.5 H out, and in the middle of the lift and of the lowering it moves 0.2 H out,
 * 0.2 H up, and 0.4 H to the front (the via of `UPRIGHT_BOW` with its own reach): the upper arm
 * goes 3.3 cm into the body in each set (`pnpm hold-fit fox-violinist --base main --sets
 * lift,rest,lower`, 2026-10-17-grip-all decisions). The right elbow points down and a little out
 * and back, and the left elbow down and a little back. In the lift and the lowering, the tail end
 * of the violin moves on its path (`liftPlace` null): the long left arm of the fox reaches the neck
 * there with the elbow bent to 99° to 127° (2026-10-24-violin-poses decisions).
 *
 * The left elbow turns toward the body by 2° for each lower string of the finger: with the 5° of
 * the chin hold, the left forearm went 2.4 cm into the violin in the middle of the lift and of the
 * lowering (1.6 cm and 1.9 cm on `main`), and with 2° 1.9 cm and 2.1 cm (2026-10-17-left-hand
 * decisions).
 *
 * The string planes of the red fox stay 9° apart, and the stick leans 15°. A larger turn or tilt
 * folds the skin of the right arm of the fox mesh: the play folded in 21.7% of the samples at 17°
 * and 30°, 7.0% at 9° and 30°, 6.1% at 9° and 15°, and 6.0% at 10° and no tilt (5.4% on `main`,
 * 2026-10-17-bow-arm decisions).
 */
const FOX_HOLD = {
  ...SHOULDER_HOLD,
  poleL: CHIN_HOLD.poleL,
  elbowPerString: 2 * MathUtils.DEG2RAD,
  poleR: [1.8, -0.7, -1],
  playShift: [-0.07, 0.05, 0.25],
  headDrop: 0,
  slant: -12 * MathUtils.DEG2RAD,
  stringTurn: 9 * MathUtils.DEG2RAD,
  bowTilt: 15 * MathUtils.DEG2RAD,
  reach: 15 * MathUtils.DEG2RAD,
  poleTipR: [1, -0.85, -1],
  freeHair: 0.12,
  pizzicatoTip: [0.3, 0.5, 1],
  restPoleL: [-0.3, -1, 0.3],
  restPoleR: [0.3, -1, 0.3],
  restPlace: CHIN_HOLD.restPlace,
  rest: { ...LAP_VIOLIN, lap: { along: 0.8, offset: [0, -0.18, -0.2] } },
  liftReach: [0, 0, 0],
  liftTurn: null,
  liftPlace: null,
  liftTiltL: 0,
  liftPoleL: null,
  restBow: {
    lap: { along: 0.55, offset: [0.5, -0.1, -0.15] },
    tip: UPRIGHT_BOW.tip,
    hair: UPRIGHT_BOW.hair,
    via: { ...UPRIGHT_BOW.via, reach: [0.2, 0.2, -0.4] },
  },
} as const satisfies BowedHold;

/** The holds of the bowed strings. */
export const BOWED_HOLDS = {
  violin: CHIN_HOLD,
  // The left arm reaches the nut of the viola only with a smaller forward move.
  viola: { ...CHIN_HOLD, reach: 30 * MathUtils.DEG2RAD, playShift: [0, -0.05, -0.04] },
  // The chair of the dog fits the low seats of 2026-10-11, so the cello stands higher at its body.
  // The cellist leans 8° (10° before), and its right shoulder turns 45° (40° before): with the old
  // values, its head came 0.026 m to the neck (limit 0.03 m), and the bow stick went 6.0 mm into
  // the right forearm (limit 1 mm).
  cello: { ...FLOOR_HOLD, reach: 45 * MathUtils.DEG2RAD, lean: 8 * MathUtils.DEG2RAD },
  // The base of the hold of the hippo (HIPPO_HOLD), which moves and turns the contrabass to its
  // body. The real string planes are 25° apart, and the stick leans 10°.
  contrabass: {
    ...FLOOR_HOLD,
    stringTurn: 25 * MathUtils.DEG2RAD,
    bowTilt: 10 * MathUtils.DEG2RAD,
    lean: 5 * MathUtils.DEG2RAD,
    poleR: [0.5, 1, 0.5],
    poleTipR: [0.5, 1, 0.5],
    playShift: [0, 0, 0],
  },
} as const satisfies Readonly<Record<BowedInstrument, BowedHold>>;

/**
 * The hold of the viola under the chin, for the cat mesh (design 4.6, 5.3): the viola hold of
 * {@link BOWED_HOLDS}, with the viola 0.05 H further right and 0.21 H further back, toward the
 * neck, so that the left paw reaches the nut, as the user asked for the arms of the reach of the
 * red fox (2026-10-16-mesh-cat decisions). At the place of the viola hold, the paw reached the
 * fingerboard from 0.29 of its length (`pnpm hold-reach cat --instrument viola`).
 *
 * The deeper chest of the cat form of 2026-10-17 (2026-10-16-cat-form decisions) took the room of
 * the left elbow: with the left elbow pole of the chin hold, the left upper arm went 5.5 cm into
 * the body in the play. The left elbow points out as far as down, and less forward. The stick of
 * the bow passes through the middle of the paw since 2026-10-17 (`SpeciesParams.bowGrip`), and the
 * hand sits about 4 cm further out on the bow, so the right elbow of the play points a little
 * further out than the elbow of the chin hold. Since the rebuilt arms of 2026-10-25, the right
 * elbow of the play points out, forward, and less down, (1.2, -0.5, -1), as the elbow of a real
 * violist at the frog: the back of the rebuilt upper arm lies against the trunk in the bind, and
 * with (1.1, -1, -1) of 2026-10-17 it went 3.8 cm into the body (1.3 cm now, 2026-10-25-cat-arms
 * decisions). At the tip, the right elbow points down, out, and forward, (1, -1, -1), as the elbow
 * of the rabbit: with the elbow up of the chin hold, (0.5, 1, -1), a dark wedge fold opened under
 * the right armpit at the tip (manager review of 2026-10-24), the right paw turned 116° on its
 * forearm (90° now), and the narrowest ring of the right arm kept 0.14 of its axis (0.49 now,
 * 2026-10-24-violin-review decisions).
 *
 * The rest pose is the upright rest of the rabbit and the red fox, as the seated violinist of the
 * image of the user (2026-10-17-cat-bow and 2026-10-17-cat-look decisions): the viola stands
 * upright on the front of the left knee, 0.95 of the way from the hip and 0.15 H forward (at 0.7
 * of the way, of 2026-10-17, it stood beside the hip and went 7.4 cm into the belly, and the user
 * asked for the rest of the fox, 2026-10-24-violin-rest decisions), and the bow stands upright at
 * the right side, with the frog in the right paw. Both elbows hang near the sides. The left paw
 * holds the viola at the top of the upper bout, at 0.4 of the fingerboard from the nut
 * (`restPlace`): with 0.3 H forward and 0.5, the paw swung 98° on the wrist, with 0.25 H forward
 * and the top plate back and to the left 91°, with 8 folded faces of the left arm, and now 26°, with
 * 2 folded faces (limit 8, 2026-10-24-violin-poses and 2026-10-24-violin-review decisions). The left
 * elbow points down, a little out, and a little back: the elbow is 6.5 cm out from the side
 * (11.6 cm with the elbow (-1, -1, 0.5) of 2026-10-16). With the elbow further in, (-0.5, -1, 0.3),
 * it was 5.0 cm out, and the left upper arm went 1.9 cm into the body. A place further down the
 * upper bout put the left forearm 2.4 cm to 2.8 cm into the viola. The grip of the bow is 0.6 H
 * out, 0.3 H down, and 0.1 H back at 0.5 of the way to the knee, and the right elbow points down,
 * out, and a little back, (0.8, -1, 0.2), so the forearm comes forward to the paw over the outer
 * side of the thigh, as the forearm of a seated violinist. With the elbow of 2026-10-17,
 * (0.3, -1, 1), 2.4 cm behind the back, the rebuilt right upper arm went 2.7 cm into the back, and
 * its skin rolled 64° on the gate (limit 55, 2026-10-25-cat-arms decisions). The arm of the cat, with
 * the reach of the red fox, reaches the top of the thigh only nearly straight, so the paw stays
 * above the thigh: with the grip of 2026-10-17 (0.87 H out), the arm hung straight, down and out to
 * the side, with the paw far from the body, and the user said that the pose looked weird. A grip on
 * the top of the thigh put the right forearm 4.0 cm to 8.2 cm into the deep belly, and a grip 0.7 H
 * out at 0.55 of the way to the knee bent the elbow to 143° only, with the forearm out to the side.
 * The level bow of 2026-10-16 ran forward past the knees, and a real violist rests as a violinist.
 *
 * In the lift and the lowering, the left paw carries the viola at the end of the fingerboard
 * (`liftPlace`), as on the rabbit, and the paw moves 0.25 H up and 0.2 H to the front in the
 * middle (`liftReach`): with the rebuilt arms of 2026-10-25 and 0.2 H up and 0.1 H to the front,
 * the left paw swung 71° on the wrist (limit 70), and with 0.2 H up, the left wrist turned
 * 1,011°/s at most, 499°/s more than on `main` (2026-10-25-cat-arms decisions). In the middle, the viola turns upright, with the scroll up, a little forward, and
 * a little to the left, and the top plate to the body, as the violin of the rabbit (`liftTurn`), so
 * that the paw twist on the forearm goes from the rest through 0° to the play. Thus the left elbow
 * bends to 148° at most: with the tail end on the path, the paw went 1.28 H to the front, and the
 * elbow straightened to 180°. The paw rolls 45° further over the neck (`liftTiltL`): with no roll,
 * the left paw went 2.8 cm into the viola (1.4 cm now, 2026-10-24-violin-poses decisions). In the
 * middle, the bow points up, forward, and a little to the left, with the hair down, and the grip
 * moves 0.45 H out, 0.4 H up, and 0.4 H to the front, so that the bow rises beside the viola: with
 * the via of `UPRIGHT_BOW` (the tip forward, the grip 0.3 H out and 0.1 H up), the bow lay across
 * the belly and went 1.3 cm into the viola and 2.7 cm into the arms (manager review of 2026-10-24,
 * 2026-10-24-violin-review decisions). With a direct turn from the rest on the knee, the viola lay
 * flat far in front, and the cat held both arms out straight (user, 2026-10-24: "fix the arm
 * transition for how the cat raises and lowers the violin", 2026-10-24-violin-rest decisions). With
 * a move of 0.4 H up, the left paw rose to the top of the head (3.3 H above the root, 2.8 H now).
 * With the grip 0.5 H to the front, the right paw twisted 137° on its forearm in a lift
 * (2026-10-24-violin-poses decisions).
 *
 * A cat soloist who stands hangs the bow from the right paw with the tip down, a little forward and
 * out, and turns it through the front in the lift and the lowering (`HANGING_BOW`).
 *
 * The string planes of the cat are 11° apart, below the 17° of the chin hold: with the stick
 * leaned 30°, the bow arm reaches the full hair up to 11° (0.030 m to 0.475 m in the steps of the
 * search), and at 12° only to 0.470 m (2026-10-17-bow-arm decisions).
 *
 * The left elbow turns toward the body by 2° for each lower string of the finger: with the 5° of
 * the chin hold, the left upper arm went 1.5 cm into the deep chest in the play (0.3 cm on `main`),
 * and with 2° 0.0 cm (2026-10-17-left-hand decisions).
 *
 * From the second position to the fifth position, the left paw tilts 20° further over the neck, so
 * that the wrist comes up toward the upper bout (`highTilt`, `leftTilt()` of `pose/bowed.ts`). The
 * viola sits back toward the neck, so the left forearm runs from the wrist back under the viola,
 * and with no tilt it went 2.7 cm into the upper bout near the wrist in the fifth position at the
 * end of `mozart-k191`, also while the arms lowered. A turn of the left elbow did not change it,
 * because the forearm leaves the wrist toward the shoulder. With 45°, the forearm went 0.4 cm into
 * the viola, but the paw lay flat across the fingerboard, and the wrist bent 75°: a broken wrist.
 * With 20°, the fingers still point down to the strings, and the wrist bends 48° (30° on `main`).
 * The rest of the depth of the forearm at the upper bout is accepted until the user decides
 * (2026-10-17-cat-hand decisions).
 *
 * The left paw tilts 45° over the neck (`tiltL`, 30° in the chin hold), so that it curls around
 * the neck and the fingers come down on the strings from above, as a real violist holds the neck
 * (`docs/reference/string-technique.md`, section 1.9). With 30°, the paw turned 157° on its
 * forearm from the bind, and the skin of the wrist under the neck pinched into a twisted band of
 * thin faces: the wrist ring kept 0.58 of its narrow axis in the bind. With 45°, the paw turns 147°,
 * the wrist ring keeps 0.66, the left forearm goes 1.5 cm into the viola in the play (2.5 cm with
 * 30°), and the wrist bends 30° from the line of the forearm (15° with 30°). With 40°, the wrist
 * kept a crease, and with 50°, the wrist bent 34°. In the fifth position, the paw tilts 65° with
 * `highTilt` (2026-10-20-cat-left-arm decisions).
 *
 * In the rest pose, the top plate of the viola faces the front and 30° to the left, toward the
 * audience, as the bridge of a resting violin faces out (`docs/reference/string-technique.md`,
 * section 2.9, user, 2026-10-24: "why in the rest mode, the cat's viola's back is facing the
 * audience"). The left paw on the neck turns -81° on its forearm at rest, and the middle turn of
 * the lift (`liftTurn`) takes it through 0° to the play. With the top to the front, or 15° to the
 * left, the right paw turned up to 7,437°/s in a lowering with each middle turn that was tried,
 * because the mix of the bow changed its side in the middle (2026-10-24-violin-review decisions).
 * Up to 2026-10-24, the top faced back and to the left, because with the top to the front and no
 * middle turn, the lift turned the left paw through 180° and wrung the forearm (user, 2026-10-23:
 * "the cat's ... arm is very twisted when transitioned from rest to play", 2026-10-23-night-fixes
 * decisions).
 */
const CAT_HOLD = {
  ...BOWED_HOLDS.viola,
  stringTurn: 11 * MathUtils.DEG2RAD,
  playShift: [0.05, -0.05, 0.17],
  tiltL: 45 * MathUtils.DEG2RAD,
  poleL: [-1, -1, -0.75],
  elbowPerString: 2 * MathUtils.DEG2RAD,
  highTilt: 20 * MathUtils.DEG2RAD,
  poleR: [1.2, -0.5, -1],
  poleTipR: [1, -1, -1],
  restPoleR: [0.8, -1, 0.2],
  restPoleL: [-0.6, -1, 0.3],
  restPlace: 0.4,
  rest: {
    axis: LAP_VIOLIN.axis,
    top: [-0.5, 0, -0.87],
    lap: { along: 0.95, offset: [0, 0, -0.15] },
  },
  liftReach: [0, 0.25, -0.2],
  liftTurn: { axis: [-0.3, 1, -0.6], top: [0, 0, 1] },
  liftPlace: 1,
  liftTiltL: 45 * MathUtils.DEG2RAD,
  restBow: {
    lap: { along: 0.5, offset: [0.6, -0.3, 0.1] },
    tip: UPRIGHT_BOW.tip,
    hair: UPRIGHT_BOW.hair,
    via: { tip: [-0.2, 1, -1], hair: [0, -1, 0], reach: [0.45, 0.4, -0.4] },
  },
  standBow: HANGING_BOW,
} as const satisfies BowedHold;

/**
 * The hold of the cello between the knees, for the dog mesh (design 4.6, 5.3), as a real cellist
 * holds it (`docs/reference/string-technique.md`, section 2.7): the cello leans back 25° from the
 * vertical, as the user chose, with the back of the upper bout at the chest, the neck at the left
 * of the head, and the endpin on the floor 0.06 m right of the middle and 0.66 m in front of the
 * floor point of the seat. It leans 14° to the left, and its top plate turns 6° to the right. It
 * keeps this place in the rest pose (`BowedHold.rest` null). The short thighs end far behind the
 * lower bout, so the knees do not touch the cello. The reasons of the values are in the
 * 2026-10-17-mesh-dog, 2026-10-17-dog-arms, and 2026-10-17-dog-rest decisions.
 *
 * The left paw tilts 55° over the neck (`tiltL`), and the left elbow points out to the left and
 * nearly level, because the leaned neck comes near the left shoulder, and turns up 2° for each
 * lower string. The right shoulder turns 30°.
 *
 * The short arms of 2026-10-17 reach the strings only nearly straight. The trunk leans 3° forward,
 * so that the shoulders come nearer to the strings, and the right elbow points out and down, near
 * the body. The bow plays no hair within 0.12 m of the frog (`frogHair`), and the string planes
 * are 6° apart, because the paw at the frog and on the C string went into the right rim of the
 * cello. In pizzicato, the right paw comes up from the side, as a real player plucks with the hand
 * hanging from the wrist and the thumb near the edge of the fingerboard
 * (`docs/reference/string-technique.md`, section 2.8): it plucks 0.2 of the way from the end of the
 * fingerboard to the bow contact, 0.15 m right of the strings (`pluckSide`), with the elbow out and
 * down (`polePizzicato`). Over the fingerboard (`pluckPlace` -0.3), the paw lay flat across the
 * strings, the right upper arm turned 101° and went 5.2 cm into the body, and the front of the
 * right shoulder folded in 87% of the pizzicato samples. Now it turns 79° and goes 2.2 cm in, and
 * 20% fold (user, 2026-10-23: "the dog's right arm and palm during pizzicato is weird",
 * 2026-10-23-night-fixes decisions).
 *
 * In the rest pose, the right paw holds the bow over the right knee, 0.25 H out and 0.5 H above
 * the top of the thigh at 0.9 of the way to the knee, with the tip up and leaned out and forward,
 * away from the cello, and the right elbow points out, down, and back. The short arm then bends
 * softly at the elbow, and the wrist bends 22° with the palm toward the body. The left paw holds
 * the cello at 0.6 of the fingerboard with the elbow down and out, near the side. In the lift and
 * the lowering, the bow turns through the front, and the grip moves 0.3 H out, away from the
 * cello (2026-10-17-dog-rest decisions).
 */
const DOG_HOLD = {
  ...BOWED_HOLDS.cello,
  lean: 3 * MathUtils.DEG2RAD,
  reach: 30 * MathUtils.DEG2RAD,
  stringTurn: 6 * MathUtils.DEG2RAD,
  frogHair: 0.12,
  playShift: [-0.076, 0, -0.34],
  playTurn: [-0.0371, 0.1049, -0.0435, 0.9928],
  tiltL: 55 * MathUtils.DEG2RAD,
  poleL: [-1, -0.15, 0],
  elbowPerString: 2 * MathUtils.DEG2RAD,
  poleR: [1, -1.2, -0.3],
  poleTipR: [1, -0.5, -0.5],
  pluckPlace: 0.2,
  pluckSide: 0.15,
  polePizzicato: [1, -1, -0.3],
  restPlace: 0.6,
  restPoleL: [-0.5, -1, 0],
  restPoleR: [0.6, -1, 0.75],
  restBow: {
    lap: { along: 0.9, offset: [0.25, 0.5, 0] },
    tip: [0.6, 1, -0.6],
    hair: UPRIGHT_BOW.hair,
    via: { ...UPRIGHT_BOW.via, reach: [0.3, 0, -0.4] },
  },
} as const satisfies BowedHold;

/**
 * The hold of the contrabass of the hippo mesh, which stands (design 4.6, 5.3). A real bassist
 * leans the contrabass on the body, and the contrabass does not go in
 * (`docs/reference/string-technique.md`, section 2.8). The round belly of the hippo reaches 0.35 m
 * in front of its shoulder joints, the back of its smaller contrabass (`bassScale`) lies 0.26 m
 * behind the strings, and its arms are only 0.51 m long. Thus the back of the contrabass touches the
 * front of the belly, and the arms reach the strings with the help of the shoulders. The end pin of
 * 0.2 m (`BASS_END_PIN`) stands on the floor 0.48 m right of the place of `UPRIGHT_HOLDS` and 8 cm
 * forward (`playShift`), and the contrabass turns around it (`playTurn`): it leans 33° from the
 * vertical, to the left and 6° back, and its top plate faces forward. The strings run from the
 * contact point 0.28 m in front of the belly up to the nut beside the head. With the place of
 * 2026-10-18, which leaned 5° further back and stood 11 cm further back at the contact point, the
 * back of the contrabass went 14.8 cm into the belly and the chest (the 2026-10-21-hippo-bass
 * decisions). The trunk leans 12° forward. The right shoulder turns 50° forward, and the left
 * shoulder 25° (`reachL`), also in the rest: with no left turn, the left paw reached one place of
 * the fingerboard only, and the left forearm went 3.7 cm into the neck. With a right turn of 55°,
 * the skin of the chest under the chin folded (the 2026-10-19-hippo-chest decisions).
 *
 * The string planes are 6° apart, below the 25° of a real contrabass, as on the cello of the dog:
 * with 12°, the bow arm reached 4 cm of the hair at the new place, and the right arm went 5.1 cm
 * into the contrabass. The bow plays no hair within 0.25 m of the frog (`frogHair`): the short bow
 * arm reaches the frog only straight, and then the right upper arm went 5.2 cm into the right rim
 * of the upper bout. The right elbow points forward,
 * out, and a little down, and further down at the tip: with the elbow of the
 * frog, the skin of the bow arm went flat at the tip (0.54 of its round shape in the arm gate,
 * limit 0.55). The left elbow points out
 * to the left, a little down, and forward. The user chose lower elbows with the twist bone of the
 * upper arm (the 2026-10-19-arm-skin decisions): with the level elbow, the right upper arm rolled
 * 86° on the median of the play, and the shoulder skin twisted into a flat band. With the left
 * elbow up and back, the left upper arm turned 80° (the 2026-10-19-hippo-arms decisions). The left
 * elbow turns up 2° for each lower string, as on the cello of the dog: with 10°, the thick left
 * upper arm went 7.0 cm into the contrabass (6.4 cm with 2°). The left paw tilts 55° over the neck,
 * as the paw of the dog: with the 30° of the floor hold, the left arm went 6.9 cm into the body
 * (5.6 cm with 55°).
 *
 * In pizzicato, the right paw comes up from the side, 0.18 m right of the strings (`pluckSide`),
 * as a real bassist rests the thumb on the edge of the fingerboard
 * (`docs/reference/string-technique.md`, section 2.8). The right shoulder lies 0.16 m behind the
 * back of the contrabass, so the arm reaches the strings nearly straight: with the palm above the
 * strings, the arm went through the right rim of the upper bout, 7.7 cm deep. The elbow points out
 * to the right, a little up, and forward, and the bow tip points up, left, and forward: with the
 * elbow out and level, the forearm went 1.7 cm into the rim in 3% of the samples of
 * `boulanger-matin`, and with the elbow of the bow, the paw twisted 153° in the lowering after a
 * pizzicato (110° before, the arm gate).
 *
 * The left paw stops the strings only up to 0.7 of the fingerboard from the nut (`stopEnd`): the
 * left shoulder lies behind the upper bout, so a paw over the bout put the thick left forearm
 * 7.0 cm into it, and with 0.73 already 2.4 cm. A real bassist raises the elbow so that the wrist
 * comes over the shoulder of the instrument, but the short arm of the hippo does not reach so far.
 *
 * The right elbow lies near the backward line of the stick, and on the E and the A strings it lies
 * near the far side of the stick for the roll of the hand. With the far side at 180°, a change of
 * the string turned the paw by about 200° (847 jumps above 90° in 0.25 s over the demos). The far
 * side lies at 30°, in the middle of the angles that no elbow of the play takes (-40° to 110°), so
 * the roll stays at one end of its range: 20 jumps, and the dog cellist has 25. On the low
 * strings, the paw then goes more than 1.5 cm into the belly in 4.6% of the play samples (0% with
 * 180°). The measures are in the 2026-10-18-hippo-arm decisions.
 *
 * In the rest pose, the contrabass stays at its playing place, and the left paw holds the neck
 * with the elbow out to the left and a little down: with the elbow further down, the left forearm
 * went 2.2 cm into the neck in the lift and the lowering, and with a level elbow, the left paw
 * twisted 178° on its forearm in the lowering (limit 176°). The right paw hangs beside the belly with the
 * bow tip down (`HANGING_BOW`), and the elbow points down and out, as the arms of the mesh hang: the
 * knee of the floor hold lies under the belly, and the right forearm went 13.8 cm into the body. In
 * the lift and the lowering, the tip turns through the front, as the upright bow of the violinists,
 * with the grip 0.3 H out, 0.3 H up, and 0.6 H to the front: with no move up, the bow paw turned
 * 2,959°/s at the most in the lowering (1,877°/s on 2026-10-21 before the move of the contrabass).
 */
const HIPPO_HOLD = {
  ...BOWED_HOLDS.contrabass,
  lean: 12 * MathUtils.DEG2RAD,
  reach: 50 * MathUtils.DEG2RAD,
  reachL: 25 * MathUtils.DEG2RAD,
  playShift: [0.9489, 0, -0.1588],
  playTurn: [-0.1075, 0.2477, 0.2044, 0.9409],
  stringTurn: 6 * MathUtils.DEG2RAD,
  frogHair: 0.25,
  tiltL: 55 * MathUtils.DEG2RAD,
  poleL: [-1, -0.3, -0.7],
  elbowPerString: 2 * MathUtils.DEG2RAD,
  poleR: [1.5, -0.5, -2],
  poleTipR: [1.5, -0.8, -2],
  polePizzicato: [3, 0.3, -1],
  pizzicatoTip: [-1, 1, -1],
  pluckSide: 0.18,
  stopEnd: 0.7,
  farSideR: 30 * MathUtils.DEG2RAD,
  restPoleR: [1, -1, 0],
  restPoleL: [-1, -0.3, 0],
  restBow: {
    lap: { along: 1, offset: [0.7, 1, -0.4] },
    tip: HANGING_BOW.tip,
    hair: HANGING_BOW.hair,
    via: { ...UPRIGHT_BOW.via, reach: [0.3, 0.3, -0.6] },
  },
} as const satisfies BowedHold;

/**
 * The holds of the species that hold a bowed string in their own way, in place of
 * {@link BOWED_HOLDS}: the rabbits and the red foxes hold the violin on the left shoulder, as in
 * `rabbit-views.png`, the cat holds the viola with its own hold, and the dog holds the cello
 * between its knees.
 * The tools change them in memory with `--set '<instrument>@<species>.<path>=<value>'`
 * (`tools/hold-sets.ts`).
 */
export const SPECIES_HOLDS: Partial<
  Record<SpeciesId, Partial<Record<BowedInstrument, BowedHold>>>
> = {
  rabbit: { violin: SHOULDER_HOLD },
  'fox-red': { violin: FOX_HOLD },
  cat: { viola: CAT_HOLD },
  dog: { cello: DOG_HOLD },
  hippo: { contrabass: HIPPO_HOLD },
};

/**
 * Gives the hold of a bowed string for a species: its own hold, or the hold of
 * {@link BOWED_HOLDS}.
 *
 * @param species The species of the player.
 * @param instrument The instrument.
 * @returns The hold.
 */
export function holdOf(species: SpeciesId, instrument: BowedInstrument): BowedHold {
  return SPECIES_HOLDS[species]?.[instrument] ?? BOWED_HOLDS[instrument];
}

/**
 * The rest pose of the violin and the viola of a soloist who stands (design 5.2): the left hand
 * holds the instrument at the left side, with the scroll forward and a little up, and the top plate
 * out. The bow hangs from the right hand. With the scroll up, the body of the instrument hung
 * below the hanging hand, and it went 0.05 m (violin) to 0.12 m (viola) into the floor.
 */
const STANDING_REST = { axis: [0, 0.15, -1], top: [-1, 0, 0] } as const satisfies {
  readonly axis: Vec3;
  readonly top: Vec3;
};

/** The step of the search for the reached part of the bow hair, in meters. */
const BOW_STEP = 0.005;

const BONES = {
  spine: boneIndex('spine'),
  chest: boneIndex('chest'),
  instrument: boneIndex('instrument'),
  handL: boneIndex('handL'),
  fingersL: boneIndex('fingersL'),
  handR: boneIndex('handR'),
  bow: boneIndex('bow'),
} as const;

/**
 * The points of a bowed string player in the bind pose, in the model axes, that the pose needs
 * at each frame.
 */
export interface BowedRig {
  readonly hold: BowedHold;
  /** The bind position of the `instrument` bone, and the index and bind position of its parent. */
  readonly pivot: Vec3;
  readonly parent: number;
  readonly parentBind: Vec3;
  /** The bind positions of the `spine` and the `chest` bones. */
  readonly spineBind: Vec3;
  readonly chestBind: Vec3;
  /** The point on the strings where the bow plays in the model. */
  readonly contact: Vec3;
  /** The length of the strings from the bridge to the nut. */
  readonly stringLength: number;
  /** The place of {@link BowedRig.contact} as a share of the string length from the bridge. */
  readonly contactShare: number;
  /** The unit direction from the tail end to the scroll. */
  readonly axis: Vec3;
  /** The unit normal of the top plate, to the strings. */
  readonly top: Vec3;
  /** The unit direction across the strings to the side of the bow tip. */
  readonly across: Vec3;
  /** The unit direction across the strings to which the left fingers tilt. */
  readonly fingers: Vec3;
  /** The start of the target `fingerboard`: the nut, on the strings. */
  readonly nut: Vec3;
  /** The vector of the target `fingerboard`, from the nut to the end of the fingerboard. */
  readonly neck: Vec3;
  /** The `fingersL` bone, from the `handL` bone. */
  readonly knuckles: Vec3;
  /** The middle of the left finger block, from the `fingersL` bone. */
  readonly fingerBlock: Vec3;
  /** The point on the strings above which the right hand plucks. */
  readonly pluck: Vec3;
  /** The start of the bow hair at the frog, from the `bow` bone at the grip. */
  readonly hairStart: Vec3;
  /** The `bow` bone at the grip, from the `handR` bone. */
  readonly grip: Vec3;
  /** The unit direction of the stick from the frog to the tip, in the bind pose. */
  readonly stick: Vec3;
  /** The length of the right forearm, from the elbow to the wrist. */
  readonly forearm: number;
  readonly hairLength: number;
  /** The rotation that turns the bow axes (along the hair, to the strings) to the bind pose. */
  readonly bowAlign: Quat;
  readonly armL: ArmRig;
  readonly armR: ArmRig;
  /** The rotation of the `instrument` bone in the rest pose, relative to its parent. */
  readonly restRotation: Quat;
  /** The move of the instrument while the player plays, in meters (`BowedHold.playShift`). */
  readonly playShift: Vec3;
  /** The place of the `instrument` bone in the rest pose, in the model axes. */
  readonly restPivot: Vec3;
  /**
   * The move of the instrument in the middle of the lift and of the lowering, in meters, in the
   * axes of the root (`BowedHold.liftReach`).
   */
  readonly liftReach: Vec3;
  /**
   * The rotation of the `instrument` bone in the middle of the lift and of the lowering, relative
   * to its parent (`BowedHold.liftTurn`), or `null` for a direct mix.
   */
  readonly liftRotation: Quat | null;
  /** The direction to which the right elbow points in the rest pose, in the axes of the root. */
  readonly restPoleR: Vec3;
  /** The direction to which the left elbow points in the rest pose, in the axes of the chest. */
  readonly restPoleL: Vec3;
  /** The bow in the rest pose: the place of the `bow` bone and its rotation, in the model axes. */
  readonly restBow: {
    /** The place of the `bow` bone: the grip on the stick. */
    readonly grip: Vec3;
    /** The rotation of the `bow` bone from the bind pose. */
    readonly rotation: Quat;
    /**
     * The bow in the middle of the lift and of the lowering ({@link BowVia}): the rotation of the
     * `bow` bone from the bind pose, and the move of the grip in meters, in the model axes.
     * `null` mixes the rest bow and the playing bow directly.
     */
    readonly via: { readonly rotation: Quat; readonly reach: Vec3 } | null;
  };
  /** The part of the bow hair that the bow arm reaches on all strings (design 5.3). */
  readonly bowRange: BowRange;
  /**
   * The part of the target `fingerboard` that the left arm reaches, from 0 at the nut to 1 at the
   * end (design 5.3). The places of the notes map into it.
   */
  readonly stopRange: readonly [low: number, high: number];
}

/** The points of a rig before its ranges. */
export type RigPoints = Omit<BowedRig, 'bowRange' | 'stopRange'>;

/**
 * Finds a target of an instrument.
 *
 * @param model The player model.
 * @param kind The kind of the target.
 * @returns The target.
 * @throws Error if the instrument has no target of the kind.
 */
function targetOf(model: PlayerModel, kind: PlayTargetKind): PlayTarget {
  const target = model.instrument.targets.find((t) => t.kind === kind);
  if (!target) {
    throw new Error(`The ${model.instrument.id} has no target "${kind}".`);
  }
  return target;
}

/**
 * Gives a unit vector normal to an axis, on the side of a preferred direction.
 *
 * @param v A vector normal to the axis.
 * @param prefer The preferred side.
 * @returns `v` or `-v`, as a unit vector.
 */
function toSide(v: Vector3, prefer: Vec3): Vec3 {
  const unit = v.clone().normalize();
  return toVec3(unit.dot(new Vector3(...prefer)) < 0 ? unit.negate() : unit);
}

/**
 * Makes the frames of the torso in the playing pose with no idle motion: the bind pose with the
 * lean of the hold. The reach searches of the rig and `pnpm hold-reach` use them.
 *
 * @param rig The points of the player.
 * @returns The frames.
 */
export function playingFrames(rig: RigPoints): TorsoFrames {
  const lean = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -rig.hold.lean);
  const spine = new Vector3(...rig.spineBind);
  return {
    root: { rotation: new Quaternion(), position: new Vector3() },
    chest: {
      rotation: lean,
      position: new Vector3(...rig.chestBind).sub(spine).applyQuaternion(lean).add(spine),
    },
  };
}

/**
 * Finds the part of the bow hair that the bow arm reaches on all strings in the playing pose, from
 * the frog hair of the hold (`BowedHold.frogHair`) on. A small player cannot reach the tip of a
 * long bow.
 *
 * @param rig The points of the player.
 * @returns The longest reached part of the hair, in meters from the frog end. If the arm reaches
 *   no part, the 0.04 m around the nearest place.
 */
export function bowRangeOf(rig: RigPoints): BowRange {
  const frames = playingFrames(rig);
  const { place, strings, bow: placed, hand } = createBowPlaces();
  const tilted = { grip: new Vector3(), rotation: new Quaternion() };
  stringsAt(rig, instrumentAt(rig, frames, 1, place), strings);
  const pole = new Vector3(...rig.hold.poleR).applyQuaternion(frames.chest.rotation);
  const shoulder = poseShoulder(
    rig.armR,
    frames.chest,
    rig.chestBind,
    shoulderTurn(rig, 1, new Quaternion()),
  );
  // The hand rolls so that its back points to the elbow of the hold, as in the pose.
  const wristAt = (string: number, at: number): Vector3 => {
    heldBowAt(rig, strings, string, at, 0, tilted, placed);
    const wrist = gripHand(rig, placed, 0, hand).wrist;
    const { elbow } = solveArm(rig.armR.bind, shoulder.position, shoulder.rotation, wrist, pole);
    return gripHand(rig, placed, rollToward(rig, placed, elbow), hand).wrist;
  };
  const reach = rig.armR.reach;
  const free = rig.hold.freeHair;
  const frog = Math.max(free, rig.hold.frogHair);
  const end = rig.hairLength - free + 1e-9;
  let best: [number, number] | null = null;
  let start = -1;
  let nearest = frog;
  let nearestDistance = Infinity;
  for (let bow = frog; bow <= end; bow += BOW_STEP) {
    const distance = Math.max(
      wristAt(0, bow).distanceTo(shoulder.position),
      wristAt(3, bow).distanceTo(shoulder.position),
    );
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = bow;
    }
    const reached = distance <= reach;
    if (reached && start < 0) {
      start = bow;
    }
    if (start >= 0 && (!reached || bow + BOW_STEP > end)) {
      const stop = reached ? bow : bow - BOW_STEP;
      if (!best || stop - start > best[1] - best[0]) {
        best = [start, stop];
      }
      start = -1;
    }
  }
  return best ?? [Math.max(0, nearest - 0.02), nearest + 0.02];
}

/** The step of the search for the reached part of the fingerboard. */
const STOP_STEP = 0.01;

/**
 * Finds the part of the fingerboard that the left arm reaches in the playing pose, up to the end of
 * the hold (`BowedHold.stopEnd`). The neck of a contrabass goes high above the shoulder, so a small
 * player cannot reach the nut.
 *
 * @param rig The points of the player.
 * @returns The longest reached part, from 0 at the nut to 1 at the end. If the arm reaches no
 *   place, the place nearest to the shoulder.
 */
export function stopRangeOf(rig: RigPoints): readonly [low: number, high: number] {
  const frames = playingFrames(rig);
  const { place, strings } = createBowPlaces();
  instrumentAt(rig, frames, 1, place);
  stringsAt(rig, place, strings);
  const shoulder = poseShoulder(
    rig.armL,
    frames.chest,
    rig.chestBind,
    shoulderTurnL(rig, new Quaternion()),
  ).position;
  const hand = { wrist: new Vector3(), rotation: new Quaternion() };
  let best: [number, number] | null = null;
  let start = -1;
  let nearest = 0;
  let nearestDistance = Infinity;
  const steps = Math.round(rig.hold.stopEnd / STOP_STEP);
  for (let k = 0; k <= steps; k++) {
    const stop = k * STOP_STEP;
    const distance = stopHandAt(
      rig,
      place,
      strings,
      stop,
      BOWED_HANDS.curlL,
      0,
      MIDDLE_FINGER,
      hand,
    ).wrist.distanceTo(shoulder);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = stop;
    }
    const reached = distance <= rig.armL.reach;
    if (reached && start < 0) {
      start = stop;
    }
    if (start >= 0 && (!reached || k === steps)) {
      const end = reached ? stop : stop - STOP_STEP;
      if (!best || end - start > best[1] - best[0]) {
        best = [start, end];
      }
      start = -1;
    }
  }
  return best ?? [nearest, nearest];
}

/**
 * Gives the place of the `instrument` bone in the rest pose (design 5.2), in the model axes.
 *
 * @param model The player model.
 * @param hold The hold of the instrument.
 * @param atSide True when the left hand holds the instrument at the side in the rest pose.
 * @param pivot The bind position of the `instrument` bone.
 * @param playShift The move of the instrument while the player plays, in meters.
 * @returns The place on the left thigh, the bind place for an instrument at the side (the rest
 *   at the side moves it later), or the playing place for an instrument on the floor.
 */
function restPivotOf(
  model: PlayerModel,
  hold: BowedHold,
  atSide: boolean,
  pivot: Vec3,
  playShift: Vector3,
): Vec3 {
  if (!hold.rest) {
    return toVec3(new Vector3(...pivot).add(playShift));
  }
  return atSide ? pivot : lapPoint(model, 'L', hold.rest.lap);
}

/**
 * Finds the points of a bowed string player that the pose needs.
 *
 * @param model A player with a violin, a viola, a cello, or a contrabass.
 * @param instrument The instrument of the model.
 * @param hold The hold of the instrument. The stage uses the hold of {@link BOWED_HOLDS}.
 * @returns The rig.
 * @throws Error if the instrument has no bow or no target of a bowed string.
 */
export function bowedRig(
  model: PlayerModel,
  instrument: BowedInstrument,
  hold: BowedHold = BOWED_HOLDS[instrument],
): BowedRig {
  const { positions, parents } = model.skeleton;
  const at = (bone: number): Vec3 => positions[bone] ?? [0, 0, 0];
  const pieceRotation = (bone: 'instrument' | 'bow'): Quaternion => {
    const placed = model.pieces.find((p) => p.piece.bone === bone);
    if (!placed) {
      throw new Error(`The ${instrument} has no piece on the bone "${bone}".`);
    }
    return new Quaternion(...placed.at.rotation);
  };
  const placed = (bone: 'instrument' | 'bow', point: Vec3): Vector3 =>
    new Vector3(...placePoint(model.pieces, { bone, at: point }));
  const contactTarget = targetOf(model, 'bow-contact');
  const board = targetOf(model, 'fingerboard');
  const hair = targetOf(model, 'bow-hair');

  const contact = placed('instrument', contactTarget.from);
  // The model of each bowed string is the violin model at its scale.
  const contactShare = (VIOLIN.bowContact - VIOLIN.bridge) / (VIOLIN.nut - VIOLIN.bridge);
  const top = new Vector3(...contactTarget.normal)
    .applyQuaternion(pieceRotation('instrument'))
    .normalize();
  const nut = placed('instrument', board.from);
  const neckEnd = placed('instrument', board.to);
  const neck = neckEnd.clone().sub(nut);
  const axis = neck.clone().negate().normalize();
  const hairFrom = placed('bow', hair.from);
  const hairTo = placed('bow', hair.to);
  const hairAxis = hairTo.clone().sub(hairFrom).normalize();
  const hairNormal = new Vector3(...hair.normal).applyQuaternion(pieceRotation('bow')).normalize();

  const parent = parents[BONES.instrument] ?? 0;
  const atSide = (model.support === 'stand' || hold.restAtSide) && hold.rest !== null;
  const lapRest = atSide ? STANDING_REST : hold.rest;
  const restRotation = new Quaternion();
  const bindTurn = setFromBasis(new Quaternion(), axis, top).invert();
  const turnTo = (
    turn: { readonly axis: Vec3; readonly top: Vec3 },
    out: Quaternion,
  ): Quaternion => {
    const toAxis = new Vector3(...turn.axis).normalize();
    const toTop = new Vector3(...turn.top);
    toTop.addScaledVector(toAxis, -toTop.dot(toAxis)).normalize();
    return setFromBasis(out, toAxis, toTop).multiply(bindTurn);
  };
  if (lapRest) {
    turnTo(lapRest, restRotation);
  } else {
    // An instrument on the floor rests at its playing place.
    restRotation.fromArray(hold.playTurn);
  }
  const restBow = hold.restBow;
  const bowBind = setFromBasis(new Quaternion(), hairAxis, hairNormal).invert();
  const bowRotation = (tip: Vec3, side: Vec3): Quat => {
    const t = new Vector3(...tip).normalize();
    const n = new Vector3(...side);
    n.addScaledVector(t, -n.dot(t)).normalize();
    return toQuat(setFromBasis(new Quaternion(), t, n).multiply(bowBind));
  };
  const via = restBow.via;
  const strings = new Vector3().crossVectors(top, axis);
  const playShift = new Vector3(...hold.playShift).multiplyScalar(model.body.headHeight);
  const pivot = at(BONES.instrument);
  const rig: RigPoints = {
    hold,
    pivot,
    parent,
    parentBind: at(parent),
    spineBind: at(BONES.spine),
    chestBind: at(BONES.chest),
    contact: toVec3(contact),
    stringLength: contact.distanceTo(nut) / (1 - contactShare),
    contactShare,
    axis: toVec3(axis),
    top: toVec3(top),
    across: toSide(strings, hold.tip),
    fingers: toSide(strings, hold.fingers),
    nut: toVec3(nut),
    neck: toVec3(neck),
    knuckles: toVec3(new Vector3(...at(BONES.fingersL)).sub(new Vector3(...at(BONES.handL)))),
    fingerBlock: toVec3(
      new Vector3(...model.body.fingerBlockL).sub(new Vector3(...at(BONES.fingersL))),
    ),
    pluck: toVec3(contact.clone().sub(neckEnd).multiplyScalar(hold.pluckPlace).add(neckEnd)),
    hairStart: toVec3(hairFrom.clone().sub(new Vector3(...at(BONES.bow)))),
    grip: toVec3(new Vector3(...at(BONES.bow)).sub(new Vector3(...at(BONES.handR)))),
    stick: toVec3(hairAxis),
    forearm: new Vector3(...at(BONES.handR)).distanceTo(new Vector3(...at(boneIndex('forearmR')))),
    hairLength: hairTo.distanceTo(hairFrom),
    bowAlign: toQuat(setFromBasis(new Quaternion(), hairAxis, hairNormal).invert()),
    armL: armRig(model, 'L'),
    armR: armRig(model, 'R'),
    restRotation: toQuat(restRotation),
    playShift: toVec3(playShift),
    restPivot: restPivotOf(model, hold, atSide, pivot, playShift),
    liftReach: toVec3(new Vector3(...hold.liftReach).multiplyScalar(model.body.headHeight)),
    liftRotation: hold.liftTurn ? toQuat(turnTo(hold.liftTurn, new Quaternion())) : null,
    restPoleR: hold.restPoleR,
    restPoleL: hold.restPoleL,
    restBow: {
      grip: lapPoint(model, 'R', restBow.lap),
      rotation: bowRotation(restBow.tip, restBow.hair),
      via: via
        ? {
            rotation: bowRotation(via.tip, via.hair),
            reach: toVec3(new Vector3(...via.reach).multiplyScalar(model.body.headHeight)),
          }
        : null,
    },
  };
  const standBow = hold.standBow ? bowRotation(hold.standBow.tip, hold.standBow.hair) : null;
  const standVia = hold.standBow?.via;
  const rest = atSide
    ? standingRest(
        model,
        rig,
        standBow,
        standVia
          ? {
              rotation: bowRotation(standVia.tip, standVia.hair),
              reach: toVec3(new Vector3(...standVia.reach).multiplyScalar(model.body.headHeight)),
            }
          : null,
      )
    : rig;
  return { ...rest, bowRange: bowRangeOf(rest), stopRange: stopRangeOf(rest) };
}

/**
 * Gives the frames of the torso in the bind pose.
 *
 * @param rig The points of the player.
 * @returns The frames of the root and of the chest, with no turn.
 */
function bindFrames(rig: RigPoints): TorsoFrames {
  return {
    root: { rotation: new Quaternion(), position: new Vector3() },
    chest: { rotation: new Quaternion(), position: new Vector3(...rig.chestBind) },
  };
}

/**
 * Gives the rest pose of a soloist who stands (design 5.2): the arms hang a little out to the
 * sides, the left hand holds the instrument at the rest place of the fingers, and the right hand
 * holds the bow at the hanging wrist, as in the bind pose or with the turn of
 * {@link BowedHold.standBow}.
 *
 * @param model The player model.
 * @param rig The points of the player, with the instrument turned for the rest pose.
 * @param standBow The turn of the bow of {@link BowedHold.standBow} in the model axes, or `null`
 *   for the turn of the hanging hand.
 * @param via The bow in the middle of the lift and of the lowering, in the model axes, or `null`
 *   for a direct mix of the hanging bow and the playing bow.
 * @returns The points, with the rest place of the instrument and the bow.
 */
function standingRest(
  model: PlayerModel,
  rig: RigPoints,
  standBow: Quat | null,
  via: BowedRig['restBow']['via'],
): RigPoints {
  const hangL = hangingArm(model, rig.armL);
  const hangR = hangingArm(model, rig.armR);

  // The left hand holds the instrument at the hanging wrist.
  const frames = bindFrames(rig);
  const { place, strings } = createBowPlaces();
  instrumentAt(rig, frames, 0, place);
  stringsAt(rig, place, strings);
  const hand = stopHandAt(rig, place, strings, rig.hold.restPlace, 0, 0, MIDDLE_FINGER, {
    wrist: new Vector3(),
    rotation: new Quaternion(),
  });
  const wristL = new Vector3(...rig.armL.bind.shoulder).add(new Vector3(...hangL.wrist));

  // The right hand holds the bow at the hanging wrist, as in the bind pose or with its own turn.
  const bowHand = standBow ? new Quaternion(...standBow) : new Quaternion(...hangR.hand);
  const wristR = new Vector3(...rig.armR.bind.shoulder).add(new Vector3(...hangR.wrist));

  return {
    ...rig,
    restPivot: toVec3(new Vector3(...rig.restPivot).add(wristL.sub(hand.wrist))),
    restPoleR: hangR.pole,
    restPoleL: hangL.pole,
    restBow: {
      grip: toVec3(new Vector3(...rig.grip).applyQuaternion(bowHand).add(wristR)),
      rotation: toQuat(bowHand),
      via,
    },
  };
}
