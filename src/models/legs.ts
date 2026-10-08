import { Quaternion, Vector3 } from 'three';
import { below, hipJoint } from './body-frame.ts';
import type { BodyFrame } from './body-frame.ts';
import { partColor } from './body-parts.ts';
import type { BodyColors } from './body-parts.ts';
import { toQuat, toVec3 } from './tuples.ts';
import type { Vec3 } from './tuples.ts';
import { transform } from './mesh.ts';
import type { MeshBuilder } from './mesh.ts';
import { loft } from './primitives.ts';
import { boneIndex } from './rig.ts';
import type { BoneName } from './rig.ts';
import type { LegForm, SpeciesParams } from './species.ts';
import { sweep } from './sweep.ts';
import type { SweepRing } from './sweep.ts';

/** The bones that the legs place. */
export type LegBoneName = Extract<
  BoneName,
  'thighL' | 'shinL' | 'footL' | 'thighR' | 'shinR' | 'footR'
>;

/** The thigh of a standing body, in H. The shin reaches from the knee down to the ankle. */
export const STANDING_THIGH = 0.45;

/** A foot or a paw, in H (design 4.5). The sole is flat, and the top is round. */
export interface FootValues {
  /** The width at the widest ring. */
  readonly width: number;
  /** The length from the heel to the toes. */
  readonly length: number;
  /** The height of the top above the sole. */
  readonly height: number;
  /** The distance of the heel behind the ankle. */
  readonly heelBack: number;
}

/**
 * The rings of a leg tube, in H (design 4.5). The girth of the species scales each radius. The
 * tube starts in a round end behind the hip, which sinks into the torso.
 */
export interface LegTube {
  /** The radius of the ring at the hip joint, across the leg. */
  readonly hip: number;
  /**
   * The height of the rings of the haunch as a part of their width. Below 1, the haunch is a wide
   * oval that lies on the seat.
   */
  readonly flat: number;
  /** The length of the round end behind the hip joint. */
  readonly back: number;
  /** The radius of the round end, as a part of the radius at the hip. */
  readonly end: number;
  /**
   * The middle ring of the thigh: its place as a part of the way from the hip to the turn of the
   * knee, and its radius.
   */
  readonly middle: readonly [along: number, radius: number];
  /** The radius of the thigh at the knee. */
  readonly knee: number;
  /** The radii of the lower leg below the knee and at the ankle. */
  readonly shin: readonly [knee: number, ankle: number];
  /**
   * The depth of the lower leg from the front to the back, as a part of its width. Above 1, a
   * thick leg looks heavy from the side and keeps its width from the front.
   */
  readonly depth: number;
}

/** The place of a seated knee, in H: the bind position of the `shin` bone. */
export interface KneePlace {
  /** The distance in front of the hip joint. */
  readonly forward: number;
  /** The height above the seat. */
  readonly height: number;
}

/** The seated leg of a leg group (design 4.5), in H. */
export interface SeatedLeg {
  /** The rings of the leg tube. */
  readonly tube: LegTube;
  /** The place of the knee. */
  readonly knee: KneePlace;
  /**
   * The distance of the ankle in front of the knee. The lower leg of the hare slants a little
   * forward, as the rabbits of `lowpoly-animals.png`.
   */
  readonly ankleForward: number;
  /** The foot or the paw. */
  readonly foot: FootValues;
  /**
   * The hock of a digitigrade leg, or `null` for a lower leg that reaches down to the ankle. The
   * paw of a leg with a hock stands under the knee, and the heel of the foot is behind the paw.
   */
  readonly hock: HockValues | null;
}

/**
 * The hock of a digitigrade leg, in H (design 4.5): the joint of the lower leg and the long bones
 * of the foot, high above the floor. The `foot` bone is at the hock, and the long bones of the foot
 * and the paw are rigid parts on it. No pose turns the legs, so the leg needs no bone for the paw
 * (decision D3 of `docs/research/2026-10-07-animal-anatomy-plan.md`).
 */
export interface HockValues {
  /** The height of the hock above the foot rest. */
  readonly height: number;
  /** The distance of the hock behind the knee. */
  readonly back: number;
  /** The radius of the long bones of the foot, from the hock to the paw. */
  readonly radius: number;
  /** The distance of the paw in front of the knee. */
  readonly forward: number;
}

/** The small round paw of the hare group, until the long hare foot of stage A3. */
const PAW: FootValues = { width: 0.28, length: 0.5, height: 0.17, heelBack: 0.16 };

/**
 * The digitigrade leg (design 4.5): the haunch, a thin lower leg from the knee back to a hock 0.34 H
 * above the floor, the long bones of the foot from the hock down and forward to the paw, and a
 * small round paw under the knee, as the foxes, the cats, the wolves, and the dogs of
 * `lowpoly-animals.png`. The paw is 0.28 H wide (0.27 H in the reference) and 0.36 H long.
 */
const DIGITIGRADE = {
  tube: {
    hip: 0.4,
    flat: 0.77,
    back: 0.22,
    end: 0.7,
    middle: [0.6, 0.37],
    knee: 0.19,
    shin: [0.15, 0.11],
    depth: 1,
  },
  knee: { forward: 0.66, height: 0.22 },
  ankleForward: 0,
  foot: { width: 0.28, length: 0.36, height: 0.17, heelBack: 0.1 },
  hock: { height: 0.34, back: 0.14, radius: 0.09, forward: 0.06 },
} as const satisfies SeatedLeg;

/**
 * The seated legs of each leg group (design 4.5). The haunch lies on the seat as a part of the
 * body, and the thin lower leg hangs from the front of the seat to the floor, as the animals of
 * `lowpoly-animals.png` (`docs/research/2026-10-07-animal-anatomy-plan.md`, 3.3). The lower body
 * of 2026-10-07 had one human leg for all species: a thigh tube of 0.68 H wide, a lower leg of
 * 0.48 to 0.40 H, and a shoe of 0.65 × 0.48 H. The haunch reaches 0.31 H below the hip joint, so
 * the hip keeps its place 0.3 H above the seat. The knee is 0.22 H above the seat and 0.66 H in
 * front of the hip, so the bow and the hands of the rest pose stay in front of the belly. The
 * heavy species have a thick lower leg: 0.56 H wide and 0.73 H deep below the knee, as the polar
 * bear of `orchestra-latest.png` (0.7 to 0.9 H from the side). A wider leg touched the stand of
 * a contrabass beside the trombones, and the legs of 0.34 H radius touched each other.
 */
export const SEATED_LEGS = {
  hare: {
    tube: {
      hip: 0.44,
      flat: 0.7,
      back: 0.26,
      end: 0.7,
      middle: [0.6, 0.4],
      knee: 0.2,
      shin: [0.16, 0.12],
      depth: 1,
    },
    knee: { forward: 0.66, height: 0.22 },
    ankleForward: 0.03,
    foot: PAW,
    hock: null,
  },
  digitigrade: DIGITIGRADE,
  pillar: {
    tube: {
      hip: 0.4,
      flat: 0.77,
      back: 0.24,
      end: 0.7,
      middle: [0.6, 0.39],
      knee: 0.3,
      shin: [0.28, 0.26],
      depth: 1.3,
    },
    knee: { forward: 0.68, height: 0.24 },
    ankleForward: 0,
    foot: { width: 0.56, length: 0.7, height: 0.24, heelBack: 0.32 },
    hock: null,
  },
  'small-paw': {
    tube: {
      hip: 0.44,
      flat: 0.7,
      back: 0.26,
      end: 0.7,
      middle: [0.6, 0.4],
      knee: 0.2,
      shin: [0.16, 0.12],
      depth: 1,
    },
    knee: { forward: 0.66, height: 0.22 },
    ankleForward: 0.03,
    foot: { width: 0.26, length: 0.5, height: 0.15, heelBack: 0.16 },
    hock: null,
  },
} as const satisfies Readonly<Record<LegForm, SeatedLeg>>;

/**
 * The tube of a standing leg: the round leg of the cute bodies (spec of the cute bodies, 2.4),
 * 0.68 H wide at the hip, 0.60 and 0.48 H at the knee, and 0.40 H at the ankle. Stage A4 of the
 * anatomy plan gives the standing players their own legs.
 */
const STANDING_TUBE: LegTube = {
  hip: 0.34,
  flat: 1,
  back: 0.12,
  end: 0.8,
  middle: [0.5, 0.336],
  knee: 0.3,
  shin: [0.24, 0.2],
  depth: 1,
};

/**
 * The foot of a standing body, in H: a round shoe 0.48 wide, 0.65 long, and 0.28 high, short and
 * plump as the feet of `mockup.png` (spec of the cute bodies, 2.4).
 */
const STANDING_FOOT: FootValues = { width: 0.48, length: 0.65, height: 0.28, heelBack: 0.22 };

/** The part of the shin above the ankle that gets the color of accent feet. */
const SOCK = 0.45;

/**
 * The number of sides of the leg tube (design 4.5, facets). 8 sides give facets of the size of
 * `mockup.png` (`docs/research/2026-10-07-facet-look.md`). The tube had 10 sides before.
 */
const LEG_SIDES = 8;

/**
 * The radius of the ring at the top of the sock, as a factor of the radius of the lower leg there.
 * The calf bulges a little, as a soft muscle.
 */
const LEG_BULGE = 1.05;

/**
 * The half length of the knee of a standing body, in H: the straight leg narrows from the radius
 * of the thigh to the radius of the shin over twice this length.
 */
const STRAIGHT_KNEE = 0.08;

/**
 * The lift of the middle of the turn of a bent knee off the fold line, in H. The inner side of the
 * knee keeps a small round fold, and the outer side rises by this lift, as a knee cap.
 */
const KNEE_LIFT = 0.035;

/**
 * The rings of the foot from the heel to the toes: the distance from the heel, the half width,
 * and the height of the top, as parts of the {@link FootValues}. The sole is flat on the floor,
 * and the top is round. The heel and the toes are points.
 */
const FOOT_RINGS: readonly (readonly [along: number, halfWidth: number, top: number])[] = [
  [0, 0, 0],
  [0.04, 0.67, 0.72],
  [0.22, 0.92, 1],
  [0.56, 1, 0.96],
  [0.86, 0.92, 0.64],
  [1, 0, 0.16],
];

/** The number of corners of each ring of the foot. */
const FOOT_SEGMENTS = 8;

/** The thickness of the flat sole under the rings of the foot, in H. */
const SOLE = 0.02;

/** The turn of the foot: -90° around x, so that +y points forward (-z) and +z points up. */
const FOOT_TURN = toQuat(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2));

/**
 * Gives the corners of a foot in H, with the heel at the origin and the toes along +y. The
 * rotation {@link FOOT_TURN} points the toes forward (-z) and the top up.
 *
 * @param foot The size of the foot.
 * @returns The corners.
 */
function footCorners(foot: FootValues): number[] {
  return loft(
    FOOT_RINGS.map(([along, width, height]) => {
      const halfWidth = (width * foot.width) / 2;
      const top = height * foot.height;
      return {
        y: along * foot.length,
        halfWidth,
        front: halfWidth > 0 ? SOLE : 0,
        back: halfWidth > 0 ? top - SOLE : 0,
        z: halfWidth > 0 ? SOLE : top / 2,
      };
    }),
    FOOT_SEGMENTS,
  );
}

/** The joints of one leg in the bind pose. */
interface LegJoints {
  /** The hip joint: the bind position of the `thigh` bone. */
  readonly hip: Vec3;
  /** The knee: the bind position of the `shin` bone. */
  readonly knee: Vec3;
  /** The ankle: the bind position of the `foot` bone. */
  readonly ankle: Vec3;
}

/**
 * Adds the two legs and feet of a body in its bind pose (design 4.5). Seated, the haunches lie on
 * the seat, the knees are a little lower at the front of the seat, and the thin lower legs hang to
 * the floor. Standing, the short thighs point down. The shin reaches down to the ankle at 0.1 H,
 * so that the flat sole of the foot rests on the floor or on the foot rest.
 *
 * @param builder The mesh that gets the parts.
 * @param species The species parameters.
 * @param colors The colors of the species.
 * @param frame The frame of the body.
 * @returns The bind positions of the leg bones.
 */
export function buildLegs(
  builder: MeshBuilder,
  species: SpeciesParams,
  colors: BodyColors,
  frame: BodyFrame,
): Readonly<Record<LegBoneName, Vec3>> {
  const left = addLeg(builder, species, colors, frame, -1);
  const right = addLeg(builder, species, colors, frame, 1);

  return {
    thighL: left.hip,
    shinL: left.knee,
    footL: left.ankle,
    thighR: right.hip,
    shinR: right.knee,
    footR: right.ankle,
  };
}

/**
 * Gives the joints of one leg in the bind pose. A seated knee is at the front of the seat, and
 * the ankle is 0.1 H above the foot rest, or at the hock of a digitigrade leg. A standing knee is
 * straight below the hip.
 *
 * @param frame The frame of the body.
 * @param leg The seated leg of the species.
 * @param side -1 for the left leg, 1 for the right leg.
 * @returns The joints.
 */
function legJoints(frame: BodyFrame, leg: SeatedLeg, side: -1 | 1): LegJoints {
  const { h, standing, footHeight } = frame;
  const hip = hipJoint(frame, side);
  if (standing) {
    const knee = below(hip, STANDING_THIGH * h);
    return { hip, knee, ankle: [knee[0], footHeight + 0.1 * h, knee[2]] };
  }

  const seat = frame.at(0, 0, 0)[1];
  const knee: Vec3 = [hip[0], seat + leg.knee.height * h, hip[2] - leg.knee.forward * h];
  if (leg.hock) {
    return {
      hip,
      knee,
      ankle: [knee[0], footHeight + leg.hock.height * h, knee[2] + leg.hock.back * h],
    };
  }
  return {
    hip,
    knee,
    ankle: [knee[0], footHeight + 0.1 * h, knee[2] - leg.ankleForward * h],
  };
}

/**
 * Adds one leg: one tube from the hip through the knee to the ankle, and the foot. The thigh
 * part of the tube follows `thigh`, and the part from the knee down follows `shin`. No pose turns
 * the legs (design 4.7), so the two parts need no blend.
 *
 * @param builder The mesh that gets the parts.
 * @param species The species parameters.
 * @param colors The colors of the species.
 * @param frame The frame of the body.
 * @param side -1 for the left leg, 1 for the right leg.
 * @returns The joints of the leg.
 */
function addLeg(
  builder: MeshBuilder,
  species: SpeciesParams,
  colors: BodyColors,
  frame: BodyFrame,
  side: -1 | 1,
): LegJoints {
  const { h, standing, footHeight } = frame;
  const leg = SEATED_LEGS[species.legs];
  const joints = legJoints(frame, leg, side);
  const foot = standing ? STANDING_FOOT : leg.foot;
  const left = side < 0;

  // The rings, from the end behind the hip to the ankle. The thigh part ends in the second ring of
  // the turn of the knee, and the shin part starts there. With accent feet, the shin below the
  // sock ring has the accent color too, as the dark socks of the fox in `animals.webp`.
  const rings = legRings(frame, joints, standing ? STANDING_TUBE : leg.tube);
  const legColor = partColor(species, colors, 'legs');
  const feet = partColor(species, colors, 'feet');
  const sockColor = species.accentParts.includes('feet') ? feet : legColor;
  const options = { sides: LEG_SIDES, side: [1, 0, 0] } as const;
  const parts = [
    [rings.slice(0, KNEE_RING + 1), legColor, left ? 'thighL' : 'thighR', 'cap', 'open'],
    [rings.slice(KNEE_RING, SOCK_RING + 1), legColor, left ? 'shinL' : 'shinR', 'open', 'open'],
    [rings.slice(SOCK_RING), sockColor, left ? 'shinL' : 'shinR', 'open', 'cap'],
  ] as const;
  for (const [part, color, bone, start, end] of parts) {
    builder.add(sweep(part, { ...options, start, end }), {
      color,
      bone: boneIndex(bone),
      finish: 'fur',
    });
  }

  // The paw stands under the ankle, or under the knee on a leg with a hock.
  const footBone = boneIndex(left ? 'footL' : 'footR');
  const { ankle, knee } = joints;
  let paw: Vec3 = [ankle[0], footHeight, ankle[2]];
  if (leg.hock && !standing) {
    paw = [knee[0], footHeight, knee[2] - leg.hock.forward * h];
    const top: Vec3 = [paw[0], paw[1] + (foot.height / 2) * h, paw[2]];
    builder.add(metatarsus(frame, ankle, top, [leg.tube.shin[1], leg.hock.radius]), {
      color: sockColor,
      bone: footBone,
      finish: 'fur',
    });
  }
  builder.add(footCorners(foot), {
    color: feet,
    bone: footBone,
    at: transform([paw[0], paw[1], paw[2] + foot.heelBack * h], FOOT_TURN, [h, h, h]),
    finish: 'fur',
  });

  return joints;
}

/**
 * The length of the start of the long bones of the foot above the hock, in H. The start sinks into
 * the end of the lower leg, so the hock is one round joint.
 */
const HOCK_OVERLAP = 0.06;

/**
 * Makes the long bones of a digitigrade foot (design 4.5): a closed tube of 8 sides from a little
 * above the hock, with the radius of the lower leg, down and forward to the top of the paw.
 *
 * @param frame The frame of the body.
 * @param hock The hock joint.
 * @param paw The top of the paw, where the tube ends.
 * @param radii The radius of the lower leg at the hock, and of the long bones, in H.
 * @returns The corners.
 */
function metatarsus(
  frame: BodyFrame,
  hock: Vec3,
  paw: Vec3,
  radii: readonly [hock: number, bones: number],
): number[] {
  const size = frame.girth * frame.h;
  const from = new Vector3(...hock);
  const to = new Vector3(...paw);
  const axis = toVec3(to.clone().sub(from).normalize());
  const rings: SweepRing[] = [
    {
      at: toVec3(from.clone().addScaledVector(new Vector3(...axis), -HOCK_OVERLAP * frame.h)),
      axis,
      radius: radii[0] * size,
      turn: 0.5,
    },
    { at: toVec3(from.clone().lerp(to, 0.5)), axis, radius: radii[1] * size, turn: 0 },
    { at: toVec3(to), axis, radius: radii[1] * 0.95 * size, turn: 0.5 },
  ];
  return sweep(rings, { sides: LEG_SIDES, side: [1, 0, 0], start: 'cap', end: 'cap' });
}

/** The index of the ring of the leg where the thigh part ends and the shin part starts. */
const KNEE_RING = 4;

/** The index of the ring of the leg at the top of the sock. */
const SOCK_RING = 7;

/**
 * Gives the rings of one leg tube (design 4.5): the rounded end behind the hip, the hip, the
 * middle of the thigh, four rings around the turn of the knee, the top of the sock, and the
 * ankle. Each ring turns by half a side against its neighbors. The rings of the thigh have the
 * flat factor of the tube, the rings of the knee are round, and the rings of the lower leg have
 * the depth of the tube.
 *
 * @param frame The frame of the body.
 * @param joints The joints of the leg.
 * @param tube The rings of the tube, in H.
 * @returns The rings, in meters.
 */
function legRings(frame: BodyFrame, joints: LegJoints, tube: LegTube): SweepRing[] {
  const { h, girth, standing } = frame;
  const size = girth * h;
  const [hipR, middleR, kneeR, shinR, ankleR] = [
    tube.hip * size,
    tube.middle[1] * size,
    tube.knee * size,
    tube.shin[0] * size,
    tube.shin[1] * size,
  ] as const;
  const hip = new Vector3(...joints.hip);
  const knee = new Vector3(...joints.knee);
  const ankle = new Vector3(...joints.ankle);
  const thighAxis = knee.clone().sub(hip).normalize();
  const shinAxis = ankle.clone().sub(knee).normalize();
  const turn = standing
    ? straightKnee(knee, thighAxis, STRAIGHT_KNEE * h, [kneeR, shinR])
    : bentKnee(knee, thighAxis, shinAxis, [kneeR, shinR], KNEE_LIFT * h);
  const start = turn(0).at;
  const end = turn(1).at;
  const sockTop = ankle.clone().addScaledVector(shinAxis, -SOCK * knee.distanceTo(ankle));
  const sockShare = end.distanceTo(sockTop) / end.distanceTo(ankle);
  const behind = hip.clone().addScaledVector(thighAxis, -tube.back * h);

  const kneeRing = (part: number): [Vector3, Vector3, number, number] => {
    const { at, axis, radius } = turn(part);
    return [at, axis, radius, 1];
  };
  const places: readonly (readonly [Vector3, Vector3, number, number])[] = [
    [behind, thighAxis, hipR * tube.end, tube.flat],
    [hip, thighAxis, hipR, tube.flat],
    [hip.clone().lerp(start, tube.middle[0]), thighAxis, middleR, (tube.flat + 1) / 2],
    kneeRing(0),
    kneeRing(1 / 3),
    kneeRing(2 / 3),
    kneeRing(1),
    [sockTop, shinAxis, (shinR + (ankleR - shinR) * sockShare) * LEG_BULGE, tube.depth],
    [ankle, shinAxis, ankleR, tube.depth],
  ];
  return places.map(([at, axis, radius, flat], i) => ({
    at: toVec3(at),
    axis: toVec3(axis),
    radius,
    turn: i % 2 === 0 ? 0.5 : 0,
    flat,
  }));
}

/** One ring of the turn of a knee: its middle, the direction of the leg there, and its radius. */
interface KneeRing {
  /** The middle of the ring. */
  readonly at: Vector3;
  /** The unit direction of the leg at the ring, from the hip to the ankle. */
  readonly axis: Vector3;
  /** The radius of the ring. */
  readonly radius: number;
}

/**
 * Makes the knee of a straight leg: rings on the axis from a little above the knee to a little
 * below it, from the radius of the thigh to the radius of the shin.
 *
 * @param knee The knee joint.
 * @param axis The unit direction of the leg, from the hip to the ankle.
 * @param half The half length of the knee, in meters.
 * @param radii The radius of the thigh and of the shin at the knee.
 * @returns A function that gives the ring at a part of the knee, from 0 at the top to 1 at the
 *   bottom.
 */
function straightKnee(
  knee: Vector3,
  axis: Vector3,
  half: number,
  radii: readonly [number, number],
): (part: number) => KneeRing {
  return (part) => ({
    at: knee.clone().addScaledVector(axis, half * (2 * part - 1)),
    axis: axis.clone(),
    radius: radii[0] + (radii[1] - radii[0]) * part,
  });
}

/**
 * Makes the turn of a bent knee. The rings turn around the line where the inner sides of the
 * thigh and the shin meet, behind the knee. Thus the inner side of the knee is a fold, and the
 * outer side is a round corner, with no ball. The thigh stays straight up to the fold, so its top
 * keeps its height near the knee, where a resting hand lies (design 5.3).
 *
 * @param knee The knee joint.
 * @param thighAxis The unit direction of the thigh, from the hip to the knee.
 * @param shinAxis The unit direction of the shin, from the knee to the ankle.
 * @param radii The radius of the thigh and of the shin at the knee.
 * @param lift The lift of the middle of the turn off the fold line, in meters.
 * @returns A function that gives the ring at a part of the turn, from 0 on the thigh to 1 on the
 *   shin.
 */
function bentKnee(
  knee: Vector3,
  thighAxis: Vector3,
  shinAxis: Vector3,
  radii: readonly [number, number],
  lift: number,
): (part: number) => KneeRing {
  const angle = thighAxis.angleTo(shinAxis);
  const pivot = new Vector3().crossVectors(thighAxis, shinAxis).normalize();

  // The inner side of the thigh is toward the shin, and the inner side of the shin is toward the
  // thigh. The fold is where the two inner lines meet.
  const thighInner = new Vector3().crossVectors(pivot, thighAxis);
  const shinInner = new Vector3().crossVectors(pivot, shinAxis);
  const thighLine = knee.clone().addScaledVector(thighInner, radii[0]);
  const shinLine = knee.clone().addScaledVector(shinInner, radii[1]);
  const across = new Vector3().crossVectors(thighAxis, shinAxis);
  const t =
    new Vector3().crossVectors(shinLine.clone().sub(thighLine), shinAxis).dot(across) /
    across.lengthSq();
  const fold = thighLine.addScaledVector(thighAxis, t);

  return (part) => {
    const rotation = new Quaternion().setFromAxisAngle(pivot, angle * part);
    const radius = radii[0] + (radii[1] - radii[0]) * part;
    const outward = thighInner.clone().negate().applyQuaternion(rotation);
    return {
      at: fold.clone().addScaledVector(outward, radius + lift * Math.sin(Math.PI * part)),
      axis: thighAxis.clone().applyQuaternion(rotation),
      radius,
    };
  };
}
