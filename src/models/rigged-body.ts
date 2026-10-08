import { Quaternion, Vector3 } from 'three';

import type { BodyBoneName, BodyBones } from './biped.ts';
import type { Stance } from './body-frame.ts';
import { transform } from './mesh.ts';
import type { MeshBuilder, MeshData } from './mesh.ts';
import { boneIndex } from './rig.ts';
import type { BoneFrame } from './rig.ts';
import { decodeRigged } from './rigged.ts';
import type { RiggedBody, RiggedJoint } from './rigged.ts';
import { toQuat, toVec3 } from './tuples.ts';
import type { Vec3 } from './tuples.ts';

/**
 * The depth of the palm point under the palm side of a paw, in H (design 4.7). The palm side of
 * the parametric mitten is 0.11 H from its palm point, and the bow grip lies 0.127 H to the palm
 * side (`BOW_GRIP`), so the stick keeps 0.017 H from the paw.
 */
export const PALM_INSET = 0.11;

/**
 * The place of the finger block between the middle of a paw and its tip, as a part of the reach
 * of the paw from its middle. The left hand presses the strings with this point (design 5.3).
 */
export const FINGER_BLOCK = 0.5;

/**
 * The mouth of a rigged body from the tip of its nose, in H: under the front of the muzzle, as
 * the mouth of the long snout of the parametric body is under its nose.
 */
export const MOUTH_FROM_NOSE: Vec3 = [0, -0.12, 0.03];

/** The largest difference of two lengths that count as equal, in meters. */
const SAME_LENGTH = 1e-9;

/** The direction of a hanging arm in the rest skeleton: straight down (design 4.7). */
const DOWN = new Vector3(0, -1, 0);

/** The bones of a rigged body and the places and the turns that the body needs. */
interface RiggedArm {
  /** The bind positions of the bones of the arm in the rest skeleton, with hanging arms. */
  readonly positions: Readonly<
    Record<'shoulder' | 'upperArm' | 'forearm' | 'hand' | 'fingers', Vec3>
  >;
  /** The frames of the bones of the arm in the pose of the mesh. */
  readonly frames: Readonly<Record<'upperArm' | 'forearm' | 'hand' | 'fingers', BoneFrame>>;
  /** The middle of the palm, in the rest skeleton. */
  readonly palm: Vec3;
  /** The middle of the finger block, in the rest skeleton. */
  readonly fingerBlock: Vec3;
}

/**
 * Gives the minimal turn from one direction to another, after a turn before it.
 *
 * @param before The turn of the bone before: the parent of the bone.
 * @param to The direction of the bone in the pose of the mesh.
 * @returns The world rotation of the bone: the bone hangs straight down in the rest skeleton.
 */
function turnDown(before: Quaternion, to: Vector3): Quaternion {
  const from = DOWN.clone().applyQuaternion(before);
  return new Quaternion().setFromUnitVectors(from, to.clone().normalize()).multiply(before);
}

/**
 * Finds the arm of one side in the rest skeleton and in the pose of the mesh. The arm hangs
 * straight down from the shoulder joint with the lengths of the rig, and its bones turn by the
 * smallest turns onto the joints of the mesh: the upper arm, then the forearm, then the hand
 * along the hand bone of the rig. The paw gives the palm and the finger block.
 *
 * @param mesh The placed mesh of the body.
 * @param joint Gives a placed joint of the rig.
 * @param tip The placed tip of the hand bone.
 * @param side The side of the arm.
 * @param h The head height of the species, in meters.
 * @returns The arm.
 */
function riggedArm(
  mesh: MeshData,
  joint: (name: RiggedJoint) => Vector3,
  tip: Vector3,
  side: 'L' | 'R',
  h: number,
): RiggedArm {
  const shoulder = joint(`upperArm${side}`);
  const elbow = joint(`forearm${side}`);
  const wrist = joint(`hand${side}`);
  const restElbow = shoulder.clone().addScaledVector(DOWN, elbow.distanceTo(shoulder));
  const restWrist = restElbow.clone().addScaledVector(DOWN, wrist.distanceTo(elbow));

  const upper = turnDown(new Quaternion(), elbow.clone().sub(shoulder));
  const lower = turnDown(upper, wrist.clone().sub(elbow));
  const hand = turnDown(lower, tip.clone().sub(wrist));

  // The paw in the rest skeleton: each corner on the hand bone, moved back by the turn of the hand.
  const unturn = hand.clone().invert();
  const handBone = boneIndex(`hand${side}`);
  const paw: Vector3[] = [];
  for (let c = 0; c < mesh.bones.length; c++) {
    if (mesh.bones[c] === handBone) {
      paw.push(
        new Vector3()
          .fromArray(mesh.positions, c * 3)
          .sub(wrist)
          .applyQuaternion(unturn)
          .add(restWrist),
      );
    }
  }
  const middle = paw.reduce((sum, p) => sum.add(p), new Vector3()).divideScalar(paw.length);
  // The bind palm faces the body: +x on the left side and -x on the right side.
  const palmSide = new Vector3(side === 'L' ? 1 : -1, 0, 0);
  const reach = (direction: Vector3): number =>
    paw.reduce((far, p) => Math.max(far, p.clone().sub(middle).dot(direction)), 0);

  const fingers = middle.clone();
  const fingersAt = fingers.clone().sub(restWrist).applyQuaternion(hand).add(wrist);
  return {
    positions: {
      shoulder: toVec3(joint(`shoulder${side}`)),
      upperArm: toVec3(shoulder),
      forearm: toVec3(restElbow),
      hand: toVec3(restWrist),
      fingers: toVec3(fingers),
    },
    frames: {
      upperArm: { position: toVec3(shoulder), rotation: toQuat(upper) },
      forearm: { position: toVec3(elbow), rotation: toQuat(lower) },
      hand: { position: toVec3(wrist), rotation: toQuat(hand) },
      fingers: { position: toVec3(fingersAt), rotation: toQuat(hand) },
    },
    palm: toVec3(middle.clone().addScaledVector(palmSide, reach(palmSide) - PALM_INSET * h)),
    fingerBlock: toVec3(middle.clone().addScaledVector(DOWN, FINGER_BLOCK * reach(DOWN))),
  };
}

/**
 * Gives the turn of the head of the mesh around the vertical axis: the turn that brings the line
 * from the left eye to the right eye from +x to its direction in the mesh. The model sheet turns
 * the face toward the violin, and the rest skeleton faces the front.
 *
 * @param joints The joints of the rig.
 * @returns The turn.
 */
function headTurn(joints: RiggedBody['joints']): Quaternion {
  const across = new Vector3(...joints.eyeR)
    .sub(new Vector3(...joints.eyeL))
    .setY(0)
    .normalize();
  return new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.atan2(-across.z, across.x));
}

/**
 * Builds a rigged body on its seat (design 4.4, 4.7), and adds its mesh to a mesh. The mesh has
 * the playing pose of the model sheet. The bones get the rest skeleton of the pose code: the
 * trunk, the legs, and the tail at the joints of the rig, the head with its face to the front,
 * and the arms straight down from the shoulder joints. The bind frames bring this skeleton to the
 * pose of the mesh.
 *
 * The body fits each seat with the drop from the seat to the rest under the feet of its model
 * sheet. It moves up by the height of the rest, and forward on the seat.
 *
 * @param builder The mesh that gets the body.
 * @param rigged The rigged body.
 * @param h The head height of the species, in meters.
 * @param stance The stance of the body.
 * @returns The bones and the body points, with the bind frames, or `null` when the body does not
 *   fit the stance. Then the body is parametric.
 */
export function buildRigged(
  builder: MeshBuilder,
  rigged: RiggedBody,
  h: number,
  stance: Stance,
): BodyBones | null {
  if (
    stance.kind !== 'seated' ||
    Math.abs(stance.seatHeight - stance.footHeight - rigged.seatHeight) > SAME_LENGTH
  ) {
    return null;
  }

  const offset = new Vector3(0, stance.footHeight, -stance.forward);
  const mesh = decodeRigged(rigged.mesh, rigged.regions);
  builder.addMesh(mesh, transform(toVec3(offset)));
  const placed = (p: Vec3): Vector3 => new Vector3(...p).add(offset);
  const joint = (name: RiggedJoint): Vector3 => placed(rigged.joints[name]);
  const at = (name: RiggedJoint): Vec3 => toVec3(joint(name));
  const placedMesh: MeshData = {
    ...mesh,
    positions: mesh.positions.map((value, i) => value + offset.getComponent(i % 3)),
  };

  // The head faces the front in the rest skeleton.
  const head = joint('head');
  const turn = headTurn(rigged.joints);
  const unturn = turn.clone().invert();
  const facing = (p: Vector3): Vector3 => p.clone().sub(head).applyQuaternion(unturn).add(head);
  const eyeL = facing(joint('eyeL'));
  const eyeR = facing(joint('eyeR'));
  const eyes = eyeL.clone().add(eyeR).multiplyScalar(0.5);
  let back = -Infinity;
  for (let c = 0; c < placedMesh.bones.length; c++) {
    if (placedMesh.bones[c] === boneIndex('head')) {
      back = Math.max(back, facing(new Vector3().fromArray(placedMesh.positions, c * 3)).z);
    }
  }
  const headCenter = new Vector3(eyes.x, eyes.y, (eyes.z + back) / 2);
  const mouth = facing(placed(rigged.nose)).addScaledVector(new Vector3(...MOUTH_FROM_NOSE), h);

  const left = riggedArm(placedMesh, joint, placed(rigged.handTips.handL), 'L', h);
  const right = riggedArm(placedMesh, joint, placed(rigged.handTips.handR), 'R', h);
  const center = toVec3(headCenter);
  const headFrame = (p: Vec3): BoneFrame => ({ position: p, rotation: toQuat(turn) });
  const meshBind: Partial<Record<BodyBoneName, BoneFrame>> = {
    head: headFrame(at('head')),
    eyeL: headFrame(at('eyeL')),
    eyeR: headFrame(at('eyeR')),
    upperArmL: left.frames.upperArm,
    forearmL: left.frames.forearm,
    handL: left.frames.hand,
    fingersL: left.frames.fingers,
    upperArmR: right.frames.upperArm,
    forearmR: right.frames.forearm,
    handR: right.frames.hand,
    fingersR: right.frames.fingers,
  };

  return {
    headHeight: h,
    headCenter: center,
    mouth: toVec3(mouth),
    floor: [0, 0, offset.z],
    palmL: left.palm,
    palmR: right.palm,
    fingerBlockL: left.fingerBlock,
    fingerBlockR: right.fingerBlock,
    meshBind,
    positions: {
      root: [0, 0, 0],
      hips: at('hips'),
      spine: at('spine'),
      chest: at('chest'),
      neck: at('neck'),
      head: at('head'),
      jaw: toVec3(mouth),
      eyeL: toVec3(eyeL),
      eyeR: toVec3(eyeR),
      earL: center,
      earR: center,
      tail1: at('tail1'),
      tail2: at('tail2'),
      trunk1: center,
      trunk2: center,
      trunk3: center,
      shoulderL: left.positions.shoulder,
      upperArmL: left.positions.upperArm,
      forearmL: left.positions.forearm,
      handL: left.positions.hand,
      fingersL: left.positions.fingers,
      shoulderR: right.positions.shoulder,
      upperArmR: right.positions.upperArm,
      forearmR: right.positions.forearm,
      handR: right.positions.hand,
      fingersR: right.positions.fingers,
      thighL: at('thighL'),
      shinL: at('shinL'),
      footL: at('footL'),
      thighR: at('thighR'),
      shinR: at('shinR'),
      footR: at('footR'),
    },
  };
}
