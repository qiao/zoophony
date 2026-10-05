import {
  DEG,
  IDENTITY,
  add,
  axisAngle,
  basisRotation,
  cross,
  dot,
  invert,
  length,
  multiply,
  normalize,
  reject,
  rotate,
  scale,
  sub,
} from '../models/math.ts';
import type { Quat, Vec3 } from '../models/math.ts';
import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import { placePoint } from '../models/instruments/hold.ts';
import type { InstrumentId, PlayTarget, PlayTargetKind } from '../models/instruments/types.ts';
import { mix, mixRotation } from './blend.ts';
import { posePoint, setBoneRotation } from './frames.ts';
import type { Frame } from './frames.ts';
import { solveArm } from './ik.ts';
import type { ArmBind } from './ik.ts';
import { smoothstep } from './rest.ts';
import type { BowRange, BowState } from './strokes.ts';
import { TUNINGS } from './strokes.ts';

/** The bowed strings of design 4.6. */
export type BowedInstrument = keyof typeof TUNINGS;

/**
 * Tells whether an instrument is a bowed string.
 *
 * @param id The instrument.
 * @returns Whether it is the violin, the viola, the cello, or the contrabass.
 */
export function isBowed(id: InstrumentId): id is BowedInstrument {
  return id === 'violin' || id === 'viola' || id === 'cello' || id === 'contrabass';
}

/**
 * The values of the hold of each bowed string (design 4.6, 4.7). The directions are in the model
 * axes of the bind pose: the player faces -z, and its left is -x.
 */
export interface BowedHold {
  /** The bow tip points to this side of the strings, across them. */
  readonly tip: Vec3;
  /** The left fingers point to this side of the neck. */
  readonly fingers: Vec3;
  /** The directions to which the elbows point. */
  readonly poleL: Vec3;
  readonly poleR: Vec3;
  /** The bow tip points to this side in pizzicato, as the plucking hand holds it. */
  readonly pizzicatoTip: Vec3;
  /**
   * The turn of the bow around the strings from one string to the next. A positive turn moves
   * the bow to the low strings on the bass side: `top × axis`, the left of the strings for a
   * viewer at the bridge who looks to the scroll with the top plate up.
   */
  readonly stringTurn: number;
  /**
   * The turn of the bow in the plane of the strings, from square across them. The frog comes
   * nearer to the right shoulder, so that the short arms of the animals reach the strings.
   */
  readonly slant: number;
  /** The forward turn of the right shoulder bone around y, so that the arm reaches further. */
  readonly reach: number;
  /** The forward lean of the spine. It brings the shoulders nearer to a floor instrument. */
  readonly lean: number;
  /**
   * The place of the pluck: 0 at the end of the fingerboard, 1 at the bow contact point. The
   * right palm is above it.
   */
  readonly pluckPlace: number;
  /**
   * The rest pose of the instrument: its axis and the side of its top plate. `null` keeps the
   * instrument in its playing place, as the cello and the contrabass stand on the floor.
   */
  readonly rest: { readonly axis: Vec3; readonly top: Vec3 } | null;
}

/** The violin and the viola share their hold under the chin. */
const CHIN_HOLD = {
  tip: [0, 1, 0],
  fingers: [0, 1, 0],
  poleL: [-0.3, -1, 0],
  poleR: [1, -1, 0.3],
  pizzicatoTip: [0.3, 1, 0.4],
  stringTurn: 9 * DEG,
  slant: -20 * DEG,
  reach: 10 * DEG,
  lean: 0,
  pluckPlace: 0.9,
  rest: { axis: [-0.3, -0.55, -0.78], top: [1, 0.2, 0] },
} as const satisfies BowedHold;

/** The cello and the contrabass share their hold on the floor. */
const FLOOR_HOLD = {
  tip: [-1, 0, 0],
  fingers: [1, 0, 0],
  poleL: [-1, 0, 0.3],
  poleR: [1, -0.6, 0.3],
  pizzicatoTip: [1, 0.8, 0.5],
  stringTurn: 9 * DEG,
  slant: -20 * DEG,
  reach: 10 * DEG,
  lean: 15 * DEG,
  pluckPlace: 0.3,
  rest: null,
} as const satisfies BowedHold;

/** The holds of the bowed strings. */
export const BOWED_HOLDS = {
  violin: CHIN_HOLD,
  viola: { ...CHIN_HOLD, reach: 30 * DEG },
  cello: FLOOR_HOLD,
  contrabass: { ...FLOOR_HOLD, stringTurn: 7 * DEG, reach: 30 * DEG, lean: 20 * DEG },
} as const satisfies Readonly<Record<BowedInstrument, BowedHold>>;

/** The sizes of the hand motion of the bowed strings, in meters and radians (design 5.3). */
export const BOWED_HANDS = {
  /** The right palm is this high above the strings to pluck. */
  pluckHeight: 0.035,
  /** The plucking hand moves this far to each side of the strings, at a gesture size of 1. */
  pluck: 0.012,
  /** The curl of the left fingers, and the extra curl of a press at the note start. */
  curlL: 40 * DEG,
  pressL: 15 * DEG,
  /** The curl of the right fingers around the bow. */
  curlR: 30 * DEG,
} as const;

/** The share of the arm length that a bow hand may reach, so that the elbow keeps a bend. */
const REACH = 0.97;

/** The free part of the bow hair at each end, in meters. */
const HAIR_END = 0.03;

const BONES = {
  spine: boneIndex('spine'),
  chest: boneIndex('chest'),
  instrument: boneIndex('instrument'),
  shoulderR: boneIndex('shoulderR'),
  upperArmL: boneIndex('upperArmL'),
  forearmL: boneIndex('forearmL'),
  handL: boneIndex('handL'),
  fingersL: boneIndex('fingersL'),
  upperArmR: boneIndex('upperArmR'),
  forearmR: boneIndex('forearmR'),
  handR: boneIndex('handR'),
  fingersR: boneIndex('fingersR'),
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
  /** The bind positions of the `spine`, the `chest`, and the `shoulderR` bones. */
  readonly spineBind: Vec3;
  readonly chestBind: Vec3;
  readonly clavicleR: Vec3;
  /** The point on the strings where the bow plays. */
  readonly contact: Vec3;
  /** The unit direction from the tail end to the scroll. */
  readonly axis: Vec3;
  /** The unit normal of the top plate, to the strings. */
  readonly top: Vec3;
  /** The unit direction across the strings to the side of the bow tip. */
  readonly across: Vec3;
  /** The unit direction across the neck to which the left fingers point. */
  readonly fingers: Vec3;
  /** The left palm in its grip under the neck, and its place on the target `fingerboard`. */
  readonly grip: Vec3;
  readonly gripPlace: number;
  /** The vector of the target `fingerboard`, from the nut to the end of the fingerboard. */
  readonly neck: Vec3;
  /** The point on the strings above which the right hand plucks. */
  readonly pluck: Vec3;
  /** The start of the bow hair at the frog, from the `handR` bone. */
  readonly hairStart: Vec3;
  readonly hairLength: number;
  /** The rotation that turns the bow axes (along the hair, to the strings) to the bind pose. */
  readonly bowAlign: Quat;
  /** The palms, from their hand bones. */
  readonly palmL: Vec3;
  readonly palmR: Vec3;
  readonly armL: ArmBind;
  readonly armR: ArmBind;
  /** The rotation of the `instrument` bone in the rest pose, relative to its parent. */
  readonly restRotation: Quat;
  /** The part of the bow hair that the bow arm reaches on all strings (design 5.3). */
  readonly bowRange: BowRange;
}

/** The points of a rig before its bow range. */
type RigPoints = Omit<BowedRig, 'bowRange'>;

/** The frames of the torso that the arms of a player hang from. */
export interface TorsoFrames {
  readonly root: Frame;
  readonly chest: Frame;
}

/** The instrument at its posed place. */
interface InstrumentPlace {
  /** The rotation of the `instrument` bone relative to its parent. */
  readonly local: Quat;
  /** The world rotation of the instrument and the posed place of its bone. */
  readonly rotation: Quat;
  readonly pivot: Vec3;
}

/** The strings of an instrument at their posed place. */
interface StringsPlace {
  /** The point on the strings where the bow plays. */
  readonly contact: Vec3;
  readonly axis: Vec3;
  readonly top: Vec3;
  /** The direction across the strings to the side of the bow tip. */
  readonly across: Vec3;
}

/** The bow hand that puts the bow hair on the strings. */
interface BowHand {
  readonly wrist: Vec3;
  /** The world rotation of the `handR` bone. */
  readonly rotation: Quat;
}

/** The right shoulder after the forward turn of the reach. */
interface ShoulderPlace {
  /** The world rotation of the `shoulderR` bone. */
  readonly rotation: Quat;
  /** The posed place of the `upperArmR` bone. */
  readonly joint: Vec3;
}

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
function toSide(v: Vec3, prefer: Vec3): Vec3 {
  const unit = normalize(v);
  return dot(unit, prefer) < 0 ? scale(unit, -1) : unit;
}

/**
 * Places the instrument: the violin and the viola go down in the rest pose.
 *
 * @param rig The points of the player.
 * @param frames The posed frames of the torso.
 * @param weight The weight of the playing pose.
 * @returns The place of the instrument.
 */
function instrumentAt(rig: RigPoints, frames: TorsoFrames, weight: number): InstrumentPlace {
  const parent = rig.parent === BONES.chest ? frames.chest : frames.root;
  const local = mixRotation(rig.restRotation, IDENTITY, weight);
  return {
    local,
    rotation: multiply(parent.rotation, local),
    pivot: posePoint(parent, rig.parentBind, rig.pivot),
  };
}

/**
 * Moves a bind point of the instrument to its posed place.
 *
 * @param rig The points of the player.
 * @param place The place of the instrument.
 * @param point The bind point.
 * @returns The posed point.
 */
function onInstrument(rig: RigPoints, place: InstrumentPlace, point: Vec3): Vec3 {
  return add(place.pivot, rotate(place.rotation, sub(point, rig.pivot)));
}

/**
 * Gives the strings at the place of the instrument.
 *
 * @param rig The points of the player.
 * @param place The place of the instrument.
 * @returns The strings.
 */
function stringsAt(rig: RigPoints, place: InstrumentPlace): StringsPlace {
  return {
    contact: onInstrument(rig, place, rig.contact),
    axis: rotate(place.rotation, rig.axis),
    top: rotate(place.rotation, rig.top),
    across: rotate(place.rotation, rig.across),
  };
}

/**
 * Turns the right shoulder bone forward, so that the bow arm reaches the strings.
 *
 * @param rig The points of the player.
 * @param chest The posed frame of the chest.
 * @param weight The weight of the playing pose.
 * @returns The shoulder.
 */
function shoulderAt(rig: RigPoints, chest: Frame, weight: number): ShoulderPlace {
  const rotation = multiply(chest.rotation, axisAngle([0, 1, 0], rig.hold.reach * weight));
  const clavicle = posePoint(chest, rig.chestBind, rig.clavicleR);
  return {
    rotation,
    joint: add(clavicle, rotate(rotation, sub(rig.armR.shoulder, rig.clavicleR))),
  };
}

/**
 * Places the bow hand so that the bow hair lies on a string, with a place of the hair on the
 * contact point. The string turns the bow around the strings, and the slant turns it in the
 * plane of the strings.
 *
 * @param rig The points of the player.
 * @param strings The strings at their posed place.
 * @param string The string, from 0 (the lowest) to 3.
 * @param bow The place of the contact point on the hair, in meters from the frog end.
 * @param lift The distance of the hair above the strings.
 * @returns The wrist and the rotation of the hand.
 */
function bowHandAt(
  rig: RigPoints,
  strings: StringsPlace,
  string: number,
  bow: number,
  lift: number,
): BowHand {
  const turn = axisAngle(strings.axis, (string - 1.5) * rig.hold.stringTurn);
  const top = rotate(turn, strings.top);
  const along = rotate(axisAngle(top, rig.hold.slant), rotate(turn, strings.across));
  const rotation = multiply(basisRotation(along, scale(top, -1)), rig.bowAlign);
  const wrist = sub(
    add(strings.contact, scale(top, lift)),
    add(rotate(rotation, rig.hairStart), scale(along, bow)),
  );
  return { wrist, rotation };
}

/**
 * Gives the frames of the torso in the playing pose with no idle motion: the bind pose with the
 * lean of the hold.
 *
 * @param rig The points of the player.
 * @returns The frames.
 */
function playingFrames(rig: RigPoints): TorsoFrames {
  const lean = axisAngle([1, 0, 0], -rig.hold.lean);
  return {
    root: { rotation: IDENTITY, position: [0, 0, 0] },
    chest: {
      rotation: lean,
      position: add(rig.spineBind, rotate(lean, sub(rig.chestBind, rig.spineBind))),
    },
  };
}

/**
 * Finds the part of the bow hair that the bow arm reaches on all strings in the playing pose. A
 * small player cannot reach the tip of a long bow.
 *
 * @param rig The points of the player.
 * @returns The longest reached part of the hair, in meters from the frog end. If the arm reaches
 *   no part, the 0.04 m around the nearest place.
 */
function bowRangeOf(rig: RigPoints): BowRange {
  const frames = playingFrames(rig);
  const strings = stringsAt(rig, instrumentAt(rig, frames, 1));
  const shoulder = shoulderAt(rig, frames.chest, 1).joint;
  const arm = rig.armR;
  const reach = REACH * (length(sub(arm.elbow, arm.shoulder)) + length(sub(arm.wrist, arm.elbow)));
  const step = 0.005;
  const end = rig.hairLength - HAIR_END + 1e-9;
  let best: [number, number] | null = null;
  let start = -1;
  let nearest = HAIR_END;
  let nearestDistance = Infinity;
  for (let bow = HAIR_END; bow <= end; bow += step) {
    const distance = Math.max(
      length(sub(bowHandAt(rig, strings, 0, bow, 0).wrist, shoulder)),
      length(sub(bowHandAt(rig, strings, 3, bow, 0).wrist, shoulder)),
    );
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = bow;
    }
    const reached = distance <= reach;
    if (reached && start < 0) {
      start = bow;
    }
    if (start >= 0 && (!reached || bow + step > end)) {
      const stop = reached ? bow : bow - step;
      if (!best || stop - start > best[1] - best[0]) {
        best = [start, stop];
      }
      start = -1;
    }
  }
  return best ?? [Math.max(0, nearest - 0.02), nearest + 0.02];
}

/**
 * Finds the points of a bowed string player that the pose needs.
 *
 * @param model A player with a violin, a viola, a cello, or a contrabass.
 * @param instrument The instrument of the model.
 * @returns The rig.
 * @throws Error if the instrument has no bow, no target of a bowed string, or no left palm grip.
 */
export function bowedRig(model: PlayerModel, instrument: BowedInstrument): BowedRig {
  const hold = BOWED_HOLDS[instrument];
  const { positions, parents } = model.skeleton;
  const at = (bone: number): Vec3 => positions[bone] ?? [0, 0, 0];
  const pieceRotation = (bone: 'instrument' | 'bow'): Quat => {
    const placed = model.pieces.find((p) => p.piece.bone === bone);
    if (!placed) {
      throw new Error(`The ${instrument} has no piece on the bone "${bone}".`);
    }
    return placed.at.rotation;
  };
  const contactTarget = targetOf(model, 'bow-contact');
  const board = targetOf(model, 'fingerboard');
  const hair = targetOf(model, 'bow-hair');
  const palm = model.instrument.grips.palmL;
  if (!palm) {
    throw new Error(`The ${instrument} has no grip of the left palm.`);
  }

  const contact = placePoint(model.pieces, { bone: 'instrument', at: contactTarget.from });
  const top = normalize(rotate(pieceRotation('instrument'), contactTarget.normal));
  const nut = placePoint(model.pieces, { bone: 'instrument', at: board.from });
  const neckEnd = placePoint(model.pieces, { bone: 'instrument', at: board.to });
  const neck = sub(neckEnd, nut);
  const axis = normalize(scale(neck, -1));
  const grip = placePoint(model.pieces, palm);
  const hairFrom = placePoint(model.pieces, { bone: 'bow', at: hair.from });
  const hairTo = placePoint(model.pieces, { bone: 'bow', at: hair.to });
  const hairAxis = normalize(sub(hairTo, hairFrom));
  const hairNormal = normalize(rotate(pieceRotation('bow'), hair.normal));

  const parent = parents[BONES.instrument] ?? 0;
  let restRotation = IDENTITY;
  if (hold.rest) {
    const restAxis = normalize(hold.rest.axis);
    const restTop = normalize(reject(hold.rest.top, restAxis));
    restRotation = multiply(basisRotation(restAxis, restTop), invert(basisRotation(axis, top)));
  }
  const arm = (side: 'L' | 'R'): ArmBind => ({
    shoulder: at(boneIndex(`upperArm${side}`)),
    elbow: at(boneIndex(`forearm${side}`)),
    wrist: at(boneIndex(`hand${side}`)),
  });
  const rig: RigPoints = {
    hold,
    pivot: at(BONES.instrument),
    parent,
    parentBind: at(parent),
    spineBind: at(BONES.spine),
    chestBind: at(BONES.chest),
    clavicleR: at(BONES.shoulderR),
    contact,
    axis,
    top,
    across: toSide(cross(top, axis), hold.tip),
    fingers: toSide(cross(top, axis), hold.fingers),
    grip,
    gripPlace: dot(sub(grip, nut), neck) / dot(neck, neck),
    neck,
    pluck: add(neckEnd, scale(sub(contact, neckEnd), hold.pluckPlace)),
    hairStart: sub(hairFrom, at(BONES.handR)),
    hairLength: length(sub(hairTo, hairFrom)),
    bowAlign: invert(basisRotation(hairAxis, hairNormal)),
    palmL: sub(model.body.palmL, at(BONES.handL)),
    palmR: sub(model.body.palmR, at(BONES.handR)),
    armL: arm('L'),
    armR: arm('R'),
    restRotation,
  };
  return { ...rig, bowRange: bowRangeOf(rig) };
}

/** One arm to solve: the bind joints, the posed shoulder joint, and the targets of the hand. */
interface ArmTask {
  readonly bind: ArmBind;
  readonly joint: Vec3;
  /** The world rotation of the parent of the upper arm. */
  readonly parent: Quat;
  readonly wrist: Vec3;
  readonly hand: Quat;
  readonly pole: Vec3;
  readonly bones: readonly [upper: number, lower: number, hand: number];
}

/**
 * Solves one arm and writes the local rotations of its three bones.
 *
 * @param task The arm.
 * @param chest The world rotation of the chest, which turns the pole.
 * @param rotations The rotations of the pose to write.
 */
function writeArm(task: ArmTask, chest: Quat, rotations: Float32Array): void {
  const arm = solveArm(task.bind, task.joint, task.parent, task.wrist, rotate(chest, task.pole));
  const [upper, lower, hand] = task.bones;
  setBoneRotation(rotations, upper, multiply(invert(task.parent), arm.upper));
  setBoneRotation(rotations, lower, multiply(invert(arm.upper), arm.lower));
  setBoneRotation(rotations, hand, multiply(invert(arm.lower), task.hand));
}

/**
 * Writes the arms and the instrument of a bowed string player (design 5.3, 4.7). The bow plays
 * on the strings at the place of the bow state, on the string of the stroke, and lifts in a rest.
 * Pizzicato moves the right hand over the strings near the end of the fingerboard to pluck. The
 * left palm moves along the neck to the place of the note. The two-bone IK places each arm. In
 * the rest pose, the violin and the viola go down, the left hand keeps the neck, and the bow arm
 * hangs.
 *
 * The caller writes the lean of the hold into the spine before it calculates the frames.
 *
 * @param rig The points of the player.
 * @param frames The posed frames of the root and of the chest.
 * @param state The bow state at the song time of the note layer.
 * @param weight The eased weight of the playing pose: 0 is the rest pose (5.2, 5.5).
 * @param rotations The rotations of the pose to write.
 */
export function poseBowed(
  rig: BowedRig,
  frames: TorsoFrames,
  state: BowState,
  weight: number,
  rotations: Float32Array,
): void {
  const h = BOWED_HANDS;
  const chest = frames.chest;
  const place = instrumentAt(rig, frames, weight);
  const strings = stringsAt(rig, place);
  const bowHand = bowHandAt(rig, strings, state.string, state.bow, state.lift);

  // Pizzicato: the right palm above the strings, with the bow tip up.
  const tip = normalize(reject(rotate(chest.rotation, rig.hold.pizzicatoTip), strings.axis));
  const pluckHand = multiply(basisRotation(tip, normalize(cross(tip, strings.axis))), rig.bowAlign);
  const pluckPalm = add(
    add(onInstrument(rig, place, rig.pluck), scale(strings.top, h.pluckHeight)),
    scale(strings.across, state.pluck * h.pluck * state.gesture),
  );
  const pluckWrist = sub(pluckPalm, rotate(pluckHand, rig.palmR));

  // The bow arm hangs from the shoulder in the rest pose.
  const shoulder = shoulderAt(rig, chest, weight);
  const pizzicato = smoothstep(state.pizzicato);
  const hanging = add(
    shoulder.joint,
    rotate(shoulder.rotation, sub(rig.armR.wrist, rig.armR.shoulder)),
  );
  writeArm(
    {
      bind: rig.armR,
      joint: shoulder.joint,
      parent: shoulder.rotation,
      wrist: mix(hanging, mix(bowHand.wrist, pluckWrist, pizzicato), weight),
      hand: mixRotation(
        shoulder.rotation,
        mixRotation(bowHand.rotation, pluckHand, pizzicato),
        weight,
      ),
      pole: rig.hold.poleR,
      bones: [BONES.upperArmR, BONES.forearmR, BONES.handR],
    },
    chest.rotation,
    rotations,
  );

  // The left palm moves along the neck. In the rest pose, it keeps its grip.
  const shift = (state.fingerboard - rig.gripPlace) * weight;
  const palmL = onInstrument(rig, place, add(rig.grip, scale(rig.neck, shift)));
  const handL = basisRotation(strings.top, scale(rotate(place.rotation, rig.fingers), -1));
  writeArm(
    {
      bind: rig.armL,
      joint: posePoint(chest, rig.chestBind, rig.armL.shoulder),
      parent: chest.rotation,
      wrist: sub(palmL, rotate(handL, rig.palmL)),
      hand: handL,
      pole: rig.hold.poleL,
      bones: [BONES.upperArmL, BONES.forearmL, BONES.handL],
    },
    chest.rotation,
    rotations,
  );

  setBoneRotation(rotations, BONES.shoulderR, axisAngle([0, 1, 0], rig.hold.reach * weight));
  setBoneRotation(rotations, BONES.instrument, place.local);
  setBoneRotation(
    rotations,
    BONES.fingersL,
    axisAngle([0, 0, 1], (h.curlL + h.pressL * state.press * state.gesture) * weight),
  );
  setBoneRotation(rotations, BONES.fingersR, axisAngle([0, 0, 1], -h.curlR * weight));
}
