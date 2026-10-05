import { MathUtils } from 'three';
import {
  add,
  axisAngle,
  basisRotation,
  cross,
  invert,
  length,
  multiply,
  normalize,
  rotate,
  rotationBetween,
  scale,
  sub,
} from '../models/math.ts';
import { IDENTITY } from '../models/tuples.ts';
import type { Quat, Vec3 } from '../models/tuples.ts';
import type { PlayerModel } from '../models/player.ts';
import { BONE_NAMES, boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import { placePoint } from '../models/instruments/hold.ts';
import type { PlacedPiece } from '../models/instruments/hold.ts';
import { BOW, INSTRUMENT_SCALE } from '../models/instruments/strings.ts';
import type { InstrumentBone, PiecePoint } from '../models/instruments/types.ts';
import { solveTwoBone } from './ik.ts';
import type { AnimalPose } from './types.ts';

/** The values of the static playing pose of a violin player. */
export const VIOLIN_POSE = {
  /** The distance along the bow from the right hand to the strings, in meters (design 4.7). */
  bowFromGrip: 0.14 * INSTRUMENT_SCALE,
  /** The curl of the fingers of each hand. */
  curlL: 40 * MathUtils.DEG2RAD,
  curlR: 30 * MathUtils.DEG2RAD,
  /** The directions to which the elbows point. */
  poleL: [-0.3, -1, 0] as const,
  poleR: [1, -1, 0.3] as const,
} as const;

/** The points of a violin and its bow that the static pose needs, in the model axes. */
export interface ViolinPoints {
  /** The point on the strings where the bow plays. */
  readonly bowContact: Vec3;
  /** The unit direction from the tail end to the scroll. */
  readonly axis: Vec3;
  /** The unit normal of the top plate: the strings are on this side. */
  readonly top: Vec3;
  /** The place of the left palm under the neck. */
  readonly palmL: Vec3;
  /** The point of the bow that the right hand holds, in the bind pose. */
  readonly bowGrip: Vec3;
  /** The unit direction of the bow from the frog to the tip, in the bind pose. */
  readonly bowAxis: Vec3;
  /** The unit direction from the stick to the hair, in the bind pose. */
  readonly hairSide: Vec3;
  /** The distance from the stick to the hair, in meters. */
  readonly hairGap: number;
}

/**
 * Finds the placed piece on a bone.
 *
 * @throws Error if no piece follows the bone.
 */
function pieceOn(pieces: readonly PlacedPiece[], bone: InstrumentBone): PlacedPiece {
  const placed = pieces.find((p) => p.piece.bone === bone);
  if (!placed) {
    throw new Error(`The instrument has no piece on the bone "${bone}".`);
  }
  return placed;
}

/**
 * Finds the points of the violin or the viola and its bow in the bind pose of a player.
 *
 * @param model A player with a violin or a viola.
 * @returns The points.
 * @throws Error if the instrument has no bow, no bow contact, or no grip of the left palm.
 */
export function violinPoints(model: PlayerModel): ViolinPoints {
  const { pieces, instrument } = model;
  const violin = pieceOn(pieces, 'instrument').at.rotation;
  const bow = pieceOn(pieces, 'bow').at;
  const contact = instrument.targets.find((t) => t.kind === 'bow-contact');
  const palm: PiecePoint | null = instrument.grips.palmL;
  if (!contact || !palm) {
    throw new Error(`The ${instrument.id} has no bow contact or no grip of the left palm.`);
  }
  return {
    bowContact: placePoint(pieces, { bone: contact.bone, at: contact.from }),
    axis: rotate(violin, [1, 0, 0]),
    top: rotate(violin, [0, 1, 0]),
    palmL: placePoint(pieces, palm),
    bowGrip: bow.position,
    bowAxis: rotate(bow.rotation, [1, 0, 0]),
    hairSide: rotate(bow.rotation, [0, -1, 0]),
    hairGap: BOW.hairGap * INSTRUMENT_SCALE,
  };
}

/**
 * Calculates the static playing pose of a violin player: the violin under the chin, the left
 * hand on the neck, and the bow on the strings in the right hand. Step 3 shows this pose. The
 * pose function of step 5 replaces it.
 *
 * @param model The player model with a violin.
 * @returns The pose, with one rotation for each bone relative to its parent.
 */
export function violinPlayingPose(model: PlayerModel): AnimalPose {
  const at = (name: BoneName): Vec3 => model.skeleton.positions[boneIndex(name)] ?? [0, 0, 0];
  const p = VIOLIN_POSE;
  const violin = violinPoints(model);

  // The strings run along the violin axis. The bow crosses them in the plane of the strings, with
  // its tip up, and its hair on the strings.
  let across = normalize(cross(violin.top, violin.axis));
  if (across[1] < 0) {
    across = scale(across, -1);
  }
  const handR = basisRotation(across, violin.top);
  const bowBind = basisRotation(violin.bowAxis, scale(violin.hairSide, -1));
  const worldHandR = multiply(handR, invert(bowBind));
  const grip = add(
    add(violin.bowContact, scale(violin.top, violin.hairGap)),
    scale(across, -p.bowFromGrip),
  );
  const wristR = sub(grip, rotate(worldHandR, sub(violin.bowGrip, at('handR'))));

  // The left palm is under the neck and faces it. The fingers point across the neck.
  const worldHandL = basisRotation(violin.top, scale(across, -1));
  const wristL = sub(violin.palmL, rotate(worldHandL, sub(model.body.palmL, at('handL'))));

  const world = new Map<BoneName, Quat>();
  for (const [side, wrist, hand, pole] of [
    ['L', wristL, worldHandL, p.poleL],
    ['R', wristR, worldHandR, p.poleR],
  ] as const) {
    const shoulder = at(`upperArm${side}`);
    const elbowBind = at(`forearm${side}`);
    const wristBind = at(`hand${side}`);
    const joints = solveTwoBone(
      shoulder,
      wrist,
      length(sub(elbowBind, shoulder)),
      length(sub(wristBind, elbowBind)),
      pole,
    );
    world.set(
      `upperArm${side}`,
      rotationBetween(sub(elbowBind, shoulder), sub(joints.elbow, shoulder)),
    );
    world.set(
      `forearm${side}`,
      rotationBetween(sub(wristBind, elbowBind), sub(joints.wrist, joints.elbow)),
    );
    world.set(`hand${side}`, hand);
  }

  // The fingers curl toward the palm: the palm of the left hand faces +x and the right -x.
  const local = new Map<BoneName, Quat>([
    ['fingersL', axisAngle([0, 0, 1], p.curlL)],
    ['fingersR', axisAngle([0, 0, 1], -p.curlR)],
  ]);

  const rotations = new Float32Array(BONE_NAMES.length * 4);
  const worldOf: Quat[] = [];
  for (const [i, name] of BONE_NAMES.entries()) {
    const parent = model.skeleton.parents[i] ?? -1;
    const parentWorld = parent >= 0 ? (worldOf[parent] ?? IDENTITY) : IDENTITY;
    const target = world.get(name);
    const turn = target ? multiply(invert(parentWorld), target) : (local.get(name) ?? IDENTITY);
    worldOf.push(target ?? multiply(parentWorld, turn));
    rotations.set(turn, i * 4);
  }
  return { rotations, rootOffset: [0, 0, 0], slideOffset: [0, 0, 0], blink: 0 };
}
