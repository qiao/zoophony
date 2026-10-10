import { Vector3 } from 'three';
import { below, clavicleJoint, HIP_JOINT, hipJoint, shoulderJoint } from '../body-frame.ts';
import type { BodyFrame } from '../body-frame.ts';
import type { BodyColors } from '../body-parts.ts';
import type { MeshBuilder } from '../mesh.ts';
import { ringLoft } from '../primitives.ts';
import type { Ring } from '../primitives.ts';
import type { BoneName } from '../rig.ts';
import type { Vec3 } from '../tuples.ts';
import { addPainted, jitter } from './fox-paint.ts';
import type { Paint } from './fox-paint.ts';

/** The number of corners of each ring of a limb. */
const LIMB_SEGMENTS = 9;

/** The largest radial offset of a corner of a limb, as a part of its radius. */
const LIMB_JITTER = 0.05;

/**
 * The arm of the fox, in H: the radius of the shoulder ball, and the radii of the upper arm and
 * the forearm at their ends. The lower part of the forearm is dark, as the gloves of
 * `fox-views.png`.
 */
const ARM = {
  /** The radius of the ball around the shoulder joint. */
  shoulder: 0.21,
  /** The radii of the upper arm near the shoulder and near the elbow. */
  upper: [0.2, 0.155] as const,
  /** The radii of the forearm near the elbow and at the wrist. */
  fore: [0.165, 0.14] as const,
  /** The part of the forearm above the wrist that is dark. */
  glove: 0.3,
} as const;

/**
 * The leg of the fox, in H. The thigh is a long full haunch, the shin is slim, and the lower
 * part of the shin is dark, as the socks of `fox-views.png`.
 */
const LEG = {
  /** The radii of the thigh at the hip: to the side, up, and down. */
  hip: [0.33, 0.33, 0.28] as const,
  /** The radii of the thigh in its middle: to the side, up, and down. */
  middle: [0.37, 0.36, 0.3] as const,
  /**
   * The radii of the thigh at the knee: to the side, up, and down. The large down radius makes
   * the knee bulge over the top of the shin, as in `fox-views.png`.
   */
  knee: [0.25, 0.26, 0.34] as const,
  /** The radii of the shin at the knee and at the ankle. */
  shin: [0.2, 0.16] as const,
  /** The distance of a seated knee from the middle: the knees come together. */
  kneeSpread: 0.33,
  /** The distance of a seated ankle from the middle. */
  ankleSpread: 0.27,
  /**
   * The height of the dark sock above the floor, in meters. The sock starts just under the knee
   * bulge, as in `fox-views.png`.
   */
  sock: 0.29,
  /** The height of the ankle above the floor or the foot rest. */
  ankle: 0.18,
  /** The distance of a seated ankle behind the knee: the shin leans back, as in the sheet. */
  slant: 0.06,
  /** The length of a standing thigh. */
  standingThigh: 0.55,
} as const;

/** The foot of the fox, in H: a small dark paw. */
const FOOT = {
  /** The length from the heel to the toes. */
  length: 0.4,
  /** The width at the ball of the paw. */
  width: 0.34,
  /** The height above the ankle end of the sole. */
  height: 0.3,
  /** The distance of the heel behind the ankle. */
  heel: 0.1,
} as const;

/** The places of the arm bones and the points of the hands. */
export interface FoxArms {
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
 * Makes a limb tube along an axis through rings of oval sections. Every second ring turns by
 * half a step, and each corner has a small fixed offset.
 *
 * @param from The start of the axis.
 * @param to The end of the axis.
 * @param sections The rings: the place along the axis from 0 to 1, the side radius, and the
 *   radii toward `up` and away from it. A radius of 0 makes an end point.
 * @param up A direction across the axis.
 * @param seed The seed of the offsets.
 * @returns The corner list.
 */
export function limbTube(
  from: Vec3,
  to: Vec3,
  sections: readonly (readonly [t: number, side: number, up: number, down: number])[],
  up: Vec3,
  seed: number,
): number[] {
  const start = new Vector3(...from);
  const axis = new Vector3(...to).sub(start);
  const v = new Vector3(...up).projectOnPlane(axis.clone().normalize()).normalize();
  const u = new Vector3().crossVectors(v, axis).normalize();
  const rings: Ring[] = sections.map(([t, side, upRadius, downRadius], j) => {
    const middle = start.clone().addScaledVector(axis, t);
    if (side === 0) {
      return [[middle.x, middle.y, middle.z]];
    }
    const turn = j % 2 === 0 ? 0 : 0.5;
    return Array.from({ length: LIMB_SEGMENTS }, (_, i) => {
      const angle = ((i + turn) / LIMB_SEGMENTS) * 2 * Math.PI;
      const sin = Math.sin(angle);
      const scale = 1 + LIMB_JITTER * jitter(seed + j, i);
      const p = middle
        .clone()
        .addScaledVector(u, Math.cos(angle) * side * scale)
        .addScaledVector(v, sin * (sin >= 0 ? upRadius : downRadius) * scale);
      return [p.x, p.y, p.z];
    });
  });
  return ringLoft(rings);
}

/**
 * Adds the two arms of the fox in the bind pose: the arms hang down beside the body (design
 * 4.7). Each arm has a round shoulder that sinks into the torso, a slim upper arm, a forearm with
 * a dark glove, and a dark mitten hand of a palm and a finger block.
 *
 * @param builder The mesh that gets the parts.
 * @param colors The colors of the species.
 * @param frame The frame of the body.
 * @returns The places of the arm bones and the points of the hands.
 */
export function addFoxArms(builder: MeshBuilder, colors: BodyColors, frame: BodyFrame): FoxArms {
  const arm = (side: -1 | 1) => {
    const { h, proportions } = frame;
    const left = side < 0;
    const shoulder = shoulderJoint(frame, side);
    const elbow = below(shoulder, proportions.upperArm * h);
    const wrist = below(elbow, proportions.forearm * h);
    const knuckles = below(wrist, 0.12 * h);
    const fingerBlock = below(knuckles, 0.05 * h);
    const forward: Vec3 = [0, 0, -1];
    const name = (base: 'upperArm' | 'forearm' | 'hand' | 'fingers'): BoneName =>
      `${base}${left ? 'L' : 'R'}`;

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
          [along(0.35), upperTop, upperTop * 1.05, upperTop],
          [along(0.75), upperBottom * 1.05, upperBottom * 1.1, upperBottom],
          [along(1.08), upperBottom, upperBottom, upperBottom],
        ]),
        forward,
        side * 10,
      ),
      name('upperArm'),
      () => colors.fur,
    );

    const gloveFrom = 1 - ARM.glove;
    const [foreTop, foreBottom] = ARM.fore;
    const forearm = limbTube(
      elbow,
      wrist,
      inMeters(h, [
        [-0.08, foreTop * 0.95, foreTop, foreTop * 0.95],
        [0.3, foreTop * 1.05, foreTop * 1.1, foreTop],
        [gloveFrom, foreBottom * 1.05, foreBottom * 1.08, foreBottom],
        [1.04, foreBottom, foreBottom, foreBottom],
      ]),
      forward,
      side * 20,
    );
    const gloveTop = elbow[1] - gloveFrom * proportions.forearm * h;
    addPainted(builder, forearm, name('forearm'), (centroid) =>
      centroid[1] < gloveTop ? colors.accent : colors.fur,
    );

    // The mitten: the palm on the hand bone, and the finger block on the fingers bone.
    addPainted(
      builder,
      limbTube(
        below(wrist, -0.02 * h),
        knuckles,
        inMeters(h, [
          [0, 0.1, 0.09, 0.09],
          [0.45, 0.125, 0.105, 0.1],
          [1, 0.12, 0.1, 0.09],
        ]),
        forward,
        side * 30,
      ),
      name('hand'),
      () => colors.accent,
    );
    addPainted(
      builder,
      limbTube(
        below(knuckles, -0.02 * h),
        below(fingerBlock, 0.07 * h),
        inMeters(h, [
          [0, 0.12, 0.09, 0.085],
          [0.5, 0.115, 0.09, 0.08],
          [0.9, 0.075, 0.065, 0.055],
          [1, 0, 0, 0],
        ]),
        forward,
        side * 40,
      ),
      name('fingers'),
      () => colors.accent,
    );

    return {
      clavicle: clavicleJoint(frame, side),
      shoulder,
      elbow,
      wrist,
      knuckles,
      fingerBlock,
      palm: below(wrist, 0.08 * h),
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
 * Scales the radii of limb sections from head heights to meters.
 *
 * @param h The head height `H`, in meters.
 * @param sections The sections of {@link limbTube}, with the radii in H.
 * @returns The sections with the radii in meters.
 */
function inMeters(
  h: number,
  sections: readonly (readonly [number, number, number, number])[],
): [number, number, number, number][] {
  return sections.map(([t, s, a, b]) => [t, s * h, a * h, b * h]);
}

/**
 * Adds the two legs of the fox in the bind pose (design 4.7). Seated, the full thighs lie on the
 * seat and point forward, the knees bend, and the slim shins go down to the small dark paws.
 * Standing, the thighs point down.
 *
 * @param builder The mesh that gets the parts.
 * @param colors The colors of the species.
 * @param frame The frame of the body.
 * @returns The bind positions of the leg bones.
 */
export function addFoxLegs(
  builder: MeshBuilder,
  colors: BodyColors,
  frame: BodyFrame,
): Readonly<Record<'thighL' | 'shinL' | 'footL' | 'thighR' | 'shinR' | 'footR', Vec3>> {
  const leg = (side: -1 | 1) => {
    const { h, standing, footHeight, proportions } = frame;
    const left = side < 0;
    const hip = hipJoint(frame, side);
    const { forward, height } = proportions.seatedKnee;
    const knee = standing
      ? below(hip, LEG.standingThigh * h)
      : frame.at(side * LEG.kneeSpread, height, HIP_JOINT.z - forward);
    const ankle: Vec3 = [
      standing ? knee[0] : side * LEG.ankleSpread * h,
      footHeight + LEG.ankle * h,
      knee[2] + (standing ? 0 : LEG.slant * h),
    ];
    const fur: Paint = () => colors.fur;

    // The thigh: a full haunch from behind the hip joint to the knee.
    const [hs, hu, hd] = LEG.hip;
    const [ms, mu, md] = LEG.middle;
    const [ks, ku, kd] = LEG.knee;
    const thighUp: Vec3 = standing ? [0, 0, -1] : [0, 1, 0];
    addPainted(
      builder,
      limbTube(
        hip,
        knee,
        inMeters(h, [
          [-0.42, 0, 0, 0],
          [-0.3, hs * 0.75, hu * 0.75, hd * 0.75],
          [-0.08, hs, hu, hd],
          [0.35, ms, mu, md],
          [0.75, ks * 1.1, ku * 1.1, kd * 1.05],
          [1.05, ks, ku, kd],
          [1.2, 0, 0, 0],
        ]),
        thighUp,
        side * 50,
      ),
      left ? 'thighL' : 'thighR',
      fur,
    );

    // The shin hangs from inside the round end of the thigh to the ankle, with a dark sock below
    // the sock height. A ring of the shin lies at the sock height, so that the border of the sock
    // follows the ring.
    const [shinTop, shinBottom] = LEG.shin;
    const sockY = footHeight + Math.min(LEG.sock, knee[1] - footHeight - 0.1 * h);
    const sockAt = (knee[1] - sockY) / (knee[1] - ankle[1]);
    const radiusAt = (t: number): number => shinTop + (shinBottom - shinTop) * t;
    const sections: [number, number, number, number][] = [
      [-0.04, 0, 0, 0],
      [0, shinTop * 0.85, shinTop * 0.85, shinTop * 0.85],
      [0.2, shinTop, shinTop * 1.05, shinTop],
      [sockAt, radiusAt(sockAt), radiusAt(sockAt), radiusAt(sockAt)],
      [1, shinBottom, shinBottom, shinBottom],
      [1.08, shinBottom * 0.8, shinBottom * 0.8, shinBottom * 0.8],
    ];
    addPainted(
      builder,
      limbTube(
        knee,
        ankle,
        inMeters(
          h,
          sections.toSorted((a, b) => a[0] - b[0]),
        ),
        [0, 0, -1],
        side * 60,
      ),
      left ? 'shinL' : 'shinR',
      (centroid) => (centroid[1] < sockY ? colors.accent : colors.fur),
    );

    // The paw: a small dark wedge from the heel to the toes, flat on the floor.
    const heel: Vec3 = [ankle[0], footHeight, ankle[2] + FOOT.heel * h];
    const toes: Vec3 = [ankle[0], footHeight, ankle[2] - (FOOT.length - FOOT.heel) * h];
    const w = FOOT.width / 2;
    const top = FOOT.height;
    const section = (t: number, width: number, rise: number): Ring => {
      const z = heel[2] + (toes[2] - heel[2]) * t;
      const y0 = footHeight;
      const y1 = footHeight + rise * h;
      const x = width * h;
      return [
        [ankle[0] + x, y0, z],
        [ankle[0] + x * 0.95, y0 + (y1 - y0) * 0.6, z],
        [ankle[0], y1, z],
        [ankle[0] - x * 0.95, y0 + (y1 - y0) * 0.6, z],
        [ankle[0] - x, y0, z],
      ];
    };
    addPainted(
      builder,
      ringLoft([
        section(0, w * 0.75, top * 0.8),
        section(0.25, w, top),
        section(0.6, w * 1.08, top * 0.8),
        section(0.88, w * 0.95, top * 0.55),
        section(1, w * 0.55, top * 0.3),
      ]),
      left ? 'footL' : 'footR',
      () => colors.accent,
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
