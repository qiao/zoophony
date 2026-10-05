import { MathUtils, Quaternion, Vector3 } from 'three';

import { toVec3 } from '../models/tuples.ts';
import type { Vec3 } from '../models/tuples.ts';
import type { PlayerModel } from '../models/player.ts';
import { BONE_NAMES, boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import { placePoint } from '../models/instruments/hold.ts';
import type { PlacedPiece } from '../models/instruments/hold.ts';
import { BOW, INSTRUMENT_SCALE } from '../models/instruments/strings.ts';
import type { InstrumentBone, PiecePoint } from '../models/instruments/types.ts';
import { setBoneRotation, setFromBasis } from './frames.ts';
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
  const violin = new Quaternion(...pieceOn(pieces, 'instrument').at.rotation);
  const bow = pieceOn(pieces, 'bow').at;
  const bowRotation = new Quaternion(...bow.rotation);
  const contact = instrument.targets.find((t) => t.kind === 'bow-contact');
  const palm: PiecePoint | null = instrument.grips.palmL;
  if (!contact || !palm) {
    throw new Error(`The ${instrument.id} has no bow contact or no grip of the left palm.`);
  }
  return {
    bowContact: placePoint(pieces, { bone: contact.bone, at: contact.from }),
    axis: toVec3(new Vector3(1, 0, 0).applyQuaternion(violin)),
    top: toVec3(new Vector3(0, 1, 0).applyQuaternion(violin)),
    palmL: placePoint(pieces, palm),
    bowGrip: bow.position,
    bowAxis: toVec3(new Vector3(1, 0, 0).applyQuaternion(bowRotation)),
    hairSide: toVec3(new Vector3(0, -1, 0).applyQuaternion(bowRotation)),
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
  const at = (name: BoneName): Vector3 =>
    new Vector3(...(model.skeleton.positions[boneIndex(name)] ?? [0, 0, 0]));
  const p = VIOLIN_POSE;
  const violin = violinPoints(model);
  const top = new Vector3(...violin.top);

  // The strings run along the violin axis. The bow crosses them in the plane of the strings, with
  // its tip up, and its hair on the strings.
  const across = new Vector3().crossVectors(top, new Vector3(...violin.axis)).normalize();
  if (across.y < 0) {
    across.negate();
  }
  const handR = setFromBasis(new Quaternion(), across, top);
  const bowBind = setFromBasis(
    new Quaternion(),
    new Vector3(...violin.bowAxis),
    new Vector3(...violin.hairSide).negate(),
  );
  const worldHandR = handR.multiply(bowBind.invert());
  const grip = new Vector3(...violin.bowContact)
    .addScaledVector(top, violin.hairGap)
    .addScaledVector(across, -p.bowFromGrip);
  const wristR = grip.sub(
    new Vector3(...violin.bowGrip).sub(at('handR')).applyQuaternion(worldHandR),
  );

  // The left palm is under the neck and faces it. The fingers point across the neck.
  const worldHandL = setFromBasis(new Quaternion(), top, across.clone().negate());
  const wristL = new Vector3(...violin.palmL).sub(
    new Vector3(...model.body.palmL).sub(at('handL')).applyQuaternion(worldHandL),
  );

  const world = new Map<BoneName, Quaternion>();
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
      shoulder.distanceTo(elbowBind),
      elbowBind.distanceTo(wristBind),
      new Vector3(...pole),
    );
    world.set(
      `upperArm${side}`,
      new Quaternion().setFromUnitVectors(
        new Vector3().subVectors(elbowBind, shoulder).normalize(),
        new Vector3().subVectors(joints.elbow, shoulder).normalize(),
      ),
    );
    world.set(
      `forearm${side}`,
      new Quaternion().setFromUnitVectors(
        new Vector3().subVectors(wristBind, elbowBind).normalize(),
        new Vector3().subVectors(joints.wrist, joints.elbow).normalize(),
      ),
    );
    world.set(`hand${side}`, hand);
  }

  // The fingers curl toward the palm: the palm of the left hand faces +x and the right -x.
  const zAxis = new Vector3(0, 0, 1);
  const local = new Map<BoneName, Quaternion>([
    ['fingersL', new Quaternion().setFromAxisAngle(zAxis, p.curlL)],
    ['fingersR', new Quaternion().setFromAxisAngle(zAxis, -p.curlR)],
  ]);

  const rotations = new Float32Array(BONE_NAMES.length * 4);
  const worldOf: Quaternion[] = [];
  for (const [i, name] of BONE_NAMES.entries()) {
    const parent = model.skeleton.parents[i] ?? -1;
    const parentWorld = (parent >= 0 ? worldOf[parent] : undefined) ?? new Quaternion();
    const target = world.get(name);
    const turn = target
      ? parentWorld.clone().invert().multiply(target)
      : (local.get(name) ?? new Quaternion());
    worldOf.push(target ?? parentWorld.clone().multiply(turn));
    setBoneRotation(rotations, i, turn);
  }
  return { rotations, rootOffset: [0, 0, 0], slideOffset: [0, 0, 0], blink: 0 };
}
