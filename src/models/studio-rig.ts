import { Matrix4, Quaternion, Vector3 } from 'three';

import type { BodyBoneName } from './biped.ts';
import { BONE_NAMES, boneIndex } from './rig.ts';
import type { Skeleton } from './rig.ts';
import {
  STUDIO_BONES,
  STUDIO_LEG_BONES,
  STUDIO_PARENTS,
  unpackStudioMesh,
} from './studio-format.ts';
import type { Side, StudioBody, StudioBone, StudioMesh } from './studio-format.ts';
import { toVec3 } from './tuples.ts';
import type { Quat, Vec3 } from './tuples.ts';

/**
 * The bone of the player that each bone of a studio body follows (design 4.4, 4.7). A bone of the
 * trunk, the head, the legs, or the tail moves as its bone of the player. The arm bones of the
 * studio take the joints and the hand of the player, with the bend of the elbow of the studio and
 * the twist split of the forearm ({@link poseStudioBones}). The readers of the bind mesh, such as
 * the footprints, read the bone of the player of the largest weight.
 */
export const STUDIO_FOLLOWS = {
  root: 'root',
  hips: 'hips',
  spine: 'spine',
  spine1: 'spine',
  chest: 'chest',
  neck: 'neck',
  head: 'head',
  ear_L: 'earL',
  ear_R: 'earR',
  clavicle_L: 'shoulderL',
  upper_arm_L: 'upperArmL',
  forearm_L: 'forearmL',
  forearm_twist_L: 'forearmL',
  hand_L: 'handL',
  fingers_L: 'fingersL',
  clavicle_R: 'shoulderR',
  upper_arm_R: 'upperArmR',
  forearm_R: 'forearmR',
  forearm_twist_R: 'forearmR',
  hand_R: 'handR',
  fingers_R: 'fingersR',
  thigh_L: 'thighL',
  shin_L: 'shinL',
  foot_L: 'footL',
  toes_L: 'footL',
  thigh_R: 'thighR',
  shin_R: 'shinR',
  foot_R: 'footR',
  toes_R: 'footR',
  tail: 'tail1',
  eye_L: 'eyeL',
  eye_R: 'eyeR',
} as const satisfies Readonly<Record<StudioBone, BodyBoneName>>;

/**
 * The share of the twist of the paw that the forearm twist bone takes, as in the clips of the
 * studio (`lowpoly-studio/roles/conductor/clips.py`). Thus the skin of the forearm does not twist
 * as a candy wrapper.
 */
export const TWIST_SHARE = 0.5;

/**
 * The turn of a paw in the plane of its palm toward the forearm (design 4.4). The hand of the
 * player holds the baton across the palm and points the fingers along the places of the left
 * hand, so its fingers stand at 45° to 150° from the forearm in the conductor poses. The skin of
 * the studio bends well up to about 50° at the wrist (`lowpoly-studio/roles/conductor/`). The
 * turn in the plane of the palm keeps the palm, the baton across it, and the curl of the fingers,
 * and it brings the paw toward the line of the forearm. The right paw turns only by positive
 * angles: toward the baton, which runs forward from the fist. A turn away from the baton takes the
 * baton out of the paw.
 */
export const PAW_TURN = {
  /** The largest turn, in radians. The baton stays in the paw up to about 70°. */
  max: (70 * Math.PI) / 180,
  /**
   * The length of the part of the unit forearm in the plane of the palm, from 0 to 1, below which
   * the turn fades out: a forearm along the palm normal gives no direction in the plane.
   */
  fade: [0.2, 0.5],
} as const;

/** The direction down: the bones of each arm of the player point down in the bind pose. */
const DOWN: Vec3 = [0, -1, 0];

/**
 * The palm of each hand of the player in the bind pose: inward, to the side to which the fingers
 * curl (`writeCurl()` of `pose/ik.ts`). The left side of the animal is -x.
 */
const PALMS: Readonly<Record<Side, Vec3>> = { L: [1, 0, 0], R: [-1, 0, 0] };

/** The constants of one arm of a studio body for {@link poseStudioBones}. */
interface StudioArm {
  readonly side: Side;
  /** The studio bones of the arm, as indices in `STUDIO_BONES`. */
  readonly bones: Readonly<
    Record<'clavicle' | 'upper' | 'fore' | 'twist' | 'hand' | 'fingers', number>
  >;
  /** The bones of the player that drive the arm, as indices in `BONE_NAMES`. */
  readonly drivers: Readonly<Record<'upper' | 'fore' | 'hand' | 'fingers', number>>;
  /** The unit direction of the upper arm in the bind pose of the studio: shoulder to elbow. */
  readonly upper: Vec3;
  /** The unit direction of the forearm in the bind pose of the studio: elbow to wrist. */
  readonly fore: Vec3;
  /** The unit axis of the elbow in the bind pose of the studio: upper × fore. */
  readonly hinge: Vec3;
  /** The part of the way from the elbow to the wrist at the head of the twist bone. */
  readonly twistAt: number;
  /**
   * The rotation from the paw of the studio in its bind pose to the paw of the player in its bind
   * pose: the fingers down, and the palm inward.
   */
  readonly paw: Quat;
  /**
   * The unit axis around which the fingers of the studio curl toward the palm, in the bind pose
   * of the studio: the paw axis × the palm normal.
   */
  readonly curl: Vec3;
  /** The direction of the upper arm in the axes of the chest in the pose of the sheet. */
  readonly sheet: Vec3;
}

/**
 * A studio body that is ready to pose: the unpacked mesh, the skeleton of the player, and the
 * constants of the arms (design 4.4).
 */
export interface StudioRig {
  readonly body: StudioBody;
  readonly mesh: StudioMesh;
  /**
   * The bind positions of the body bones of the player. The trunk, the head, and the legs have the
   * joints of the studio. Each arm hangs straight down from the shoulder joint of the studio, with
   * the lengths of the arm of the studio, as the pose code of section 5 needs.
   */
  readonly positions: Readonly<Record<BodyBoneName, Vec3>>;
  /** The bone of the player that each studio bone follows, as indices in `BONE_NAMES`. */
  readonly follows: Uint8Array;
  readonly arms: Readonly<Record<Side, StudioArm>>;
}

/**
 * The pose of the bones of a studio body for one frame: one matrix for each bone of the studio,
 * then one for each bone of the player, which moves the instrument.
 */
export interface StudioPose {
  /**
   * 16 numbers for each bone, column by column: the move of a point from the bind pose to the
   * pose, in the model axes. The studio bones come first, then the bones of `BONE_NAMES`.
   */
  readonly matrices: Float32Array;
  /** The weight of the corrective shape of each arm, from 0 to 1: the left arm, then the right. */
  readonly correctives: Float32Array;
}

/** The number of matrices of a {@link StudioPose}. */
export const STUDIO_POSE_BONES = STUDIO_BONES.length + BONE_NAMES.length;

/**
 * Makes a studio pose to write.
 *
 * @returns The pose of the bind pose.
 */
export function createStudioPose(): StudioPose {
  const matrices = new Float32Array(STUDIO_POSE_BONES * 16);
  for (let b = 0; b < STUDIO_POSE_BONES; b++) {
    matrices.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], b * 16);
  }
  return { matrices, correctives: new Float32Array(2) };
}

/**
 * Gives the rotation that turns the frame (`aFrom`, `bFrom`) into the frame (`aTo`, `bTo`): `a`
 * goes to `a`, and the plane of `a` and `b` goes to the plane of the other `a` and `b`.
 *
 * @param aFrom The first axis of the first frame.
 * @param bFrom A second axis of the first frame, not along `aFrom`.
 * @param aTo The first axis of the second frame.
 * @param bTo A second axis of the second frame.
 * @param out The quaternion to write.
 * @returns `out`.
 */
export function alignFrames(
  aFrom: Vector3,
  bFrom: Vector3,
  aTo: Vector3,
  bTo: Vector3,
  out: Quaternion,
): Quaternion {
  basisOf(aFrom, bFrom, fromBasis);
  basisOf(aTo, bTo, toBasis);
  return out.setFromRotationMatrix(toBasis.multiply(fromBasis.transpose()));
}

const fromBasis = new Matrix4();
const toBasis = new Matrix4();
const ax = new Vector3();
const bx = new Vector3();
const cx = new Vector3();

/**
 * Writes the orthonormal frame of two axes: `a`, `b` made normal to `a`, and `a × b`.
 *
 * @param a The first axis.
 * @param b The second axis.
 * @param out The matrix to write, with the three axes as its columns.
 */
function basisOf(a: Vector3, b: Vector3, out: Matrix4): void {
  ax.copy(a).normalize();
  bx.copy(b).addScaledVector(ax, -b.dot(ax)).normalize();
  cx.crossVectors(ax, bx);
  out.makeBasis(ax, bx, cx);
}

/**
 * Gives the angle of the twist of a rotation around an axis (the swing and twist split).
 *
 * @param q The rotation.
 * @param axis The unit axis.
 * @returns The angle, from -π to π.
 */
export function twistAngle(q: Quaternion, axis: Vector3): number {
  const angle = 2 * Math.atan2(q.x * axis.x + q.y * axis.y + q.z * axis.z, q.w);
  return ((((angle + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
}

/**
 * Gives the bind positions of the body bones of the player for a studio body. The arms hang
 * straight down, because the pose code reads the hanging arm of the bind pose (design 4.7, 5.2).
 *
 * @param body The studio body.
 * @returns The positions.
 */
function playerPositions(body: StudioBody): Record<BodyBoneName, Vec3> {
  const h = body.heads;
  const below = (from: Vec3, length: number): Vec3 => [from[0], from[1] - length, from[2]];
  const length = (a: Vec3, b: Vec3): number => new Vector3(...a).distanceTo(new Vector3(...b));
  const arm = (side: Side) => {
    const shoulder = h[`upper_arm_${side}`];
    const elbow = below(shoulder, length(shoulder, h[`forearm_${side}`]));
    const wrist = below(elbow, length(h[`forearm_${side}`], h[`hand_${side}`]));
    const knuckle = below(wrist, length(h[`hand_${side}`], h[`fingers_${side}`]));
    return { clavicle: h[`clavicle_${side}`], shoulder, elbow, wrist, knuckle };
  };
  const left = arm('L');
  const right = arm('R');
  return {
    root: [0, 0, 0],
    hips: h.hips,
    spine: h.spine,
    chest: h.chest,
    neck: h.neck,
    head: h.head,
    jaw: body.nose,
    eyeL: h.eye_L,
    eyeR: h.eye_R,
    earL: h.ear_L,
    earR: h.ear_R,
    tail1: h.tail,
    tail2: h.tail,
    trunk1: h.head,
    trunk2: h.head,
    trunk3: h.head,
    shoulderL: left.clavicle,
    upperArmL: left.shoulder,
    forearmL: left.elbow,
    handL: left.wrist,
    fingersL: left.knuckle,
    shoulderR: right.clavicle,
    upperArmR: right.shoulder,
    forearmR: right.elbow,
    handR: right.wrist,
    fingersR: right.knuckle,
    thighL: h.thigh_L,
    shinL: h.shin_L,
    footL: h.foot_L,
    thighR: h.thigh_R,
    shinR: h.shin_R,
    footR: h.foot_R,
  };
}

/** A studio body with its unpacked mesh, in the stance of a player. */
export interface PosedStudioBody {
  /** The body, with the bind places of its bones in the stance. */
  readonly body: StudioBody;
  /** The mesh, with its bind places in the stance and the arm corrective shapes only. */
  readonly mesh: StudioMesh;
}

/** The number of the arm corrective shapes, the first shapes of a packed studio mesh. */
const ARM_CORRECTIVES = 2;

/**
 * Makes the standing body of a seated studio body that also stands, such as the violinist rabbit
 * as a soloist (design 4.4). The legs take the turns of the pose of the sheet, with the leg
 * corrective shapes of the studio at their full weight, and the body moves from its seat to stand
 * over the origin. The bind places of the mesh and of the bones become the standing places, so
 * that the rig poses the standing body as it poses a body that the studio built standing.
 *
 * @param body The seated studio body, with its standing pose.
 * @param mesh The unpacked mesh of the body, with the leg corrective shapes after the arm shapes.
 * @returns The standing body and its mesh, with the arm corrective shapes only.
 * @throws Error if the body has no standing pose.
 */
export function standingBody(body: StudioBody, mesh: StudioMesh): PosedStudioBody {
  const standing = body.standing;
  if (!standing) {
    throw new Error('The studio body has no standing pose.');
  }

  // Each leg bone turns around its head, and its children follow it from the hips down.
  const pose = createStudioPose();
  const heads = { ...body.heads };
  const turnOf = new Map<StudioBone, Quaternion>();
  for (const bone of STUDIO_LEG_BONES) {
    const turn = new Quaternion(...standing.turns[bone]);
    const parent = STUDIO_PARENTS[bone];
    const parentTurn = turnOf.get(parent);
    const from = new Vector3(...body.heads[bone]);
    const to = parentTurn
      ? from
          .clone()
          .sub(new Vector3(...body.heads[parent]))
          .applyQuaternion(parentTurn)
          .add(new Vector3(...heads[parent]))
      : from.clone();
    turnOf.set(bone, turn);
    heads[bone] = toVec3(to);
    writeMatrix(pose.matrices, STUDIO_BONES.indexOf(bone), turn, from, to);
  }
  const weights = new Float32Array(mesh.correctives.length).fill(1, ARM_CORRECTIVES);
  const positions = skinStudioMesh(mesh, { matrices: pose.matrices, correctives: weights });

  const lift = new Vector3(...standing.lift);
  const lifted = (p: Vec3): Vec3 => toVec3(new Vector3(...p).add(lift));
  for (let v = 0; v < positions.length; v += 3) {
    positions[v] = (positions[v] ?? 0) + lift.x;
    positions[v + 1] = (positions[v + 1] ?? 0) + lift.y;
    positions[v + 2] = (positions[v + 2] ?? 0) + lift.z;
  }
  return {
    body: {
      ...body,
      // SAFETY: the entries hold each bone of STUDIO_BONES one time.
      heads: Object.fromEntries(STUDIO_BONES.map((bone) => [bone, lifted(heads[bone])])) as Record<
        StudioBone,
        Vec3
      >,
      fingerTips: { L: lifted(body.fingerTips.L), R: lifted(body.fingerTips.R) },
      headCenter: lifted(body.headCenter),
      nose: lifted(body.nose),
      floor: [0, 0, 0],
      seatHeight: null,
      standing: null,
    },
    mesh: { ...mesh, positions, correctives: mesh.correctives.slice(0, ARM_CORRECTIVES) },
  };
}

/**
 * Prepares a studio body to pose (design 4.4): unpacks its mesh, and finds the skeleton of the
 * player and the constants of the arms. A seated body that also stands gets its standing body
 * ({@link standingBody}) for a player that stands. Each other body keeps the stance of its role.
 *
 * @param seated The studio body, as the export wrote it.
 * @param stands True for a player that stands.
 * @returns The rig.
 */
export function studioRig(seated: StudioBody, stands = false): StudioRig {
  const unpacked = unpackStudioMesh(seated.mesh);
  const { body, mesh }: PosedStudioBody =
    stands && seated.standing
      ? standingBody(seated, unpacked)
      : {
          body: seated,
          mesh: { ...unpacked, correctives: unpacked.correctives.slice(0, ARM_CORRECTIVES) },
        };
  const h = body.heads;
  const unit = (from: Vec3, to: Vec3): Vector3 =>
    new Vector3(...to).sub(new Vector3(...from)).normalize();
  const arm = (side: Side): StudioArm => {
    const upper = unit(h[`upper_arm_${side}`], h[`forearm_${side}`]);
    const fore = unit(h[`forearm_${side}`], h[`hand_${side}`]);
    const twistAt =
      new Vector3(...h[`forearm_twist_${side}`]).distanceTo(new Vector3(...h[`forearm_${side}`])) /
      new Vector3(...h[`hand_${side}`]).distanceTo(new Vector3(...h[`forearm_${side}`]));
    const paw = alignFrames(
      unit(h[`hand_${side}`], h[`fingers_${side}`]),
      new Vector3(...body.palms[side]),
      new Vector3(...DOWN),
      new Vector3(...PALMS[side]),
      new Quaternion(),
    );
    return {
      side,
      bones: {
        clavicle: STUDIO_BONES.indexOf(`clavicle_${side}`),
        upper: STUDIO_BONES.indexOf(`upper_arm_${side}`),
        fore: STUDIO_BONES.indexOf(`forearm_${side}`),
        twist: STUDIO_BONES.indexOf(`forearm_twist_${side}`),
        hand: STUDIO_BONES.indexOf(`hand_${side}`),
        fingers: STUDIO_BONES.indexOf(`fingers_${side}`),
      },
      drivers: {
        upper: boneIndex(`upperArm${side}`),
        fore: boneIndex(`forearm${side}`),
        hand: boneIndex(`hand${side}`),
        fingers: boneIndex(`fingers${side}`),
      },
      upper: toVec3(upper),
      fore: toVec3(fore),
      hinge: toVec3(new Vector3().crossVectors(upper, fore).normalize()),
      twistAt,
      paw: [paw.x, paw.y, paw.z, paw.w],
      curl: toVec3(
        new Vector3()
          .crossVectors(
            unit(h[`hand_${side}`], h[`fingers_${side}`]),
            new Vector3(...body.palms[side]),
          )
          .normalize(),
      ),
      sheet: body.sheetArms[side],
    };
  };
  return {
    body,
    mesh,
    positions: playerPositions(body),
    follows: Uint8Array.from(STUDIO_BONES, (bone) => boneIndex(STUDIO_FOLLOWS[bone])),
    arms: { L: arm('L'), R: arm('R') },
  };
}

/** The world rotation of each bone of the player. Each call writes them before it reads them. */
const rotations = BONE_NAMES.map(() => new Quaternion());

/** The posed position of each bone of the player. Each call writes them before it reads them. */
const places = BONE_NAMES.map(() => new Vector3());

const local = new Quaternion();
const offset = new Vector3();
const bind = new Vector3();
const shoulder = new Vector3();
const elbow = new Vector3();
const wrist = new Vector3();
const upper = new Vector3();
const fore = new Vector3();
const hinge = new Vector3();
const upperBind = new Vector3();
const foreBind = new Vector3();
const hingeBind = new Vector3();
const upperTurn = new Quaternion();
const foreTurn = new Quaternion();
const handTurn = new Quaternion();
const fingersTurn = new Quaternion();
const inHand = new Vector3();
const palmTurn = new Quaternion();
const curlTurn = new Quaternion();
const curlAxis = new Vector3();
const X_AXIS = new Vector3(1, 0, 0);
const twistTurn = new Quaternion();
const relative = new Quaternion();
const paw = new Quaternion();
const chestInverse = new Quaternion();
const head = new Vector3();
const matrix = new Matrix4();
const scaleY = new Matrix4();
const span = new Vector3();
const current = new Vector3();

/**
 * Writes the matrix that moves a point from the bind pose to the pose: `T(head) R T(-bind)`.
 *
 * @param out The matrices.
 * @param index The bone index in the matrices.
 * @param turn The world rotation from the bind pose.
 * @param from The bind position of the bone.
 * @param to The posed position of the bone.
 */
function writeMatrix(
  out: Float32Array,
  index: number,
  turn: Quaternion,
  from: Vector3,
  to: Vector3,
): void {
  matrix.makeRotationFromQuaternion(turn);
  offset.copy(from).applyQuaternion(turn);
  matrix.setPosition(to.x - offset.x, to.y - offset.y, to.z - offset.z);
  matrix.toArray(out, index * 16);
}

/**
 * Calculates the bones of a studio body from a pose of the player (design 4.4, 5.1): the
 * retarget. Each bone of the trunk, the head, the legs, and the tail moves as its bone of the
 * player. Each arm of the studio takes the posed shoulder, elbow, and wrist of the player: the
 * upper arm and the forearm turn with the elbow axis of the studio onto the plane of the arm, so
 * that the elbow bends as the studio built it. The paw takes the rotation of the hand of the
 * player, turned in the plane of its palm toward the forearm by up to {@link PAW_TURN} (the right
 * paw only toward the baton), and the forearm twist bone takes {@link TWIST_SHARE} of the twist
 * from the forearm to the paw. The fingers of the studio curl around their own axis by the curl
 * of the fingers of the player. The corrective shape of each arm takes its weight from the direction of the upper arm
 * between the bind pose of the studio and the pose of the sheet, as in the studio. The eyes
 * scale on y for a blink. The bones of the player follow, for the instrument.
 *
 * @param rig The studio rig.
 * @param skeleton The skeleton of the player, with the positions of {@link StudioRig.positions}.
 * @param pose The local rotations of the bones of the player, four numbers for each bone.
 * @param rootOffset The offset of the root bone.
 * @param eyeScale The scale of the eyes on y: 1 is open.
 * @param out The pose to write.
 * @returns `out`.
 */
export function poseStudioBones(
  rig: StudioRig,
  skeleton: Skeleton,
  pose: Float32Array,
  rootOffset: Vec3,
  eyeScale: number,
  out: StudioPose,
): StudioPose {
  const studioCount = STUDIO_BONES.length;
  for (const [i, place] of places.entries()) {
    const rotation = rotations[i] ?? new Quaternion();
    local.fromArray(pose, i * 4);
    place.fromArray(skeleton.positions[i] ?? [0, 0, 0]);
    const parentIndex = skeleton.parents[i] ?? -1;
    const parent = rotations[parentIndex];
    const parentPlace = places[parentIndex];
    if (!parent || !parentPlace || parentIndex >= i) {
      rotation.copy(local);
      place.add(offset.fromArray(rootOffset));
    } else {
      place
        .sub(offset.fromArray(skeleton.positions[parentIndex] ?? [0, 0, 0]))
        .applyQuaternion(parent)
        .add(parentPlace);
      rotation.multiplyQuaternions(parent, local);
    }
    writeMatrix(
      out.matrices,
      studioCount + i,
      rotation,
      bind.fromArray(skeleton.positions[i] ?? [0, 0, 0]),
      place,
    );
  }

  // The rigid bones of the studio move as their bones of the player.
  for (let s = 0; s < studioCount; s++) {
    out.matrices.copyWithin(
      s * 16,
      (studioCount + (rig.follows[s] ?? 0)) * 16,
      (studioCount + (rig.follows[s] ?? 0) + 1) * 16,
    );
  }
  for (const eye of ['eye_L', 'eye_R'] as const) {
    const s = STUDIO_BONES.indexOf(eye);
    const a = rig.follows[s] ?? 0;
    // T(place) R S T(-bind): the eye scales on y around its bone.
    scaleY.makeScale(1, eyeScale, 1);
    matrix.makeRotationFromQuaternion(rotations[a] ?? new Quaternion()).multiply(scaleY);
    bind.fromArray(skeleton.positions[a] ?? [0, 0, 0]).applyMatrix4(matrix);
    const p = places[a] ?? new Vector3();
    matrix.setPosition(p.x - bind.x, p.y - bind.y, p.z - bind.z);
    matrix.toArray(out.matrices, s * 16);
  }

  chestInverse.copy(rotations[boneIndex('chest')] ?? new Quaternion()).invert();
  for (const arm of [rig.arms.L, rig.arms.R]) {
    poseArm(rig, arm, pose, out);
    // The corrective weight: the place of the upper arm on the way from the bind pose of the
    // studio to the pose of the sheet, in the axes of the chest.
    current.copy(upper).applyQuaternion(chestInverse);
    span.fromArray(arm.sheet).sub(upperBind.fromArray(arm.upper));
    const weight = current.sub(upperBind).dot(span) / span.lengthSq();
    out.correctives[arm.side === 'L' ? 0 : 1] = Math.min(1, Math.max(0, weight));
  }
  return out;
}

/**
 * Writes the bones of one arm of a studio body: the upper arm, the forearm, the twist bone, the
 * paw, and the fingers. It leaves the module vector `upper` at the posed direction of the upper
 * arm.
 *
 * @param rig The studio rig.
 * @param arm The arm.
 * @param pose The local rotations of the bones of the player.
 * @param out The pose to write.
 */
function poseArm(rig: StudioRig, arm: StudioArm, pose: Float32Array, out: StudioPose): void {
  const h = rig.body.heads;
  shoulder.copy(places[arm.drivers.upper] ?? shoulder);
  elbow.copy(places[arm.drivers.fore] ?? elbow);
  wrist.copy(places[arm.drivers.hand] ?? wrist);
  upper.subVectors(elbow, shoulder).normalize();
  fore.subVectors(wrist, elbow).normalize();
  hinge.crossVectors(upper, fore);
  if (hinge.lengthSq() < 1e-8) {
    // A straight arm has no plane: the elbow axis of the player, +x in its bind pose, turns
    // with the upper arm of the player.
    hinge.set(1, 0, 0).applyQuaternion(rotations[arm.drivers.upper] ?? local);
  }
  upperBind.fromArray(arm.upper);
  foreBind.fromArray(arm.fore);
  hingeBind.fromArray(arm.hinge);
  alignFrames(upperBind, hingeBind, upper, hinge, upperTurn);
  alignFrames(foreBind, hingeBind, fore, hinge, foreTurn);

  // The paw turns in the plane of its palm toward the forearm. The x axis of the hand of the
  // player is the normal of its palm, so the turn is around it.
  const hand = rotations[arm.drivers.hand] ?? local;
  inHand.copy(fore).applyQuaternion(relative.copy(hand).invert());
  const inPlane = Math.hypot(inHand.y, inHand.z);
  const [low, high] = PAW_TURN.fade;
  const fade = Math.min(1, Math.max(0, (inPlane - low) / (high - low)));
  const angle = Math.atan2(-inHand.z, -inHand.y) * fade * fade * (3 - 2 * fade);
  const limited = Math.min(PAW_TURN.max, Math.max(-PAW_TURN.max, angle));
  // The right paw turns only toward the baton (PAW_TURN).
  palmTurn.setFromAxisAngle(X_AXIS, arm.side === 'R' ? Math.max(0, limited) : limited);
  paw.fromArray(arm.paw);
  handTurn.copy(hand).multiply(palmTurn).multiply(paw);

  // The fingers of the player curl around the z axis of the hand. The fingers of the studio take
  // the same angle around their own axis.
  const curlLocal = relative.fromArray(pose, arm.drivers.fingers * 4);
  const curl = 2 * Math.atan2(curlLocal.z, curlLocal.w) * (arm.side === 'L' ? 1 : -1);
  curlTurn.setFromAxisAngle(curlAxis.fromArray(arm.curl), curl);
  fingersTurn.copy(handTurn).multiply(curlTurn);
  relative.copy(foreTurn).invert().multiply(handTurn);
  const twist = TWIST_SHARE * twistAngle(relative, foreBind);
  twistTurn.setFromAxisAngle(foreBind, twist).premultiply(foreTurn);

  const side = arm.side;
  writeMatrix(
    out.matrices,
    arm.bones.upper,
    upperTurn,
    bind.fromArray(h[`upper_arm_${side}`]),
    shoulder,
  );
  writeMatrix(out.matrices, arm.bones.fore, foreTurn, bind.fromArray(h[`forearm_${side}`]), elbow);
  head.copy(elbow).lerp(wrist, arm.twistAt);
  writeMatrix(
    out.matrices,
    arm.bones.twist,
    twistTurn,
    bind.fromArray(h[`forearm_twist_${side}`]),
    head,
  );
  writeMatrix(out.matrices, arm.bones.hand, handTurn, bind.fromArray(h[`hand_${side}`]), wrist);
  // The fingers start at the knuckle of the turned paw.
  head
    .fromArray(h[`fingers_${side}`])
    .sub(bind.fromArray(h[`hand_${side}`]))
    .applyQuaternion(handTurn)
    .add(wrist);
  writeMatrix(
    out.matrices,
    arm.bones.fingers,
    fingersTurn,
    bind.fromArray(h[`fingers_${side}`]),
    head,
  );
}

/**
 * Moves the vertices of a studio mesh to a pose, as the GPU does (design 4.4): the corrective
 * shapes by their weights in the bind pose, then the blend of up to four bones.
 *
 * @param mesh The studio mesh.
 * @param pose The pose of the bones.
 * @param out The posed places, three numbers for each vertex. A new array by default.
 * @returns `out`.
 */
export function skinStudioMesh(
  mesh: StudioMesh,
  pose: StudioPose,
  out: Float32Array = new Float32Array(mesh.positions.length),
): Float32Array {
  const m = pose.matrices;
  const count = mesh.positions.length / 3;
  for (let v = 0; v < count; v++) {
    let x = mesh.positions[v * 3] ?? 0;
    let y = mesh.positions[v * 3 + 1] ?? 0;
    let z = mesh.positions[v * 3 + 2] ?? 0;
    for (const [c, corrective] of mesh.correctives.entries()) {
      const w = pose.correctives[c] ?? 0;
      x += w * (corrective[v * 3] ?? 0);
      y += w * (corrective[v * 3 + 1] ?? 0);
      z += w * (corrective[v * 3 + 2] ?? 0);
    }
    let px = 0;
    let py = 0;
    let pz = 0;
    for (let k = 0; k < 4; k++) {
      const w = mesh.weights[v * 4 + k] ?? 0;
      if (w === 0) {
        continue;
      }
      const b = (mesh.joints[v * 4 + k] ?? 0) * 16;
      px += w * ((m[b] ?? 0) * x + (m[b + 4] ?? 0) * y + (m[b + 8] ?? 0) * z + (m[b + 12] ?? 0));
      py +=
        w * ((m[b + 1] ?? 0) * x + (m[b + 5] ?? 0) * y + (m[b + 9] ?? 0) * z + (m[b + 13] ?? 0));
      pz +=
        w * ((m[b + 2] ?? 0) * x + (m[b + 6] ?? 0) * y + (m[b + 10] ?? 0) * z + (m[b + 14] ?? 0));
    }
    out[v * 3] = px;
    out[v * 3 + 1] = py;
    out[v * 3 + 2] = pz;
  }
  return out;
}
