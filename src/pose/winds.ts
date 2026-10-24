import { MathUtils, Quaternion, Vector3 } from 'three';

import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import type { SpeciesId } from '../models/species.ts';
import { placePoint } from '../models/instruments/hold.ts';
import type { PiecePoint } from '../models/instruments/types.ts';
import { IDENTITY, toQuat, toVec3 } from '../models/tuples.ts';
import type { Quat, Vec3 } from '../models/tuples.ts';
import { mixDirection, mixRotation } from './blend.ts';
import type { InstrumentOf } from './family.ts';
import { NECK_SHARE, createFrame, posePoint, setBoneRotation, setFromBasis } from './frames.ts';
import type { Frame, TorsoFrames } from './frames.ts';
import { hangingArm, hangingHand, hangingWrist } from './hang.ts';
import type { HangingArm } from './hang.ts';
import { armRig, handToward, poseShoulder, writeArm, writeCurl } from './ik.ts';
import type { ArmRig } from './ik.ts';
import { lapHand } from './lap.ts';
import type { LapHand } from './lap.ts';
import { BRASS_FUNDAMENTALS } from './wind-notes.ts';
import type { Fingering, WindState } from './wind-notes.ts';

/** The woodwinds and the brass of design 4.6. */
export type WindInstrument = InstrumentOf<'woodwind' | 'brass'>;

/**
 * The values of the hold of each wind instrument (design 5.3). The directions are in the model
 * axes of the bind pose: the player faces -z, and its left is -x.
 */
export interface WindHold {
  /**
   * The forward turn of the right shoulder bone around y, so that the right arm reaches a far
   * grip: the low hands of the oboe and the clarinet, and the trombone slide.
   */
  readonly reach: number;
  /**
   * The forward turn of the left shoulder bone around y, so that the left upper arm does not take
   * the whole turn to a grip far in front of the chest. 0 keeps the left shoulder square.
   */
  readonly reachL: number;
  /** The directions to which the elbows point. */
  readonly poleL: Vec3;
  readonly poleR: Vec3;
  /** The direction to which the left elbow points in the rest pose: out to the side. */
  readonly restPoleL: Vec3;
  /** The direction to which the right elbow points in the rest pose. */
  readonly restPoleR: Vec3;
  /**
   * The rotation of the `instrument` bone while the player plays, relative to the chest. The
   * instrument turns around the mouthpiece, so that the mouthpiece stays at the mouth.
   */
  readonly play: Quat;
  /**
   * The rotation of the `instrument` bone in the rest pose, relative to the chest. The
   * instrument turns down around the mouthpiece. A pose has no move of the instrument bone, so
   * the mouthpiece stays under the mouth, and the head lifts off it.
   */
  readonly rest: Quat;
  /**
   * The move of the `instrument` bone in the rest pose, in head heights, in the axes of the chest.
   * The instrument comes down from the mouth to the lap.
   */
  readonly restShift: Vec3;
  readonly fingering: Fingering;
  /** The fundamental of a brass tube, as a MIDI key. 0 for a woodwind. */
  readonly fundamental: number;
  /**
   * The turn of the head to the left while the player plays, in radians, as the look turns the
   * neck and the head (design 5.3). The mouthpiece follows the turned mouth. A real flutist turns
   * the head to the left, so that the flute lies square to the face and the right elbow stays in
   * line with the shoulder. 0 keeps the head square to the chest.
   */
  readonly headTurn: number;
  /**
   * The move of the mouthpiece from the mouth of the bind pose, in head heights, in the bind axes
   * of the head. A long muzzle reaches past the mouth, so a flute can sit further back under it.
   * (0, 0, 0) keeps the mouthpiece at the mouth.
   */
  readonly lipShift: Vec3;
  /**
   * The left paw in the rest pose when it leaves its grip (design 5.2, 5.3): the place of the palm
   * of a seated player from the top of its left thigh (on the thigh, or beside it with the arm
   * hanging, as for the tan fox), the side of the palm, and the direction of the fingers. The
   * left arm of a standing player hangs (`hangingArm()`). The lift and the lowering move the left
   * paw between its rest place and its grip by the weight of the playing pose, the weight that
   * also moves the instrument, with the arc of the paw. `null` keeps the left palm on its grip,
   * also in the rest pose.
   */
  readonly restFreeL: FreePaw | null;
  /**
   * True when each paw rolls around the line from its shoulder to its grip until its palm faces
   * the tube ({@link palmToTube}). With false, the paw keeps the roll of its shoulder, and a
   * small paw can hang beside the tube with its palm to the side (user, 2026-10-23: "wolf, mouse,
   * and tan fox not holding the instrument properly").
   */
  readonly palmToTube: boolean;
  /**
   * The share, from 0 to 1, of the part along the tube that the aim of each paw on its grip loses
   * in the playing pose ({@link aimAcross}). With 0, the paw points along the line from its
   * shoulder to its grip. A tube far in front of the body then puts that line along the tube, and
   * the fingers point past the tube in place of around it. Only a paw that rolls its palm to the
   * tube ({@link WindHold.palmToTube}) takes it.
   */
  readonly aimAcross: number;
}

/** The left paw of a wind hold that leaves its grip in the rest pose (`WindHold.restFreeL`). */
export interface FreePaw extends LapHand {
  /**
   * The move of the wrist away from the straight line from its rest place to its grip, at the
   * middle of the lift and the lowering, in head heights: out to the left, up, and forward. The
   * move grows and shrinks with `4 w (1 - w)` of the weight `w` of the playing pose, so that the
   * paw passes in front of a round belly.
   */
  readonly arc: Vec3;
}

/**
 * The elbows of a wind player point out and forward, level with the line of the arm, unless a
 * hold turns them down. The elbows down and out, (0.6, -1, 0.2), put the arms of the woodwinds and
 * the horn up to 0.3 H into the thighs and 0.2 H into the belly while they played (2026-10-07).
 */
const POLE_L: Vec3 = [-1, 0, -1];
const POLE_R: Vec3 = [1, 0, -1];

/** A woodwind hold with no shoulder turn and no turn in the rest pose. */
const WOODWIND = {
  reach: 0,
  reachL: 0,
  poleL: POLE_L,
  poleR: POLE_R,
  restPoleL: POLE_L,
  restPoleR: POLE_R,
  play: IDENTITY,
  rest: IDENTITY,
  restShift: [0, 0, 0],
  fingering: 'holes',
  fundamental: 0,
  headTurn: 0,
  lipShift: [0, 0, 0],
  restFreeL: null,
  palmToTube: false,
  aimAcross: 0,
} as const satisfies WindHold;

const X_AXIS = new Vector3(1, 0, 0);
const Y_AXIS = new Vector3(0, 1, 0);
const Z_AXIS = new Vector3(0, 0, 1);

/**
 * Gives a rotation of the `instrument` bone in the rest pose or the playing pose: a turn around x,
 * then around z, after a first turn. The hold tools take it as the value of a `--set`, such as
 * `bassoon@beaver.play=holdTurn(20,20)` (`tools/hold-sets.ts`).
 *
 * @param x The turn around x, in degrees. A positive turn moves the lower end forward.
 * @param z The turn around z, in degrees. A positive turn moves the lower end to the right.
 * @param first The first turn. None by default.
 * @returns The rotation.
 */
export function holdTurn(x: number, z: number, first: Quat = IDENTITY): Quat {
  return toQuat(
    new Quaternion()
      .setFromAxisAngle(X_AXIS, x * MathUtils.DEG2RAD)
      .multiply(new Quaternion().setFromAxisAngle(Z_AXIS, z * MathUtils.DEG2RAD))
      .multiply(new Quaternion(...first)),
  );
}

/**
 * The direction of the flute in the bind pose: from the lip plate to the right, 10° to the front
 * and 8° down, with the keys up (`woodwindRotation()` of `models/instruments/woodwinds.ts`).
 */
const FLUTE_BIND = { forward: 10, down: 8 } as const;

/**
 * Gives the rotation of a tube from the mouthpiece along +x, with its keys along +y: the tube
 * points to the right, the given angles to the front and down, and the keys are as near to a
 * direction as the tube permits.
 *
 * @param forward The angle of the tube to the front of the right side, in degrees.
 * @param down The angle of the tube below the level, in degrees.
 * @param keys The direction of the keys. Up by default.
 * @returns The rotation.
 */
function tubeAim(forward: number, down: number, keys: Vec3 = [0, 1, 0]): Quaternion {
  const f = forward * MathUtils.DEG2RAD;
  const d = down * MathUtils.DEG2RAD;
  const along = new Vector3(Math.cos(d) * Math.cos(f), -Math.sin(d), -Math.cos(d) * Math.sin(f));
  const up = new Vector3(...keys).projectOnPlane(along).normalize();
  return setFromBasis(new Quaternion(), along, up);
}

/**
 * Gives the turn of the `instrument` bone of the flute from its bind direction to another
 * direction (design 5.3).
 *
 * @param forward The angle of the flute to the front of the right side, in degrees.
 * @param down The angle of the flute below the level, in degrees.
 * @param keys The direction of the keys. Up by default.
 * @returns The turn, in the axes of the chest.
 */
export function fluteTurn(forward: number, down: number, keys: Vec3 = [0, 1, 0]): Quat {
  return toQuat(
    tubeAim(forward, down, keys).multiply(tubeAim(FLUTE_BIND.forward, FLUTE_BIND.down).invert()),
  );
}

/**
 * The holds of the winds. In the rest pose, each instrument moves off the mouth, to the side and
 * a little forward, and tilts, so that the arms that hold it stay out of the body (design 5.3).
 */
export const WIND_HOLDS = {
  // While it plays, the flute turns its right end 30° back and 15° down, nearer to level, the left
  // elbow points out, forward, and a little up, and the right elbow points down. The left hand
  // holds the flute in front of the face, to the right of the middle, so the left arm crosses the
  // chest: at 10° down, the left upper arm went 0.03 H into the chest of the tan fox, and level and
  // square to the front 0.067 H. The flute turns its right end down in the rest pose.
  flute: {
    ...WOODWIND,
    play: holdTurn(
      0,
      -15,
      toQuat(new Quaternion().setFromAxisAngle(Y_AXIS, -30 * MathUtils.DEG2RAD)),
    ),
    poleL: [-1, 0.5, -1],
    poleR: [1, -1, -0.5],
    restPoleL: [-1, 0, -0.3],
    restPoleR: [1, -1, -1],
    rest: holdTurn(0, -45),
    restShift: [-0.15, 0, -0.1],
  },
  // The right palm of the oboe was 1.04 of 97% of the reach (review of step 4). The left elbow
  // points down. At rest, it points a little further out: with (-1, -1, -1), the left upper arm of
  // the mouse went 0.027 H into the trunk at the start of the lift, after the seats fitted the
  // legs (2026-10-11).
  oboe: {
    ...WOODWIND,
    reach: 20 * MathUtils.DEG2RAD,
    poleL: [-1, -1, -1],
    restPoleL: [-1.5, -1, -1],
    restPoleR: [0.5, -1, -0.5],
    rest: holdTurn(9, 27),
    restShift: [-0.13, 0, -0.02],
  },
  // The long snout of the wolf puts the clarinet far forward, so the right arm needs the turn
  // of the oboe. The left elbow points down, as in animals.webp.
  clarinet: {
    ...WOODWIND,
    reach: 20 * MathUtils.DEG2RAD,
    poleL: [-1, -1, -1],
    restPoleL: [-1, -1, -1],
    restPoleR: [1, -1, -1],
    rest: holdTurn(-10, 30),
    restShift: [-0.17, 0.05, -0.02],
  },
  // While it plays, the bassoon turns its lower end 20° forward and 20° to the right, and the
  // right elbow points down. With no turn, the right forearm went 0.21 H into the right thigh.
  bassoon: {
    ...WOODWIND,
    play: holdTurn(20, 20),
    poleR: [0.5, -1, -0.5],
    restPoleL: [-1, 0, 0],
    restPoleR: [0.5, -1, -0.5],
    rest: holdTurn(-16, -1, holdTurn(30, 26)),
    restShift: [-0.17, -0.04, -0.02],
  },
  // In the rest pose, the horn comes up out of the right thigh, so that the bell sits on it. The
  // right elbow points down, also while the horn plays. It points a little further out than
  // (0.5, -1, -0.5): on the low seats of 2026-10-11, the right upper arm of the pig went 0.031 H
  // into the trunk in play (limit 0.02 H).
  horn: {
    ...WOODWIND,
    poleR: [0.6, -1, -0.5],
    restPoleL: [-0.5, -1, -0.5],
    restPoleR: [0.5, -1, 0],
    rest: holdTurn(23, -7),
    restShift: [-0.16, 0.29, -0.1],
    fingering: 'valves-left',
    fundamental: BRASS_FUNDAMENTALS.horn,
  },
  trumpet: {
    ...WOODWIND,
    poleL: [-0.5, -1, -1],
    poleR: [1, -1, -1],
    restPoleL: [-1, -1, -1],
    restPoleR: [1, -1, -1],
    rest: holdTurn(-3, -20, holdTurn(-50, 0)),
    restShift: [0.19, 0.03, -0.03],
    fingering: 'valves-right',
    fundamental: BRASS_FUNDAMENTALS.trumpet,
  },
  // The slide needs the right arm far forward. Even so, the arm reaches only the first part of
  // the slide travel (design 5.3). The elbows point down, near the torso.
  trombone: {
    ...WOODWIND,
    reach: 45 * MathUtils.DEG2RAD,
    poleL: [-0.5, -1, -1],
    poleR: [0.5, -1, -0.5],
    restPoleL: [-0.5, -1, 0],
    restPoleR: [1, -1, -1],
    rest: holdTurn(-14, -2, holdTurn(-45, 0)),
    restShift: [-0.14, 0.05, -0.28],
    fingering: 'slide',
    fundamental: BRASS_FUNDAMENTALS.trombone,
  },
  tuba: {
    ...WOODWIND,
    poleL: [-1, -1, -1],
    poleR: [1, -1, -1],
    restPoleL: [-1, 0, -0.3],
    restPoleR: [1, -1, -1],
    rest: holdTurn(1, -13, holdTurn(-10, 30)),
    restShift: [-0.01, 0.02, -0.03],
    fingering: 'valves-right',
    fundamental: BRASS_FUNDAMENTALS.tuba,
  },
} as const satisfies Readonly<Record<WindInstrument, WindHold>>;

/** The turn of the head of the flutist fox to the left while it plays, in degrees. */
const FOX_HEAD_TURN = 30;

/**
 * The turn of the right end of the flute of the flutist fox back from square to the face, in
 * degrees. Square to the face, the shorter arms of 2026-10-14 reach the right grip with 0.8 cm to
 * spare, and two faces of the front of the right shoulder fold in each play sample. The turns from
 * 7° to 11° back, with the flute 8° to 10° down, fold 0.7% of the play samples, and 5° or 12° back,
 * or 12° down, fold each sample again, so the hold takes the middle (`2026-10-14-arms-rest`
 * decisions).
 */
export const FOX_FLUTE_BACK = 9;

/**
 * The flute hold of the tan fox (design 5.3), the hold of a real flutist (decisions
 * `2026-10-14-fox-flute.md`). The head turns 30° to the left while the fox plays, as Debost
 * writes, and the flute lies 9° back from square to the face, 8° down to the right
 * ({@link FOX_FLUTE_BACK}). The lip plate sits 0.05 H
 * below the mouth, under the long muzzle: at the mouth, the jaw touched the flute. The shoulders
 * stay square and low, with no forward turn of the right shoulder. The left elbow points down and
 * out, and the right elbow out to the side, in line with the shoulder. In the rest pose, the flute
 * stands upright on the right leg with the foot joint down, and the right paw holds it at the
 * right-hand keys, as a real flutist rests it (decisions `2026-10-15-flute-rest.md`). The foot
 * joint stands at the outer side of the right knee, and the top leans about 10° out and forward.
 * The left paw leaves its grip ({@link WindHold.restFreeL}), and both arms hang down along the
 * sides. On the thighs of 2026-10-16, which slope down to the knees, the paw at 0.66 of the way to
 * the knee did not reach its place, and the left forearm went 2.8 cm into the body. On the top of
 * the knee, 4° from vertical, the right upper arm went 1.6 cm into the body (limit 1.5 cm). With
 * the elbows out to the side, the upper arms folded more faces of the skin than the rest of
 * 2026-10-14 (`docs/research/2026-10-15-flute-rest.md`).
 *
 * With the thighs 25° down and the vertical shins of 2026-10-17, the knees are lower, and the rest
 * of 2026-10-16 put the left upper arm 3.6 cm into the body and the foot joint 5.4 cm above the
 * right leg (2026-10-17-fox-form decisions). The flute now moves 0.06 H further out and 0.13 H
 * back toward the body, and the right elbow points out and down with no turn back. The right palm
 * keeps 1.2 cm of reach to its grip (`pnpm hold-reach fox-tan --instrument flute`): with the flute
 * 0.06 H lower, it missed the grip by 1.7 cm. A flute nearer to the leg put the right upper arm
 * into the body: with the foot joint 2.0 cm above the leg, it went 3.7 cm into the body.
 *
 * The top of the left thigh is out of reach of the left arm: the nearest place of the palm on it
 * is 0.582 m from the shoulder joint, and the arm is 0.545 m (2026-10-17-tan-rest decisions). So
 * the left arm hangs near the side with a soft bend, as a seated flutist lets the free arm hang. The
 * paw hangs about 4 cm out from the outer side of the haunch, with the palm toward the body. The
 * lap place takes the top of the belly over the thigh at 0.45 of the way to the knee, and the paw
 * hangs 0.45 H out, 0.55 H down, and 0.12 H forward from it. Out at 0.5 H from the top of the
 * thigh, the straight arm stood out from the body. With the paw nearer to the haunch or the elbow
 * more bent, the inner elbow went further into the side of the trunk.
 */
const FOX_FLUTE = {
  ...WOODWIND,
  headTurn: FOX_HEAD_TURN * MathUtils.DEG2RAD,
  lipShift: [0, -0.05, 0],
  play: fluteTurn(FOX_HEAD_TURN - FOX_FLUTE_BACK, 8),
  poleL: [-1, -1, -0.3],
  poleR: [1, -0.8, 0],
  rest: fluteTurn(-136, 80, [-0.545, 0, 0.839]),
  restShift: [0.95, -0.8, 0.45],
  restPoleL: [-0.15, -1, 0.38],
  restPoleR: [0.69, -1, -0.01],
  restFreeL: {
    lap: { along: 0.45, offset: [-0.45, -0.55, -0.12] },
    palm: [0.85, -0.37, 0.38],
    fingers: [0, -1, -0.3],
    arc: [0.57, 0.04, 0.31],
  },
  palmToTube: true,
} as const satisfies WindHold;

/**
 * The turns of the trombone hold of the panda while it plays, in degrees (design 5.3). The user
 * chose "B: between (Recommended)" of the round `trombone-fit`: the slide points 35° below the
 * level and 30° to the right. Each set of turns is one change of this constant. The variant A was
 * 35° right, 15° down, and the left shoulder 15° (30° below the level), and the hold before it was
 * 20° right, 25° down, and the left shoulder 9° (40° below the level)
 * (`docs/research/2026-10-18-trombone-fit.md`).
 */
const PANDA_PLAY = {
  /** The turn of the slide to the right of the panda, around the mouthpiece. */
  right: 30,
  /** The turn of the slide down around the mouthpiece, after the turn right. */
  down: 20,
  /** The forward turn of the left shoulder. */
  shoulderL: 15,
} as const;

/**
 * The trombone hold of the panda (design 5.3), the hold of a real trombonist (decisions
 * `2026-10-18-mesh-panda.md`): the left paw holds the trombone at its grip near the mouthpiece,
 * and the right paw moves the slide. The big round head puts the mouth of the panda 0.40 m in
 * front of its shoulder joints, so with the slide of {@link WIND_HOLDS} straight ahead and 15°
 * down, the grip of the first position is 0.588 m from the right shoulder joint, beyond the reach
 * of the arm, and the slide reach is 0. While the panda plays, the slide turns to its right and
 * then down around the mouthpiece ({@link PANDA_PLAY}), toward the right shoulder, so that the
 * right arm reaches 0.165 m of the travel. A real trombonist points the slide toward the audience,
 * and never down to the floor (`docs/reference/wind-technique.md` 1.1). For the same reach, a
 * slide nearer to the level must turn further to the right: the angle from the front stays about
 * 45°. With 38° right and 12° down (27° below the level), 30% of the play samples folded
 * (`docs/research/2026-10-18-trombone-fit.md`).
 *
 * The left shoulder turns forward, as the shoulder blade of a real player slides forward when the
 * arm reaches forward. With a square left shoulder, the left upper arm turned 68° from its bind
 * direction to the grip, and faces at the front of the left shoulder folded in each sample
 * (`docs/research/2026-10-18-panda-folds.md`). The left grip turns with the slide, so with the
 * slide 30° to the right, a turn of 10° still folds faces 1290 and 1291 in each play sample, and
 * 15° or 20° removes the folds. The user chose 9° before for a smaller shadow of the left arm on
 * the belly ("Try the 9° turn"). With 15°, the shadow band covers 44.6% of a box of the belly in
 * the front view, against 20.9% with 9° and the slide of the hold before.
 */
const PANDA_TROMBONE = {
  ...WIND_HOLDS.trombone,
  reachL: PANDA_PLAY.shoulderL * MathUtils.DEG2RAD,
  play: toQuat(
    new Quaternion()
      .setFromAxisAngle(Y_AXIS, -PANDA_PLAY.right * MathUtils.DEG2RAD)
      .multiply(new Quaternion().setFromAxisAngle(X_AXIS, -PANDA_PLAY.down * MathUtils.DEG2RAD)),
  ),
} as const satisfies WindHold;

/** The turn of the lower end of the oboe of the mouse forward while it plays, in degrees. */
const MOUSE_OBOE_FORWARD = 0;

/**
 * The oboe hold of the mouse (design 5.3), the hold of a real oboist (decisions
 * `2026-10-19-mesh-mouse.md` and `2026-10-19-mouse-size.md`, `docs/reference/wind-technique.md`
 * 2.3). The long muzzle puts the tip of the nose far in front of the mouth, so the reed sits
 * 0.23 H further back and 0.04 H lower than the mouth of the bind pose, in the mouth under the
 * nose, with about half of the reed in the mouth. The oboe keeps the angle of {@link WIND_HOLDS},
 * 30° from the vertical ({@link MOUSE_OBOE_FORWARD}° further forward), and each paw aims across the
 * tube (`aimAcross`): the long muzzle already puts the reed far in front of the chest, so at 40°
 * the paws held the oboe at arm's length with level forearms (user, 2026-10-24: "also how the mouse
 * is holding the instrument", `2026-10-24-wind-paws` decisions). The small mouse plays a smaller oboe (`SpeciesParams.oboeScale`).
 * With the reed 0.14 H back, the right paw reached its grip with 3 cm to spare only on an oboe
 * of 0.52, and 0.09 H further back, on an oboe of 0.62. In the rest, the oboe is 0.04 H lower and
 * 0.02 H further forward than in the rest of {@link WIND_HOLDS}, so that the right paw keeps 3 cm
 * to spare and the lift folds less.
 *
 * The big head puts the mouth about 0.13 m above the shoulder joints, so the grips are at the
 * height of the shoulders, and the arms reach forward. While the mouse plays, both elbows point
 * down, out, and forward, as an oboist drops the wrists and keeps the arms a little away from the
 * sides. With the elbow of the right arm of {@link WIND_HOLDS} out and level, the right upper arm
 * turned 83° from its bind direction and the paw 160° from the forearm, and the upper arms showed
 * as flat twisted bands. With the elbows down, they turn 63° and 100°, and the left arm 58° and
 * 123°. The shoulder turns and the rest turn are those of {@link WIND_HOLDS}.
 */
const MOUSE_OBOE = {
  ...WIND_HOLDS.oboe,
  lipShift: [0, -0.04, 0.23],
  restShift: [-0.13, -0.04, -0.04],
  play: holdTurn(MOUSE_OBOE_FORWARD, 0),
  poleL: [-0.5, -1, -0.5],
  poleR: [0.5, -1, -0.5],
  palmToTube: true,
  aimAcross: 1,
} as const satisfies WindHold;

/** The forward turns of the shoulder bones of the bassoon beaver while it plays, in degrees. */
const BEAVER_SHOULDER_TURN = {
  /**
   * The left shoulder. With 15°, the left upper arm turned 84° from its bind direction, and the
   * faces at the front of the left shoulder folded in each play sample.
   */
  left: 20,
  /** The right shoulder. */
  right: 15,
} as const;

/**
 * The bassoon hold of the beaver (design 5.3), the hold of a real bassoonist (decisions
 * `2026-10-19-mesh-beaver.md`, `docs/reference/wind-technique.md` 3): the bassoon lies diagonal
 * in front of the body, the left paw above the right paw, and the bocal brings the reed to the
 * mouth at a nearly level angle. The play turn and the rest are those of {@link WIND_HOLDS}.
 *
 * The long muzzle and the front teeth put the tip of the nose far in front of the mouth, so the
 * reed sits 0.33 H lower and 0.25 H further back than the mouth of the bind pose, under the front
 * teeth. The beaver keeps the arms that the user chose, so it plays a smaller bassoon
 * (`SpeciesParams.bassoonScale`), and each shoulder bone turns forward
 * ({@link BEAVER_SHOULDER_TURN}), as the shoulder blade of a real player slides forward when the
 * arm reaches forward: with square shoulders, the right paw reached its grip with 3 cm to spare
 * only on a bassoon of 0.75. Both elbows point down, out, and forward, which gave the smallest arm
 * turns of 3 elbow directions. The left elbow keeps that direction in the rest pose: with the
 * elbow of the shared bassoon rest straight out to the side, the left paw turned 178° on its
 * forearm at rest, so the lift and the lowering turned it through 180° and the twist bone of the
 * forearm jumped (user, 2026-10-23: "the cat's and beaver's arm is very twisted when transitioned
 * from rest to play"). With it, the paw turns at most 118° (2026-10-23-night-fixes decisions).
 */
const BEAVER_BASSOON = {
  ...WIND_HOLDS.bassoon,
  reach: BEAVER_SHOULDER_TURN.right * MathUtils.DEG2RAD,
  reachL: BEAVER_SHOULDER_TURN.left * MathUtils.DEG2RAD,
  lipShift: [0, -0.33, 0.25],
  poleL: [-0.5, -1, -0.5],
  poleR: [0.5, -1, -0.5],
  restPoleL: [-0.5, -1, -0.5],
} as const satisfies WindHold;

/** The turns of the horn of the pig around the mouthpiece, relative to the chest (design 5.3). */
interface HornTurns {
  /** The turn of the right side, with the bell, forward around the vertical, in degrees. */
  readonly right: number;
  /** The turn of the lower end back toward the body, after `right`, in degrees. */
  readonly back: number;
  /** The turn of the lower end to the left, after `back`, in degrees. */
  readonly left: number;
}

/** The turns of the horn of the pig in the playing pose and in the rest pose. */
const PIG_TURNS = {
  /** The playing pose: the bell at the right of the torso and in front of it. */
  play: { right: 20, back: 40, left: 0 },
  /** The rest pose: the horn lower and further forward, on the belly over the lap. */
  rest: { right: 20, back: 40, left: 15 },
} as const satisfies Readonly<Record<'play' | 'rest', HornTurns>>;

/**
 * Gives the rotation of the `instrument` bone of the horn of the pig from its turns.
 *
 * @param turns The turns of {@link PIG_TURNS}.
 * @returns The rotation, relative to the chest.
 */
function pigTurn(turns: HornTurns): Quat {
  return toQuat(
    new Quaternion()
      .setFromAxisAngle(Y_AXIS, turns.right * MathUtils.DEG2RAD)
      .multiply(new Quaternion(...holdTurn(-turns.back, -turns.left))),
  );
}

/**
 * The horn hold of the pig (design 5.3), the hold of a real hornist (decisions
 * `2026-10-19-mesh-pig.md`, `docs/reference/wind-technique.md` 2.2): the left paw on the valves at
 * the middle of the body, the right paw in the bell, and the horn across the body from the mouth to
 * the bell at the right of the torso and in front of it. The long snout puts the mouthpiece
 * 0.29 m in front of the shoulder joints, so with the hold of {@link WIND_HOLDS} the left grip
 * was 0.507 m from the left shoulder joint, beyond the arm of 0.385 m. The horn turns its lower end
 * 40° back toward the body and its right side 20° forward ({@link PIG_TURNS}). The left shoulder
 * turns 26° forward, as the shoulder blade of a real player slides forward. The left paw then has
 * 8.0 cm to spare, and the right paw 7.4 cm (`pnpm hold-reach pig --instrument horn`).
 *
 * The left elbow points out, forward, and a little down, and the right elbow out and down. Of the
 * left elbow directions, (-0.5, -1, -0.5) turned the arm least, but put the left forearm 6 cm into
 * the chest. At rest, the horn comes down 0.2 H and 0.2 H forward onto the round belly, which covers
 * the short thighs, with the bell at the right of the belly beside the right haunch. A lower rest
 * put the right forearm 2.3 cm to 5.4 cm into the belly (`docs/research/2026-10-19-pig-mesh.md`).
 */
const PIG_HORN = {
  ...WIND_HOLDS.horn,
  reachL: 26 * MathUtils.DEG2RAD,
  play: pigTurn(PIG_TURNS.play),
  poleL: [-1, -0.5, -1],
  poleR: [1, -1, 0],
  rest: pigTurn(PIG_TURNS.rest),
  restShift: [0.05, -0.2, -0.2],
  restPoleL: [-1, -0.5, -1],
  restPoleR: [1, -0.3, 0.3],
} as const satisfies WindHold;

/** The turn of the lower end of the clarinet of the wolf forward while it plays, in degrees. */
const WOLF_CLARINET_FORWARD = 5;

/**
 * The clarinet hold of the wolf (design 5.3), the hold of a real clarinetist (decisions
 * `2026-10-20-mesh-wolf.md`, `docs/reference/wind-technique.md` 3): the clarinet at the middle of
 * the body, from the mouth to between the knees. The clarinet turns its lower end
 * {@link WOLF_CLARINET_FORWARD}° further forward than {@link WIND_HOLDS}, to 30° from the vertical.
 * The long muzzle already puts the mouthpiece far in front of the chest: at 45° from the vertical,
 * the bell was far in front of the knees, and the paws held the clarinet at arm's length with level
 * forearms (user, 2026-10-24: "fix how the wolf is holding the instrument",
 * `2026-10-24-wind-paws` decisions). Each paw also aims across the tube (`aimAcross`), so that its
 * fingers wrap the tube.
 *
 * The long muzzle puts the tip of the nose far in front of the mouth, and at 45° the grips moved
 * further forward: the left paw missed its grip by 2.4 cm and the right paw by 6.1 cm. So in round
 * `mesh-wolf`, the mouthpiece sat 0.3 H further back and 0.12 H lower than the mouth of the bind
 * pose, in the mouth under the muzzle, and each shoulder bone turned forward, the right 30° and the
 * left 20°.
 * The head of the mesh is 1.235 times the size of round `mesh-wolf`, and the body 0.9422 times
 * (`proportions` of `tools/mesh-rigs/wolf.json`), so the larger `H` moved the mouthpiece forward,
 * and the shorter arms missed: the right paw by 3.7 cm. The mouthpiece now sits 0.4 H further
 * back, and the right shoulder bone turns 35° forward. The paws reach their grips with 6.3 cm
 * (left) and 0.9 cm (right) to spare, and the mouthpiece goes 1.2 cm into the head
 * (`docs/research/2026-10-20-wolf-face/fit3.txt`).
 *
 * Both elbows point down and a little out, as a seated clarinetist lets the arms hang near the
 * body, in the play and in the rest. Of 4 elbow directions, this one gave the smallest paw turns
 * on the forearms: with the elbows of {@link WIND_HOLDS}, the right paw turned 141° and the left
 * paw 123°, and with these elbows 71° and 89° (`docs/research/2026-10-20-wolf-mesh.md`).
 *
 * At rest, the clarinet comes off the mouth 0.3 H down and 0.3 H forward, over the lap, with both
 * paws on their grips. With the rest place of {@link WIND_HOLDS} in front of the chest, the right
 * elbow bent about 140°, and six faces of the right arm folded in each rest sample.
 */
const WOLF_CLARINET = {
  ...WIND_HOLDS.clarinet,
  reach: 35 * MathUtils.DEG2RAD,
  reachL: 20 * MathUtils.DEG2RAD,
  lipShift: [0, -0.12, 0.4],
  play: holdTurn(WOLF_CLARINET_FORWARD, 0),
  restShift: [-0.17, -0.3, -0.3],
  poleL: [-0.3, -1, 0],
  poleR: [0.3, -1, 0],
  restPoleL: [-0.3, -1, 0],
  restPoleR: [0.3, -1, 0],
  palmToTube: true,
  aimAcross: 1,
} as const satisfies WindHold;

/**
 * The trumpet hold of the monkey (design 5.3), the hold of a real trumpet player
 * (`docs/reference/wind-technique.md` 2.1): the right fingertips on the valves, the left paw
 * holds the weight, and the trumpet points forward, angled slightly down. The play turn, the rest,
 * and the shoulders are those of {@link WIND_HOLDS}. The monkey keeps the arms and plays the
 * smaller trumpet that the user chose (`SpeciesParams.trumpetScale`).
 *
 * The big head puts the mouthpiece 0.23 m above the shoulder joints, so the grips are 0.17 m to
 * 0.18 m above the shoulders at the size 1.1 that the user chose
 * (`docs/research/2026-10-20-mesh-monkey/size-1.1/mouth-probe.txt`).
 * Both elbows point down and a little out, as a real player lets the elbows hang. Of 5 elbow
 * directions that pass the arm gate, this one gave the smallest paw turns on the forearms:
 * 103° (left) and 106° (right) in the play, against 117° and 134° with the elbows of
 * {@link WIND_HOLDS}. Elbows out and higher gave level forearms, but the right upper arm went flat
 * (`docs/research/2026-10-20-mesh-monkey/arm-poles.txt`).
 */
const MONKEY_TRUMPET = {
  ...WIND_HOLDS.trumpet,
  poleL: [-0.3, -1, 0],
  poleR: [0.3, -1, 0],
} as const satisfies WindHold;

/**
 * The tuba hold of the rhino (design 5.3), the hold of a real tubist who stands with the tuba on a
 * strap (`docs/reference/wind-technique.md` 3): the tuba stands against the body, the bell at the
 * left of the head, the left paw on the main branch, and the right paw on the valves. The long
 * muzzle puts the mouthpiece 0.51 m in front of the shoulder joints, so the lead pipe of the tuba
 * is longer (`SpeciesParams.tubaPipe`), the right shoulder turns 30° forward, and the left
 * shoulder 40°, as the shoulder blades of a real player slide forward. The lower end of the tuba
 * turns 25° to the right, so that the bell stands at the left of the horn on the muzzle. The
 * elbows point out, down, and forward. At rest, the tuba moves off the mouth and its lower end
 * turns 5° forward (`docs/research/2026-10-21-mesh-rhino.md`).
 */
const RHINO_TUBA = {
  ...WIND_HOLDS.tuba,
  reach: 30 * MathUtils.DEG2RAD,
  reachL: 40 * MathUtils.DEG2RAD,
  play: holdTurn(0, 25),
  poleL: [-1, -0.5, -0.5],
  poleR: [1, -0.5, -0.5],
  rest: holdTurn(5, 20),
  restPoleL: [-1, -0.5, -0.5],
  restPoleR: [1, -0.5, -0.5],
} as const satisfies WindHold;

/**
 * The holds of the species that hold a wind instrument in their own way, in place of
 * {@link WIND_HOLDS} (design 5.3). The tools change them in memory with
 * `--set '<instrument>@<species>.<path>=<value>'` (`tools/hold-sets.ts`).
 */
export const SPECIES_WIND_HOLDS: Partial<
  Record<SpeciesId, Partial<Record<WindInstrument, WindHold>>>
> = {
  'fox-tan': { flute: FOX_FLUTE },
  panda: { trombone: PANDA_TROMBONE },
  mouse: { oboe: MOUSE_OBOE },
  beaver: { bassoon: BEAVER_BASSOON },
  pig: { horn: PIG_HORN },
  wolf: { clarinet: WOLF_CLARINET },
  monkey: { trumpet: MONKEY_TRUMPET },
  rhino: { tuba: RHINO_TUBA },
};

/**
 * Gives the hold of a wind instrument for a species: its own hold, or the hold of
 * {@link WIND_HOLDS}.
 *
 * @param species The species of the player.
 * @param instrument The instrument.
 * @returns The hold.
 */
export function windHoldOf(species: SpeciesId, instrument: WindInstrument): WindHold {
  return SPECIES_WIND_HOLDS[species]?.[instrument] ?? WIND_HOLDS[instrument];
}

/** The sizes of the body and the hand motion of the winds, in radians (design 5.3). */
export const WIND_BODY = {
  /** The spine leans back by this angle at the top of a breath in, at an amplitude of 1. */
  breath: 3 * MathUtils.DEG2RAD,
  /** The head lifts by this angle off the mouthpiece in the rest pose. */
  headLift: 12 * MathUtils.DEG2RAD,
  /** The curl of open fingers, and the extra curl of closed fingers. */
  curlOpen: 15 * MathUtils.DEG2RAD,
  curlClosed: 50 * MathUtils.DEG2RAD,
  /** The curl of a hand that only holds the instrument. */
  curlHold: 35 * MathUtils.DEG2RAD,
} as const;

const BONES = {
  chest: boneIndex('chest'),
  neck: boneIndex('neck'),
  head: boneIndex('head'),
  instrument: boneIndex('instrument'),
} as const;

/** The left paw of a wind player in the rest pose, off its grip (`WindHold.restFreeL`). */
type FreeRest = (
  | {
      /** A paw on the left thigh of a seated player. */
      readonly kind: 'lap';
      /** The place of the `hand` bone, in the model axes. */
      readonly wrist: Vec3;
      /** The world rotation of the `hand` bone, with the root in its bind pose. */
      readonly rotation: Quat;
    }
  | {
      /** The hanging arm of a standing player. */
      readonly kind: 'hang';
      /** The wrist, the hand, and the elbow of the hanging arm. */
      readonly hang: HangingArm;
    }
) & {
  /**
   * The move of the wrist away from the straight line to its grip at the middle of the change, in
   * meters in the model axes, with the root in its bind pose ({@link FreePaw.arc}).
   */
  readonly arc: Vec3;
};

/** One side of the body of a wind player in the bind pose. */
interface WindSide {
  readonly arm: ArmRig;
  /** The grip of the palm on the instrument, in the bind pose. */
  readonly grip: Vec3;
  /** Whether the grip is on the trombone slide. */
  readonly onSlide: boolean;
}

/**
 * The points of a wind player in the bind pose, in the model axes, that the pose needs at each
 * frame.
 */
export interface WindRig {
  readonly hold: WindHold;
  /** The bind position of the `instrument` bone: the mouthpiece at the mouth. */
  readonly pivot: Vec3;
  /** The move of the `instrument` bone in the rest pose, in meters, in the axes of the chest. */
  readonly restOffset: Vec3;
  readonly chestBind: Vec3;
  /** The bind positions of the `neck` and the `head` bones, around which the head turns. */
  readonly neckBind: Vec3;
  readonly headBind: Vec3;
  /** The move of the mouthpiece from the mouth, in meters (`WindHold.lipShift`). */
  readonly lip: Vec3;
  readonly left: WindSide;
  readonly right: WindSide;
  /** The left paw in the rest pose, or `null` when it stays on its grip. */
  readonly freeL: FreeRest | null;
  /** The unit direction of the trombone slide from the first position, or (0, 0, 0). */
  readonly slideAxis: Vec3;
  /**
   * The part of the slide travel that the right arm reaches, in meters. The seventh position is
   * out of reach of any probable arm, so the slide positions map into this travel (design 5.3).
   */
  readonly slideReach: number;
}

/**
 * Finds the bind point of a grip of a palm.
 *
 * @param model The player model.
 * @param grip The grip.
 * @returns The point.
 * @throws Error if the instrument has no grip of the palm.
 */
function gripPoint(model: PlayerModel, grip: PiecePoint | null): Vec3 {
  if (!grip) {
    throw new Error(`The ${model.instrument.id} has no grip of a palm.`);
  }
  return placePoint(model.pieces, grip);
}

/**
 * Finds the left paw of a wind player in the rest pose, off its grip: on the left thigh of a
 * seated player, or at the end of the hanging arm of a standing player.
 *
 * @param model The player model.
 * @param arm The left arm.
 * @param rest The free paw of the hold.
 * @returns The paw.
 */
function freeRestOf(model: PlayerModel, arm: ArmRig, rest: FreePaw): FreeRest {
  const h = model.body.headHeight;
  const [out, up, forward] = rest.arc;
  const arc: Vec3 = [-out * h, up * h, -forward * h];
  if (model.support === 'stand') {
    return { kind: 'hang', hang: hangingArm(model, arm), arc };
  }
  return { kind: 'lap', ...lapHand(model, arm, rest), arc };
}

/**
 * Gives the forward turn of the right shoulder bone of a hold.
 *
 * @param hold The hold.
 * @param out The quaternion to write.
 * @returns `out`, with the local rotation of `shoulderR`.
 */
function rightShoulderTurn(hold: WindHold, out: Quaternion): Quaternion {
  // A positive turn around y moves the right shoulder forward.
  return out.setFromAxisAngle(Y_AXIS, hold.reach);
}

/**
 * Gives the forward turn of the left shoulder bone of a hold.
 *
 * @param hold The hold.
 * @param out The quaternion to write.
 * @returns `out`, with the local rotation of `shoulderL`.
 */
function leftShoulderTurn(hold: WindHold, out: Quaternion): Quaternion {
  // A negative turn around y moves the left shoulder forward. The subtraction from 0 keeps a turn
  // of 0 at +0, so that a hold with no turn writes the same rotation as no turn.
  return out.setFromAxisAngle(Y_AXIS, 0 - hold.reachL);
}

/**
 * Finds the length of the slide travel that the right arm reaches in the playing pose, in steps
 * of 5 mm, with the chest in its bind pose. The slide turns with the playing rotation of the hold
 * around the mouthpiece, and the mouthpiece follows the mouth of a turned head ({@link placeWind}).
 *
 * @param rig The points of the player.
 * @param travel The full travel of the slide, in meters.
 * @returns The reached travel, in meters.
 */
function slideReachOf(rig: Omit<WindRig, 'slideReach'>, travel: number): number {
  if (!rig.right.onSlide || travel <= 0) {
    return 0;
  }
  const chest = { rotation: new Quaternion(), position: new Vector3(...rig.chestBind) };
  const arm = rig.right.arm;
  const turn = rightShoulderTurn(rig.hold, new Quaternion());
  const joint = poseShoulder(arm, chest, rig.chestBind, turn).position;
  const reach = arm.reach + new Vector3(...arm.palm).length();
  placeWind(rig, chest, 1);
  const grip = new Vector3();
  const axis = new Vector3(...rig.slideAxis);
  const bind = new Vector3(...rig.pivot);
  let reached = 0;
  for (let s = 0; s <= travel + 1e-9; s += 0.005) {
    grip.fromArray(rig.right.grip).addScaledVector(axis, s).sub(bind);
    if (grip.applyQuaternion(rotation).add(pivot).distanceTo(joint) > reach) {
      break;
    }
    reached = s;
  }
  return reached;
}

/**
 * Finds the points of a wind player that the pose needs.
 *
 * @param model A player with a woodwind or a brass instrument.
 * @param instrument The instrument of the model.
 * @param hold The hold of the instrument (`windHoldOf()`). The hold of {@link WIND_HOLDS} by
 *   default.
 * @returns The rig.
 * @throws Error if the instrument has no grip of a palm, or if it does not hang on the chest.
 */
export function windRig(
  model: PlayerModel,
  instrument: WindInstrument,
  hold: WindHold = WIND_HOLDS[instrument],
): WindRig {
  const { positions, parents } = model.skeleton;
  if (parents[BONES.instrument] !== BONES.chest) {
    throw new Error(`The ${instrument} does not hang on the chest.`);
  }
  const at = (bone: number): Vec3 => positions[bone] ?? [0, 0, 0];
  const side = (s: 'L' | 'R'): WindSide => {
    const grip = s === 'L' ? model.instrument.grips.palmL : model.instrument.grips.palmR;
    return {
      arm: armRig(model, s),
      grip: gripPoint(model, grip),
      onSlide: grip?.bone === 'slide',
    };
  };
  const slide = model.instrument.targets.find((t) => t.kind === 'slide');
  const slideAt = (point: Vec3): Vector3 =>
    new Vector3(...placePoint(model.pieces, { bone: 'slide', at: point }));
  const travelVector = slide ? slideAt(slide.to).sub(slideAt(slide.from)) : new Vector3();
  const left = side('L');
  const rig = {
    hold,
    pivot: at(BONES.instrument),
    restOffset: toVec3(new Vector3(...hold.restShift).multiplyScalar(model.body.headHeight)),
    chestBind: at(BONES.chest),
    neckBind: at(BONES.neck),
    headBind: at(BONES.head),
    lip: toVec3(new Vector3(...hold.lipShift).multiplyScalar(model.body.headHeight)),
    left,
    right: side('R'),
    freeL: hold.restFreeL ? freeRestOf(model, left.arm, hold.restFreeL) : null,
    slideAxis: toVec3(travelVector.clone().normalize()),
  };
  return { ...rig, slideReach: slideReachOf(rig, travelVector.length()) };
}

/** The pose of a wind player that is not in the rotations of its bones. */
export interface WindPoseOut {
  /** The rotations of the pose to write. */
  readonly rotations: Float32Array;
  /** The move of the `slide` bone, in the axes of the `instrument` bone. */
  slideOffset: [number, number, number];
  /** The move of the `instrument` bone, in the axes of the chest. */
  instrumentOffset: [number, number, number];
}

/**
 * Gives the curl of the fingers of one hand.
 *
 * @param closed The close of the fingers, from 0 to 1, or -1 for a hand that only holds.
 * @param weight The weight of the playing pose.
 * @returns The curl angle.
 */
function curlOf(closed: number, weight: number): number {
  const b = WIND_BODY;
  const playing = closed < 0 ? b.curlHold : b.curlOpen + (b.curlClosed - b.curlOpen) * closed;
  return b.curlHold + (playing - b.curlHold) * weight;
}

const local = new Quaternion();
const playTurn = new Quaternion();
const rotation = new Quaternion();
const pivot = new Vector3();
const shift = new Vector3();
const turned = new Vector3();
const pivotBind = new Vector3();
const slide = new Vector3();
const rightTurn = new Quaternion();
const leftTurn = new Quaternion();
const shoulder = createFrame();
const grip = new Vector3();
const hand = new Quaternion();
const palm = new Vector3();
const restWrist = new Vector3();
const restHand = new Quaternion();
const arcMove = new Vector3();
const ORIGIN = [0, 0, 0] as const;

const tubeSide = new Vector3();
const tubeAxis = new Vector3();
const aimFrom = new Vector3();
const aimPoint = new Vector3();
const handAxis = new Vector3();
const palmNow = new Vector3();
const palmGoal = new Vector3();
const palmRoll = new Quaternion();
const NO_ROLL = new Quaternion();

/**
 * Rolls a hand around its own long axis, the line from its shoulder to its grip, until the normal
 * of its palm faces the tube. The grip of a woodwind lies below the tube, on the side away from
 * the keys, so the tube lies along the up direction of the instrument from the grip. The x axis
 * of the hand of the player is the normal of its palm, out of the back on the left hand and out of
 * the palm on the right hand: with the other signs, the left palm cupped up, away from the tube.
 *
 * The roll grows with the weight of the playing pose, so that the rest pose keeps the paw of the
 * shoulder, and the lift and the lowering do not turn the paw through the far side of its forearm.
 *
 * @param out The world rotation of the hand, which the function changes.
 * @param toTube The unit direction from the grip to the tube.
 * @param side The side of the hand.
 * @param weight The eased weight of the playing pose: 0 is the rest pose.
 */
function palmToTube(out: Quaternion, toTube: Vector3, side: 'L' | 'R', weight: number): void {
  handAxis.set(0, 1, 0).applyQuaternion(out);
  palmNow
    .set(side === 'L' ? -1 : 1, 0, 0)
    .applyQuaternion(out)
    .projectOnPlane(handAxis);
  palmGoal.copy(toTube).projectOnPlane(handAxis);
  if (palmNow.lengthSq() < 1e-8 || palmGoal.lengthSq() < 1e-8) {
    return;
  }
  palmRoll.setFromUnitVectors(palmNow.normalize(), palmGoal.normalize());
  out.premultiply(palmRoll.slerp(NO_ROLL, 1 - weight));
}

/**
 * Gives the point at which a paw on its grip aims ({@link handToward}): the grip, moved along the
 * tube toward the line across the tube through the shoulder by the share `across` of the playing
 * pose. The paw then points across the tube, so that its fingers wrap the tube as a real hand
 * does, and not along the tube past it.
 *
 * @param from The posed `shoulder` bone.
 * @param target The posed grip of the palm.
 * @param axis The unit direction of the tube.
 * @param across The share of the part of the aim along the tube that goes.
 * @param out The point to write.
 * @returns `out`.
 */
function aimAcross(
  from: Frame,
  target: Vector3,
  axis: Vector3,
  across: number,
  out: Vector3,
): Vector3 {
  aimFrom.subVectors(from.position, target);
  return out
    .copy(axis)
    .multiplyScalar(aimFrom.dot(axis) * across)
    .add(target);
}

/**
 * Writes one arm and its fingers on the grip of the instrument. A paw that is free in the rest pose
 * moves from its rest place to its grip by the weight of the playing pose.
 *
 * @param rig The points of the player.
 * @param side The side of the body.
 * @param frames The posed frames of the root and of the chest.
 * @param turn The local rotation of the `shoulder` bone.
 * @param pole The direction to which the elbow points.
 * @param curl The curl of the fingers.
 * @param free The paw in the rest pose off its grip, or `null` for a palm that stays on its grip.
 * @param weight The eased weight of the playing pose: 0 is the rest pose.
 * @param rotations The rotations of the pose to write.
 */
function poseSide(
  rig: WindRig,
  side: WindSide,
  frames: TorsoFrames,
  turn: Quaternion,
  pole: Vec3,
  curl: number,
  free: FreeRest | null,
  weight: number,
  rotations: Float32Array,
): void {
  const { chest, root } = frames;
  grip.fromArray(side.grip);
  if (side.onSlide) {
    grip.add(slide);
  }
  grip.sub(pivotBind.fromArray(rig.pivot)).applyQuaternion(rotation).add(pivot);
  poseShoulder(side.arm, chest, rig.chestBind, turn, shoulder);
  // A paw that leaves its grip at rest keeps the aim and the roll of its shoulder: with the roll,
  // the mix from its rest paw flipped to the other side of its forearm in the middle of the move.
  if (rig.hold.palmToTube && !free) {
    tubeAxis
      .fromArray(rig.right.grip)
      .sub(aimFrom.fromArray(rig.left.grip))
      .applyQuaternion(rotation)
      .normalize();
    handToward(
      shoulder,
      aimAcross(shoulder, grip, tubeAxis, rig.hold.aimAcross * weight, aimPoint),
      hand,
    );
    palmToTube(hand, tubeSide.set(0, 1, 0).applyQuaternion(rotation), side.arm.side, weight);
  } else {
    handToward(shoulder, grip, hand);
  }
  const wrist = grip.sub(palm.fromArray(side.arm.palm).applyQuaternion(hand));

  // In the playing pose, the paw is on its grip with no mix, so that the pose is the pose of the
  // grip with no free paw.
  if (free && weight < 1) {
    // A paw on the thigh follows the root, and a hanging arm follows its shoulder.
    if (free.kind === 'lap') {
      posePoint(root, ORIGIN, free.wrist, restWrist);
      restHand.fromArray(free.rotation).premultiply(root.rotation);
    } else {
      hangingWrist(free.hang, shoulder, restWrist);
      hangingHand(free.hang, shoulder, restHand);
    }
    wrist.lerpVectors(restWrist, wrist, weight);
    wrist.add(
      arcMove
        .fromArray(free.arc)
        .applyQuaternion(root.rotation)
        .multiplyScalar(4 * weight * (1 - weight)),
    );
    mixRotation(restHand, hand, weight, hand);
  }

  writeArm({ arm: side.arm, shoulder, wrist, hand, pole }, chest.rotation, rotations);
  setBoneRotation(rotations, side.arm.bones.shoulder, turn);
  writeCurl(side.arm, curl, rotations);
}

const poleMix = new Vector3();
const polePlay = new Vector3();
const poleTuple: [number, number, number] = [0, 0, 0];

/**
 * Mixes the direction of an elbow in the rest pose with its direction while the player plays.
 *
 * @param rest The direction in the rest pose.
 * @param play The direction while the player plays.
 * @param weight The weight of the playing pose.
 * @returns The mixed unit direction, in a module tuple that the next call writes again.
 */
function mixPole(rest: Vec3, play: Vec3, weight: number): Vec3 {
  mixDirection(poleMix.fromArray(rest), polePlay.fromArray(play), weight, poleMix);
  return poleMix.toArray(poleTuple);
}

/**
 * Places the instrument of a wind player: the local rotation of the `instrument` bone, its world
 * rotation, its move in the axes of the chest, and the posed place of the mouthpiece. The
 * instrument turns from its rest rotation to its playing rotation around the mouthpiece. In the
 * rest pose, it comes down from the mouth by the rest move. While the player plays, it moves with
 * the mouth of a head that the hold turns. It writes the module scratch objects `local`,
 * `rotation`, `shift`, and `pivot`.
 *
 * @param rig The points of the player.
 * @param chest The posed frame of the chest.
 * @param weight The eased weight of the playing pose: 0 is the rest pose.
 */
function placeWind(rig: Omit<WindRig, 'slideReach'>, chest: Frame, weight: number): void {
  mixRotation(local.fromArray(rig.hold.rest), playTurn.fromArray(rig.hold.play), weight, local);
  rotation.multiplyQuaternions(chest.rotation, local);
  // In the rest pose, the instrument comes down from the mouth to the lap. While the player
  // plays, the mouthpiece follows the mouth of a turned head.
  shift.fromArray(turnedMouth(rig, rig.hold.headTurn * weight)).sub(turned.fromArray(rig.pivot));
  shift.addScaledVector(turned.fromArray(rig.restOffset), 1 - weight);
  posePoint(chest, rig.chestBind, rig.pivot, pivot).add(
    turned.copy(shift).applyQuaternion(chest.rotation),
  );
}

const neckTurn = new Quaternion();
const headTurn = new Quaternion();
const neckBind = new Vector3();
const mouth = new Vector3();
const mouthTuple: [number, number, number] = [0, 0, 0];

/**
 * Gives the place of the mouthpiece at the mouth after a turn of the head around y, in the bind
 * axes of the chest, with the move of the hold from the mouth (`WindRig.lip`):
 * the neck turns {@link NECK_SHARE} of the angle around its joint, and the head the rest around
 * its joint, as the look of the body layer turns them (`writeBody()` of `pose-at.ts`). The mouth
 * of the bind pose is the bind place of the mouthpiece.
 *
 * @param rig The points of the player.
 * @param yaw The turn of the head to the left, in radians.
 * @returns The place, in a module tuple that the next call writes again.
 */
function turnedMouth(rig: Omit<WindRig, 'slideReach'>, yaw: number): Vec3 {
  neckTurn.setFromAxisAngle(Y_AXIS, yaw * NECK_SHARE);
  headTurn.setFromAxisAngle(Y_AXIS, yaw);
  neckBind.fromArray(rig.neckBind);
  mouth
    .fromArray(rig.pivot)
    .add(turned.fromArray(rig.lip))
    .sub(turned.fromArray(rig.headBind))
    .applyQuaternion(headTurn);
  turned.fromArray(rig.headBind).sub(neckBind).applyQuaternion(neckTurn).add(neckBind);
  return mouth.add(turned).toArray(mouthTuple);
}

/** The posed place of each grip of a wind instrument and of the shoulder joint that reaches it. */
interface WindGrip {
  /** The shoulder joint, at the start of the upper arm. */
  readonly joint: Vec3;
  /** The grip of the palm on the instrument. */
  readonly grip: Vec3;
}

/**
 * Gives the posed grips of a wind player and the shoulder joints that reach them, with the chest
 * in its bind pose (design 4.6, 5.3). The arm reaches a grip when the distance from the joint to
 * the grip is at most the length of the arm. `pnpm hold-reach --instrument flute` reads it.
 *
 * @param rig The points of the player.
 * @param weight The weight of the playing pose: 0 is the rest pose, 1 the playing pose.
 * @returns The grip and the joint of each side.
 */
export function windGrips(rig: WindRig, weight: number): Readonly<Record<'L' | 'R', WindGrip>> {
  const chest = { rotation: new Quaternion(), position: new Vector3(...rig.chestBind) };
  placeWind(rig, chest, weight);
  const side = (s: WindSide, turn: Quaternion): WindGrip => {
    const at = new Vector3(...s.grip)
      .sub(new Vector3(...rig.pivot))
      .applyQuaternion(rotation)
      .add(pivot);
    const joint = poseShoulder(s.arm, chest, rig.chestBind, turn).position;
    return { joint: toVec3(joint), grip: toVec3(at) };
  };
  return {
    L: side(rig.left, leftShoulderTurn(rig.hold, new Quaternion())),
    R: side(rig.right, rightShoulderTurn(rig.hold, new Quaternion())),
  };
}

/**
 * Writes the arms, the fingers, the instrument, and the slide of a wind player (design 5.3,
 * 4.7). The mouthpiece stays at the mouth, because the head and the instrument both follow the
 * chest. The palms stay on their grips, also in the rest pose, and the two-bone IK places each
 * arm. A hold can free the left paw in the rest pose (`WindHold.restFreeL`). The fingers close
 * for the pitch. The trombone slide moves along its axis.
 *
 * The caller writes the breath into the spine, and the head lift of the rest pose into the neck
 * and the head, before it calculates the frames.
 *
 * @param rig The points of the player.
 * @param frames The posed frames of the root and of the chest.
 * @param state The fingers, the slide, and the breath at the song time of the note layer.
 * @param weight The eased weight of the playing pose: 0 is the rest pose (5.2, 5.5).
 * @param out The pose to write.
 */
export function poseWind(
  rig: WindRig,
  frames: TorsoFrames,
  state: WindState,
  weight: number,
  out: WindPoseOut,
): void {
  const chest = frames.chest;
  placeWind(rig, chest, weight);
  slide.fromArray(rig.slideAxis).multiplyScalar(state.slide * rig.slideReach * weight);
  const { hold } = rig;
  const { freeL } = rig;
  const left = curlOf(state.fingersL, weight);
  const restPoleL = freeL?.kind === 'hang' ? freeL.hang.pole : hold.restPoleL;
  const poleL = mixPole(restPoleL, hold.poleL, weight);
  leftShoulderTurn(hold, leftTurn);
  poseSide(rig, rig.left, frames, leftTurn, poleL, left, freeL, weight, out.rotations);
  const right = curlOf(state.fingersR, weight);
  rightShoulderTurn(hold, rightTurn);
  const poleR = mixPole(hold.restPoleR, hold.poleR, weight);
  poseSide(rig, rig.right, frames, rightTurn, poleR, right, null, weight, out.rotations);
  setBoneRotation(out.rotations, BONES.instrument, local);
  slide.toArray(out.slideOffset);
  shift.toArray(out.instrumentOffset);
}
