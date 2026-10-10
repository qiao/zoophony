import { Vector3 } from 'three';
import { below, clavicleJoint, HIP_JOINT, hipJoint, shoulderJoint } from '../body-frame.ts';
import type { BodyFrame } from '../body-frame.ts';
import { inMeters, limbTube } from '../limb-tube.ts';
import type { MeshBuilder } from '../mesh.ts';
import { addPainted } from '../painted.ts';
import { ringLoft } from '../primitives.ts';
import type { Ring } from '../primitives.ts';
import type { BoneName } from '../rig.ts';
import type { Vec3 } from '../tuples.ts';
import type { BearPalette } from './bear-palette.ts';

/**
 * The arm of the bear, in H: thick and round, as in `bear-views.png`. The paw is a broad mitten
 * with dark claws.
 */
const ARM = {
  /** The radius of the ball around the shoulder joint. */
  shoulder: 0.36,
  /** The radii of the upper arm near the shoulder and near the elbow. */
  upper: [0.33, 0.28] as const,
  /** The radii of the forearm near the elbow and at the wrist. */
  fore: [0.29, 0.25] as const,
  /** The length of the palm from the wrist to the knuckles. */
  palm: 0.24,
  /** The length of the finger block from the knuckles to the tips. */
  fingers: 0.2,
  /** The half width and the half thickness of the palm. */
  paw: [0.26, 0.2] as const,
} as const;

/** The leg of the bear, in H: a short thick column, as in `bear-views.png`. */
const LEG = {
  /** The radii of the thigh at the hip: to the side, to the front, and to the back. */
  hip: [0.48, 0.5, 0.52] as const,
  /** The radii of the thigh at the knee. */
  knee: [0.41, 0.48, 0.5] as const,
  /**
   * The side radii of the shin below the knee and at the ankle. The shin is deeper than wide, by
   * {@link LEG.shinDepth}.
   */
  shin: [0.38, 0.33] as const,
  /** The depth of the shin as a factor of its side radius. */
  shinDepth: 1.22,
  /** The length of the standing thigh, from the hip joint to the knee. */
  thigh: 0.45,
  /**
   * The distance of a standing knee in front of the hip joint: the knees are soft. The legs
   * stand under the back half of the body, behind the belly, as in `bear-views.png`.
   */
  kneeForward: 0.06,
  /** The distance of a standing ankle behind the hip joint: the shin slants back. */
  back: 0.14,
  /** The distance of a seated knee from the middle. */
  kneeSpread: 0.62,
  /** The height of the ankle above the floor. */
  ankle: 0.22,
} as const;

/** The foot of the bear, in H: a large flat paw with dark claws at the front. */
const FOOT = {
  /** The length from the heel to the toes. */
  length: 1.1,
  /** The width at the ball of the paw. */
  width: 0.7,
  /** The height above the floor at the ankle. */
  height: 0.38,
  /** The distance of the heel behind the ankle. */
  heel: 0.3,
} as const;

/** The claws of a paw: their number, their length, and their radius at the base, in H. */
const CLAW = { count: 4, length: 0.09, radius: 0.035 } as const;

/**
 * The round toes at the front of a foot, in H, one for each claw, as in `bear-views.png`: the
 * half width, the half height, and the half length of each toe, and the distance between the
 * outer toes.
 */
const TOE = { halfWidth: 0.095, halfHeight: 0.085, halfLength: 0.11, spread: 0.48 } as const;

/** The places of the arm bones and the points of the paws. */
export interface BearArms {
  /** The bind position of each arm bone. */
  readonly positions: Readonly<
    Record<
      | 'shoulderL'
      | 'upperArmL'
      | 'forearmL'
      | 'handL'
      | 'fingersL'
      | 'shoulderR'
      | 'upperArmR'
      | 'forearmR'
      | 'handR'
      | 'fingersR',
      Vec3
    >
  >;
  /** The middle of the left palm. */
  readonly palmL: Vec3;
  /** The middle of the right palm. */
  readonly palmR: Vec3;
  /** The middle of the left finger block, on its `fingers` bone. */
  readonly fingerBlockL: Vec3;
  /** The middle of the right finger block, on its `fingers` bone. */
  readonly fingerBlockR: Vec3;
}

/**
 * Makes a row of claws: small dark cones of three sides in a row across a paw.
 *
 * @param middle The middle of the row.
 * @param across The direction across the row, a unit vector.
 * @param spread The distance between the outer claws.
 * @param point The direction of each claw, a unit vector.
 * @param h The head height `H`, in meters.
 * @returns The corner list.
 */
function claws(middle: Vec3, across: Vec3, spread: number, point: Vec3, h: number): number[] {
  const axis = new Vector3(...point).normalize();
  const side = new Vector3(...across).projectOnPlane(axis).normalize();
  const up = new Vector3().crossVectors(axis, side);
  const corners: number[] = [];
  for (let k = 0; k < CLAW.count; k++) {
    const root = new Vector3(...middle).addScaledVector(
      side,
      (k / (CLAW.count - 1) - 0.5) * spread,
    );
    const base: Ring = [0, 1, 2].map((i): Vec3 => {
      const angle = ((i + 0.25) / 3) * 2 * Math.PI;
      const p = root
        .clone()
        .addScaledVector(side, Math.cos(angle) * CLAW.radius * h)
        .addScaledVector(up, Math.sin(angle) * CLAW.radius * h);
      return [p.x, p.y, p.z];
    });
    const back = root.clone().addScaledVector(axis, -CLAW.radius * h);
    const tip = root.clone().addScaledVector(axis, CLAW.length * h);
    corners.push(...ringLoft([[[back.x, back.y, back.z]], base, [[tip.x, tip.y, tip.z]]]));
  }
  return corners;
}

/**
 * Makes a row of round toes across the front of a foot: small ovals of five corners, one for
 * each claw.
 *
 * @param middle The middle of the row.
 * @param h The head height `H`, in meters.
 * @returns The corner list.
 */
function toes(middle: Vec3, h: number): number[] {
  const corners: number[] = [];
  for (let k = 0; k < CLAW.count; k++) {
    const x = middle[0] + (k / (CLAW.count - 1) - 0.5) * TOE.spread * h;
    const ring = (z: number, scale: number, turn: number): Ring =>
      Array.from({ length: 5 }, (_, i): Vec3 => {
        const angle = ((i + turn) / 5) * 2 * Math.PI;
        return [
          x + Math.cos(angle) * TOE.halfWidth * scale * h,
          middle[1] + Math.sin(angle) * TOE.halfHeight * scale * h,
          middle[2] + z * h,
        ];
      });
    corners.push(
      ...ringLoft([
        [[x, middle[1], middle[2] + TOE.halfLength * h]],
        ring(TOE.halfLength * 0.5, 0.85, 0),
        ring(-TOE.halfLength * 0.5, 0.85, 0.5),
        [[x, middle[1], middle[2] - TOE.halfLength * h]],
      ]),
    );
  }
  return corners;
}

/**
 * Adds the two arms of the bear in the bind pose: the arms hang down beside the body (design
 * 4.7). Each arm has a round shoulder that sinks into the torso, a thick upper arm and forearm,
 * and a broad paw of a palm and a finger block with dark claws.
 *
 * @param builder The mesh that gets the parts.
 * @param palette The colors of the bear.
 * @param frame The frame of the body.
 * @returns The places of the arm bones and the points of the paws.
 */
export function addBearArms(
  builder: MeshBuilder,
  palette: BearPalette,
  frame: BodyFrame,
): BearArms {
  const arm = (side: -1 | 1) => {
    const { h, proportions } = frame;
    const left = side < 0;
    const shoulder = shoulderJoint(frame, side);
    const elbow = below(shoulder, proportions.upperArm * h);
    const wrist = below(elbow, proportions.forearm * h);
    const knuckles = below(wrist, ARM.palm * h);
    const tips = below(knuckles, ARM.fingers * h);
    const forward: Vec3 = [0, 0, -1];
    const name = (base: 'upperArm' | 'forearm' | 'hand' | 'fingers'): BoneName =>
      `${base}${left ? 'L' : 'R'}`;
    const fur = () => palette.fur;

    // The upper arm starts in a ball around the shoulder joint, so that the shoulder stays round
    // in each turn of the arm.
    const r = ARM.shoulder;
    const length = r + proportions.upperArm;
    const along = (fromJoint: number): number => (r + fromJoint * proportions.upperArm) / length;
    const [upperTop, upperBottom] = ARM.upper;
    addPainted(
      builder,
      limbTube(
        below(shoulder, -r * h),
        elbow,
        inMeters(h, [
          [0, 0, 0, 0],
          [(0.3 * r) / length, 0.7 * r, 0.7 * r, 0.7 * r],
          [along(0), r, r, r],
          [along(0.4), upperTop, upperTop * 1.05, upperTop],
          [along(0.8), upperBottom * 1.05, upperBottom * 1.08, upperBottom],
          [along(1.1), upperBottom, upperBottom, upperBottom],
        ]),
        forward,
        side * 110,
      ),
      name('upperArm'),
      fur,
    );

    // The forearm starts in a dome around the elbow joint, so that a bent elbow shows no gap
    // on its outer side.
    const [foreTop, foreBottom] = ARM.fore;
    const dome = foreTop / proportions.forearm;
    addPainted(
      builder,
      limbTube(
        elbow,
        wrist,
        inMeters(h, [
          [-dome, 0, 0, 0],
          [-0.7 * dome, foreTop * 0.7, foreTop * 0.7, foreTop * 0.7],
          [-0.12, foreTop * 0.95, foreTop, foreTop * 0.95],
          [0.3, foreTop * 1.05, foreTop * 1.1, foreTop],
          [0.75, foreBottom * 1.05, foreBottom * 1.08, foreBottom],
          [1.05, foreBottom, foreBottom, foreBottom],
        ]),
        forward,
        side * 120,
      ),
      name('forearm'),
      fur,
    );

    // The paw: the palm on the hand bone, and the finger block with the claws on the fingers bone.
    const [pawWidth, pawThick] = ARM.paw;
    addPainted(
      builder,
      limbTube(
        below(wrist, -0.04 * h),
        knuckles,
        inMeters(h, [
          [0, pawWidth * 0.85, pawThick, pawThick],
          [0.5, pawWidth, pawThick * 1.05, pawThick],
          [1, pawWidth * 0.98, pawThick * 0.95, pawThick * 0.9],
        ]),
        forward,
        side * 130,
      ),
      name('hand'),
      fur,
    );
    addPainted(
      builder,
      limbTube(
        below(knuckles, -0.04 * h),
        tips,
        inMeters(h, [
          [0, pawWidth * 0.98, pawThick * 0.95, pawThick * 0.9],
          [0.55, pawWidth * 0.92, pawThick * 0.85, pawThick * 0.8],
          [1, pawWidth * 0.7, pawThick * 0.6, pawThick * 0.55],
          [1.15, 0, 0, 0],
        ]),
        forward,
        side * 140,
      ),
      name('fingers'),
      fur,
    );
    // The claws come out of the front of the finger tips and point down and forward.
    addPainted(
      builder,
      claws(
        [tips[0], tips[1] + 0.02 * h, tips[2] - pawThick * 0.55 * h],
        [1, 0, 0],
        pawWidth * 1.2 * h,
        [0, -0.6, -0.8],
        h,
      ),
      name('fingers'),
      () => palette.dark,
    );

    return {
      clavicle: clavicleJoint(frame, side),
      shoulder,
      elbow,
      wrist,
      knuckles,
      fingerBlock: below(knuckles, ARM.fingers * 0.5 * h),
      palm: below(wrist, ARM.palm * 0.55 * h),
    };
  };

  const left = arm(-1);
  const right = arm(1);
  return {
    palmL: left.palm,
    palmR: right.palm,
    fingerBlockL: left.fingerBlock,
    fingerBlockR: right.fingerBlock,
    positions: {
      shoulderL: left.clavicle,
      upperArmL: left.shoulder,
      forearmL: left.elbow,
      handL: left.wrist,
      fingersL: left.knuckles,
      shoulderR: right.clavicle,
      upperArmR: right.shoulder,
      forearmR: right.elbow,
      handR: right.wrist,
      fingersR: right.knuckles,
    },
  };
}

/**
 * Adds the two legs of the bear in the bind pose (design 4.7): short thick columns from the hips
 * to large flat paws with dark claws. Standing, the legs go down with soft knees, as in
 * `bear-views.png`. On a seat, the thighs lie on the seat and point forward, and the shins go
 * down to the floor.
 *
 * @param builder The mesh that gets the parts.
 * @param palette The colors of the bear.
 * @param frame The frame of the body.
 * @returns The bind positions of the leg bones.
 */
export function addBearLegs(
  builder: MeshBuilder,
  palette: BearPalette,
  frame: BodyFrame,
): Readonly<Record<'thighL' | 'shinL' | 'footL' | 'thighR' | 'shinR' | 'footR', Vec3>> {
  const leg = (side: -1 | 1) => {
    const { h, footHeight } = frame;
    const left = side < 0;
    const hip = hipJoint(frame, side);
    const { forward, height } = frame.proportions.seatedKnee;
    const knee: Vec3 = frame.standing
      ? [hip[0], hip[1] - LEG.thigh * h, hip[2] - LEG.kneeForward * h]
      : frame.at(side * LEG.kneeSpread, height, HIP_JOINT.z - forward);
    const ankle: Vec3 = [
      knee[0],
      footHeight + LEG.ankle * h,
      frame.standing ? hip[2] + LEG.back * h : knee[2],
    ];
    const fur = () => palette.fur;

    // The leg is one column on the thigh bone, from inside the hips through the knee to the
    // ankle, because no pose turns the legs (design 4.7). With the shin on its own bone, the
    // baked occlusion drew a dark ring at the knee, as the cuff of trousers.
    const [hs, hf, hb] = LEG.hip;
    const [ks, kf, kb] = LEG.knee;
    const [shinTop, shinBottom] = LEG.shin;
    const top = below(hip, -0.45 * h);
    const fullLength = Math.hypot(top[1] - ankle[1], top[2] - ankle[2]);
    const thighPart = Math.hypot(top[1] - knee[1], top[2] - knee[2]) / fullLength;
    const along = (t: number): number => t * thighPart;
    const shin = (t: number): number => thighPart + t * (1 - thighPart);
    const past = 1 + (0.07 * h) / fullLength;
    const column = frame.standing
      ? limbTube(
          top,
          ankle,
          inMeters(h, [
            [0, 0, 0, 0],
            [along(0.12), hs * 0.8, hf * 0.8, hb * 0.8],
            [along(0.4), hs, hf, hb],
            [along(0.75), (hs + ks) / 2, (hf + kf) / 2, (hb + kb) / 2],
            [along(1), ks, kf, kb],
            [
              shin(0.45),
              (shinTop + shinBottom) / 2,
              ((shinTop + shinBottom) / 2) * LEG.shinDepth,
              ((shinTop + shinBottom) / 2) * LEG.shinDepth,
            ],
            [1, shinBottom, shinBottom * LEG.shinDepth, shinBottom * LEG.shinDepth],
            [past, shinBottom * 0.85, shinBottom * 0.85, shinBottom * 0.85],
          ]),
          [0, 0, -1],
          side * 150,
        )
      : [
          ...limbTube(
            top,
            knee,
            inMeters(h, [
              [0, 0, 0, 0],
              [0.12, hs * 0.8, hf * 0.8, hb * 0.8],
              [0.4, hs, hf, hb],
              [1, ks, kf, kb],
              [1.12, ks * 0.9, kf * 0.9, kb * 0.9],
            ]),
            [0, 1, 0],
            side * 150,
          ),
          ...limbTube(
            knee,
            ankle,
            inMeters(h, [
              [-0.1, shinTop * 0.95, shinTop * 0.95, shinTop * 0.95],
              [1, shinBottom, shinBottom, shinBottom],
              [
                1 + (0.07 * h) / Math.hypot(knee[1] - ankle[1], knee[2] - ankle[2]),
                shinBottom * 0.85,
                shinBottom * 0.85,
                shinBottom * 0.85,
              ],
            ]),
            [0, 0, -1],
            side * 160,
          ),
        ];
    addPainted(builder, column, left ? 'thighL' : 'thighR', fur);

    // The paw: a flat wedge from the heel to the toes on the floor, with round toes and the
    // claws at the front.
    const heelZ = ankle[2] + FOOT.heel * h;
    const toesZ = ankle[2] - (FOOT.length - FOOT.heel) * h;
    const w = FOOT.width / 2;
    const section = (t: number, width: number, rise: number): Ring => {
      const z = heelZ + (toesZ - heelZ) * t;
      const y0 = footHeight;
      const y1 = footHeight + rise * h;
      const x = width * h;
      return [
        [ankle[0] + x, y0, z],
        [ankle[0] + x * 1.02, y0 + (y1 - y0) * 0.45, z],
        [ankle[0] + x * 0.7, y0 + (y1 - y0) * 0.9, z],
        [ankle[0], y1, z],
        [ankle[0] - x * 0.7, y0 + (y1 - y0) * 0.9, z],
        [ankle[0] - x * 1.02, y0 + (y1 - y0) * 0.45, z],
        [ankle[0] - x, y0, z],
      ];
    };
    addPainted(
      builder,
      ringLoft([
        section(0, w * 0.7, FOOT.height * 0.75),
        section(0.18, w * 0.92, FOOT.height),
        section(0.5, w, FOOT.height * 0.8),
        section(0.8, w * 1.02, FOOT.height * 0.55),
        section(1, w * 0.8, FOOT.height * 0.3),
      ]),
      left ? 'footL' : 'footR',
      fur,
    );
    const toeZ = toesZ + 0.02 * h;
    const toeY = footHeight + TOE.halfHeight * h;
    addPainted(builder, toes([ankle[0], toeY, toeZ], h), left ? 'footL' : 'footR', fur);
    addPainted(
      builder,
      claws(
        [ankle[0], toeY - 0.02 * h, toeZ - TOE.halfLength * 0.8 * h],
        [1, 0, 0],
        TOE.spread * h,
        [0, -0.45, -0.9],
        h,
      ),
      left ? 'footL' : 'footR',
      () => palette.dark,
    );

    return { hip, knee, ankle };
  };

  const left = leg(-1);
  const right = leg(1);
  return {
    thighL: left.hip,
    shinL: left.knee,
    footL: left.ankle,
    thighR: right.hip,
    shinR: right.knee,
    footR: right.ankle,
  };
}
