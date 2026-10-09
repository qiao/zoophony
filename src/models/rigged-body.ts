import { Quaternion, Triangle, Vector3 } from 'three';

import type { BodyBoneName, BodyBones } from './biped.ts';
import type { BodyFrame, Stance } from './body-frame.ts';
import { BOW_GRIP } from './instruments/strings.ts';
import { transform } from './mesh.ts';
import type { MeshBuilder, MeshData } from './mesh.ts';
import { boneIndex } from './rig.ts';
import type { BoneFrame } from './rig.ts';
import { decodeRigged } from './rigged.ts';
import type { RiggedBody, RiggedJoint } from './rigged.ts';
import { toQuat, toVec3 } from './tuples.ts';
import type { Vec3 } from './tuples.ts';

/**
 * The depth of the left palm under the palm side of the left paw, in H (design 4.7): under the
 * farthest point of the paw on the palm side. The palm is then under the strings while the
 * finger block presses them.
 */
export const PALM_INSET = 0.1;

/**
 * The gap from the bow stick to the right forearm and the right hand of a rigged body in the rest
 * skeleton, in H (design 4.7). The right palm lies so that the stick keeps this gap, and the bow
 * grip (`BOW_GRIP` from the palm) is the point of the stick nearest to the paw. The skin moves the
 * paw a little, and the stick of the posed paw keeps 0.015 H to 0.03 H, as the parametric mitten.
 * The first rule put the right palm {@link PALM_INSET} under the farthest point of the paw. The
 * slim paw of the improved fox has that point 0.095 H away from the line of the grip, and the
 * stick then kept 0.042 H from the posed paw.
 */
export const GRIP_GAP = 0.02;

/** The step of the search for the depth of the palm, in H. */
const PALM_STEP = 0.01;

/** The number of halvings of the search for the depth of the palm. */
const PALM_HALVINGS = 20;

/** The largest area of a triangle seen from its edge, in square meters. */
const EDGE_ON_AREA = 1e-10;

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
  /**
   * The middle of the finger block, in the rest skeleton: the middle of the paw, so that the
   * strings pass through the paw, as the neck of the violin in the model sheet.
   */
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

/** The bind frame and the rest place of one bone of an arm of a rigged body. */
interface MovedBone {
  /** The joint of the bone in the pose of the mesh. */
  readonly bind: Vector3;
  /** The inverse of the world rotation of the bone in the pose of the mesh. */
  readonly unturn: Quaternion;
  /** The joint of the bone in the rest skeleton. */
  readonly rest: Vector3;
}

/**
 * Moves a corner of a rigged body from the pose of the mesh to the rest skeleton of an arm, as
 * the skin does with the bones of the rest skeleton: the sum of the weighted places of the
 * corner on its bones. A bone of the arm moves the corner by the inverse of its bind frame and
 * by its rest place. Each other bone keeps the corner in its place.
 *
 * @param mesh The placed mesh of the body.
 * @param corner The index of the corner.
 * @param moved The bones of the arm, by their index.
 * @returns The corner in the rest skeleton.
 */
function restCorner(
  mesh: MeshData,
  corner: number,
  moved: ReadonlyMap<number, MovedBone>,
): Vector3 {
  const point = new Vector3().fromArray(mesh.positions, corner * 3);
  const indices = mesh.skin?.indices ?? [mesh.bones[corner] ?? 0, 0, 0, 0];
  const weights = mesh.skin?.weights ?? [1, 0, 0, 0];
  const base = mesh.skin ? corner * 4 : 0;

  const out = new Vector3();
  for (let k = 0; k < 4; k++) {
    const weight = weights[base + k] ?? 0;
    const bone = moved.get(indices[base + k] ?? -1);
    if (bone) {
      out.addScaledVector(
        point.clone().sub(bone.bind).applyQuaternion(bone.unturn).add(bone.rest),
        weight,
      );
    } else {
      out.addScaledVector(point, weight);
    }
  }
  return out;
}

/**
 * Finds the bow grip of a right paw in the rest skeleton (design 4.6, 4.7). In the bind pose, the
 * stick runs along z on the palm side of the paw, at the height of the grip above the middle of
 * the paw (`BOW_GRIP`). The search moves the stick in from outside the paw in steps of
 * {@link PALM_STEP}, then halves the last step, so that the stick keeps {@link GRIP_GAP} from the
 * forearm and the hand. The grip is the point of the stick nearest to them. Thus the stick keeps
 * the gap from the frog end to the tip, and the gap at the grip is the smallest gap.
 *
 * @param triangles The triangles of the forearm and the hand in the rest skeleton.
 * @param middle The middle of the paw in the rest skeleton.
 * @param palmSide The unit direction to the palm side, along x.
 * @param h The head height of the species, in meters.
 * @returns The grip.
 */
function stickGrip(
  triangles: readonly Triangle[],
  middle: Vector3,
  palmSide: Vector3,
  h: number,
): Vector3 {
  // Seen along the stick, each triangle is a flat triangle in the plane z = 0, and the stick is a
  // point. A triangle seen from its edge has no inside, and its neighbors give its edges.
  const seen = triangles
    .map((source) => ({
      source,
      flat: new Triangle(
        new Vector3(source.a.x, source.a.y, 0),
        new Vector3(source.b.x, source.b.y, 0),
        new Vector3(source.c.x, source.c.y, 0),
      ),
    }))
    .filter(({ flat }) => flat.getArea() > EDGE_ON_AREA);
  const height = middle.y + BOW_GRIP[1] * h;
  const stick = new Vector3();
  const nearest = new Vector3();
  const stickAt = (depth: number): Vector3 => stick.set(middle.x + palmSide.x * depth, height, 0);
  const gap = (depth: number): number => {
    const at = stickAt(depth);
    return seen.reduce(
      (least, { flat }) => Math.min(least, flat.closestPointToPoint(at, nearest).distanceTo(at)),
      Infinity,
    );
  };

  const far = triangles
    .flatMap((t) => [t.a, t.b, t.c])
    .reduce((most, p) => Math.max(most, (p.x - middle.x) * palmSide.x), 0);
  let outside = far + 2 * GRIP_GAP * h;
  let inside = outside - PALM_STEP * h;
  while (inside > 0 && gap(inside) >= GRIP_GAP * h) {
    outside = inside;
    inside -= PALM_STEP * h;
  }
  for (let k = 0; k < PALM_HALVINGS; k++) {
    const depth = (inside + outside) / 2;
    if (gap(depth) >= GRIP_GAP * h) {
      outside = depth;
    } else {
      inside = depth;
    }
  }

  // The grip is across from the nearest point of the paw: its depth along z comes from the
  // corners of the nearest triangle.
  const at = stickAt(outside).clone();
  const weights = new Vector3();
  let least = Infinity;
  let along = middle.z;
  for (const { source, flat } of seen) {
    const distance = flat.closestPointToPoint(at, nearest).distanceTo(at);
    if (distance < least && flat.getBarycoord(nearest, weights)) {
      least = distance;
      along = weights.x * source.a.z + weights.y * source.b.z + weights.z * source.c.z;
    }
  }
  return at.setZ(along);
}

/**
 * Finds the arm of one side in the rest skeleton and in the pose of the mesh. The arm hangs
 * straight down from the shoulder joint with the lengths of the rig, and its bones turn by the
 * smallest turns onto the joints of the mesh: the upper arm, then the forearm, then the hand
 * along the hand bone of the rig. The paw gives the palm and the finger block: the corners of the
 * forearm and the hand past the plane of the wrist, as Blender weights much of a paw on the
 * forearm, moved to the rest skeleton by the skin. The right palm lies where the bow grip keeps
 * {@link GRIP_GAP} from the forearm and the hand, and the left palm {@link PALM_INSET} under the
 * farthest point of the paw on the palm side.
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

  // The paw in the rest skeleton: each corner of the forearm and the hand past the wrist, moved
  // by the skin of the arm bones.
  const moved = new Map<number, MovedBone>([
    [
      boneIndex(`upperArm${side}`),
      { bind: shoulder, unturn: upper.clone().invert(), rest: shoulder },
    ],
    [boneIndex(`forearm${side}`), { bind: elbow, unturn: lower.clone().invert(), rest: restElbow }],
    [boneIndex(`hand${side}`), { bind: wrist, unturn: hand.clone().invert(), rest: restWrist }],
  ]);
  const bones = new Set([boneIndex(`forearm${side}`), boneIndex(`hand${side}`)]);
  const along = wrist.clone().sub(elbow).normalize();
  const paw: Vector3[] = [];
  for (let c = 0; c < mesh.bones.length; c++) {
    const placed = new Vector3().fromArray(mesh.positions, c * 3).sub(wrist);
    if (bones.has(mesh.bones[c] ?? -1) && placed.dot(along) > 0) {
      paw.push(restCorner(mesh, c, moved));
    }
  }
  const middle = paw.reduce((sum, p) => sum.add(p), new Vector3()).divideScalar(paw.length);

  // The triangles of the forearm and the hand in the rest skeleton: the triangles whose first
  // corner follows one of them, as the parts of the tests.
  const triangles: Triangle[] = [];
  for (let t = 0; t < mesh.bones.length / 3; t++) {
    if (bones.has(mesh.bones[t * 3] ?? -1)) {
      const [a, b, c] = [0, 1, 2].map((k) => restCorner(mesh, t * 3 + k, moved));
      triangles.push(new Triangle(a, b, c));
    }
  }

  // The bind palm faces the body: +x on the left side and -x on the right side.
  const palmSide = new Vector3(side === 'L' ? 1 : -1, 0, 0);
  const reach = paw.reduce((most, p) => Math.max(most, p.clone().sub(middle).dot(palmSide)), 0);
  const palm =
    side === 'R'
      ? stickGrip(triangles, middle, palmSide, h).sub(new Vector3(...BOW_GRIP).multiplyScalar(h))
      : middle.clone().addScaledVector(palmSide, reach - PALM_INSET * h);

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
    palm: toVec3(palm),
    fingerBlock: toVec3(middle),
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
 * The head center has the height of the head center of the skeleton of the species (design 4.3),
 * which follows the same model sheet, and lies between the eyes and the back of the head. The
 * violin and the viola hang from it (design 4.6). At the height of the eyes, the violin rose
 * 0.12 H, and the bow hand went 0.04 H into the muzzle at the frog of the lowest string.
 *
 * @param builder The mesh that gets the body.
 * @param rigged The rigged body.
 * @param frame The frame of the body: the head height and the skeleton of the species.
 * @param stance The stance of the body.
 * @returns The bones and the body points, with the bind frames, or `null` when the body does not
 *   fit the stance. Then the body is parametric.
 */
export function buildRigged(
  builder: MeshBuilder,
  rigged: RiggedBody,
  frame: BodyFrame,
  stance: Stance,
): BodyBones | null {
  if (
    stance.kind !== 'seated' ||
    Math.abs(stance.seatHeight - stance.footHeight - rigged.seatHeight) > SAME_LENGTH
  ) {
    return null;
  }

  const { h } = frame;
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
  const height = frame.at(0, frame.proportions.headCenter, 0)[1];
  const headCenter = new Vector3(eyes.x, height, (eyes.z + back) / 2);
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
