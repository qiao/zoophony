import { Quaternion, Vector3 } from 'three';
import { hipJoint } from './body-frame.ts';
import type { BodyFrame } from './body-frame.ts';
import { partColor } from './body-parts.ts';
import type { BodyColors } from './body-parts.ts';
import { toQuat, toVec3 } from './tuples.ts';
import type { Vec3 } from './tuples.ts';
import { splitByField, transform } from './mesh.ts';
import type { MeshBuilder } from './mesh.ts';
import { loft } from './primitives.ts';
import { boneIndex } from './rig.ts';
import type { BoneName } from './rig.ts';
import { plumpOf } from './species.ts';
import type { LegForm, SpeciesParams } from './species.ts';
import { DEFAULT_BELLY } from './trunk.ts';
import { sweep } from './sweep.ts';
import type { SweepRing } from './sweep.ts';

/** The bones that the legs place. */
export type LegBoneName = Extract<
  BoneName,
  'thighL' | 'shinL' | 'footL' | 'thighR' | 'shinR' | 'footR'
>;

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

/**
 * The seated leg of a leg group (design 4.5), in H. The skeleton of the species gives the place of
 * the knee (`seatedKnee` of `proportions.ts`).
 */
export interface SeatedLeg {
  /** The rings of the leg tube. */
  readonly tube: LegTube;
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

/**
 * The long flat foot of the hare (design 4.5): 0.81 H long, three times its width of 0.27 H, as the
 * rabbits of `lowpoly-animals.png` (0.8 to 0.9 H by 0.27 H). The heel is 0.40 H behind the ankle,
 * so that the toes end 1.10 H in front of the hip, within the 1.11 H that keeps the music stands
 * clear. The plan had a heel of 0.36 H behind a knee 0.55 H in front of the hip.
 */
const HARE_FOOT: FootValues = { width: 0.27, length: 0.81, height: 0.15, heelBack: 0.4 };

/** The small hoof of the deer: narrower and higher than the paw. */
const HOOF: FootValues = { width: 0.2, length: 0.26, height: 0.18, heelBack: 0.08 };

/** The small paw of the small-paw group. */
const SMALL_PAW: FootValues = { width: 0.26, length: 0.5, height: 0.15, heelBack: 0.16 };

/**
 * The small flat paddle foot of the penguin (decision D9 of the anatomy plan), 0.30 H wide and
 * 0.46 H long, as the orange feet of the penguins of `orchestra-latest.png` and
 * `orchestra-side.png`. The heel is under the ankle, and the standing ankle is 0.16 H in front of
 * the knee, so that the toes show in front of the hem from the camera above.
 */
const PADDLE: FootValues = { width: 0.3, length: 0.46, height: 0.09, heelBack: 0.02 };

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
 * the hip keeps its place 0.3 H above the seat. The skeleton of the species gives the knee
 * (`SEATED_KNEES` of `proportions.ts`): 0.22 H above the seat and 0.66 H in front of the hip by
 * default. The heavy species have a thick lower leg: 0.56 H wide and 0.73 H deep below the knee, as the polar
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
    ankleForward: 0.03,
    foot: HARE_FOOT,
    hock: null,
  },
  digitigrade: DIGITIGRADE,
  hoofed: { ...DIGITIGRADE, foot: HOOF },
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
    ankleForward: 0.03,
    foot: SMALL_PAW,
    hock: null,
  },
  // No seat of the cast seats a penguin. A seated penguin gets the seated small-paw leg.
  webbed: {
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
    ankleForward: 0.03,
    foot: SMALL_PAW,
    hock: null,
  },
} as const satisfies Readonly<Record<LegForm, SeatedLeg>>;

/** The place of a standing knee, in H: the bind position of the `shin` bone. */
export interface StandingKnee {
  /** The distance in front of the hip joint. */
  readonly forward: number;
  /** The distance below the hip joint. */
  readonly drop: number;
}

/** The standing leg of a leg group (design 4.5), in H. */
export interface StandingLeg {
  /** The rings of the leg tube, or `null` for a body that shows no leg. */
  readonly tube: LegTube | null;
  /** The distance of the knee and the ankle from the middle of the body, times the girth. */
  readonly spread: number;
  /** The place of the knee. */
  readonly knee: StandingKnee;
  /** The distance of the ankle in front of the knee. */
  readonly ankleForward: number;
  /** The foot or the paw. */
  readonly foot: FootValues;
  /** The hock of a digitigrade leg, or `null` for a lower leg that reaches down to the ankle. */
  readonly hock: HockValues | null;
  /**
   * Whether the radii, the spread, and the foot grow with the plump factor of the species
   * ({@link plumpOf}), as the torso does.
   */
  readonly plump: boolean;
}

/**
 * The thin standing leg of the hare and small-paw groups: a thigh of 0.64 H below the torso, a
 * lower leg of 0.30 to 0.24 H, and the knee 0.06 H forward, as the seated lower leg.
 */
const THIN_STANDING_TUBE: LegTube = {
  hip: 0.32,
  flat: 1,
  back: 0.12,
  end: 0.8,
  middle: [0.5, 0.27],
  knee: 0.18,
  shin: [0.15, 0.12],
  depth: 1,
};

/**
 * The standing digitigrade leg: the knee 0.14 H forward and 0.58 H above the floor, the lower leg
 * back to a hock 0.30 H above the floor, and the long bones of the foot down to the paw under the
 * knee, as a fox that stands on its hind legs.
 */
const DIGITIGRADE_STANDING = {
  tube: {
    hip: 0.3,
    flat: 1,
    back: 0.12,
    end: 0.8,
    middle: [0.5, 0.25],
    knee: 0.17,
    shin: [0.14, 0.1],
    depth: 1,
  },
  spread: 0.3,
  knee: { forward: 0.14, drop: 0.36 },
  ankleForward: 0,
  foot: DIGITIGRADE.foot,
  hock: { height: 0.3, back: 0.18, radius: 0.08, forward: 0.02 },
  plump: false,
} as const satisfies StandingLeg;

/**
 * The standing legs of each leg group (design 4.5).
 *
 * - `hare`, `small-paw`: a thin leg, a little bent at the knee, on the foot of the seated leg.
 * - `digitigrade`, `hoofed`: the knee forward and the hock back, on the paw or the hoof.
 * - `webbed`: no leg tube. The hem of the torso hides the legs, and the paddle feet stand under
 *   it (decision D9 of the anatomy plan).
 * - `pillar`: a short column with no knee narrowing, on a round pad, as the bear of
 *   `orchestra-latest.png` (legs about 0.8 H long and 0.75 H wide below the body). The leg grows
 *   with the plump factor, so the leg of the bear (1.25) is 0.75 H wide and the knees are 0.85 H
 *   apart: the two legs stand as wide as the torso, 0.1 H apart.
 */
export const STANDING_LEGS = {
  hare: {
    tube: THIN_STANDING_TUBE,
    spread: 0.3,
    knee: { forward: 0.06, drop: 0.42 },
    ankleForward: 0,
    foot: HARE_FOOT,
    hock: null,
    plump: false,
  },
  digitigrade: DIGITIGRADE_STANDING,
  hoofed: { ...DIGITIGRADE_STANDING, foot: HOOF },
  pillar: {
    tube: {
      hip: 0.3,
      flat: 1,
      back: 0.12,
      end: 0.8,
      middle: [0.5, 0.31],
      knee: 0.3,
      shin: [0.3, 0.28],
      depth: 1.1,
    },
    spread: 0.34,
    knee: { forward: 0.03, drop: 0.45 },
    ankleForward: 0,
    foot: { width: 0.62, length: 0.72, height: 0.22, heelBack: 0.3 },
    hock: null,
    plump: true,
  },
  'small-paw': {
    tube: THIN_STANDING_TUBE,
    spread: 0.3,
    knee: { forward: 0.06, drop: 0.42 },
    ankleForward: 0,
    foot: SMALL_PAW,
    hock: null,
    plump: false,
  },
  webbed: {
    tube: null,
    spread: 0.24,
    knee: { forward: 0, drop: 0.42 },
    ankleForward: 0.16,
    foot: PADDLE,
    hock: null,
    plump: false,
  },
} as const satisfies Readonly<Record<LegForm, StandingLeg>>;

/** One leg of a body: the values of its group for the stance, scaled by the plump factor. */
interface LegBuild {
  /** The rings of the leg tube, or `null` for no tube. */
  readonly tube: LegTube | null;
  /** The foot or the paw. */
  readonly foot: FootValues;
  /** The hock, or `null`. */
  readonly hock: HockValues | null;
  /** The joints of the leg. */
  readonly joints: LegJoints;
}

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
 * The largest angle between the thigh and the shin of a straight knee, in radians. A knee that
 * bends more gets the turn of a bent knee.
 */
const STRAIGHT_ANGLE = 0.05;

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
  if (frame.standing && species.legs === 'webbed') {
    addHem(builder, species, colors, frame);
  }

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
 * Gives one leg of a body in the bind pose: the values of its leg group for the stance, and the
 * joints. A seated knee is at the front of the seat. A standing knee is below the hip, at the
 * spread of its group. The ankle is 0.1 H above the foot rest, or at the hock of a digitigrade
 * leg.
 *
 * @param species The species parameters.
 * @param frame The frame of the body.
 * @param side -1 for the left leg, 1 for the right leg.
 * @returns The leg.
 */
function legBuild(species: SpeciesParams, frame: BodyFrame, side: -1 | 1): LegBuild {
  const { h, girth, standing, footHeight } = frame;
  const hip = hipJoint(frame, side);

  let leg: LegBuild;
  let knee: Vec3;
  if (standing) {
    const values = STANDING_LEGS[species.legs];
    const k = values.plump ? plumpOf(species) : 1;
    knee = [
      side * values.spread * girth * k * h,
      hip[1] - values.knee.drop * h,
      hip[2] - values.knee.forward * h,
    ];
    leg = {
      tube: values.tube ? scaleTube(values.tube, k) : null,
      foot: scaleFoot(values.foot, k),
      hock: values.hock ? { ...values.hock, radius: values.hock.radius * k } : null,
      joints: {
        hip,
        knee,
        ankle: [knee[0], footHeight + 0.1 * h, knee[2] - values.ankleForward * h],
      },
    };
  } else {
    const values = SEATED_LEGS[species.legs];
    const seat = frame.at(0, 0, 0)[1];
    const { seatedKnee } = frame.proportions;
    knee = [hip[0], seat + seatedKnee.height * h, hip[2] - seatedKnee.forward * h];
    leg = {
      tube: values.tube,
      foot: values.foot,
      hock: values.hock,
      joints: {
        hip,
        knee,
        ankle: [knee[0], footHeight + 0.1 * h, knee[2] - values.ankleForward * h],
      },
    };
  }

  if (!leg.hock) {
    return leg;
  }
  const ankle: Vec3 = [knee[0], footHeight + leg.hock.height * h, knee[2] + leg.hock.back * h];
  return { ...leg, joints: { hip, knee, ankle } };
}

/**
 * Scales the radii of a leg tube by a factor.
 *
 * @param tube The tube.
 * @param k The factor.
 * @returns The scaled tube.
 */
function scaleTube(tube: LegTube, k: number): LegTube {
  return {
    ...tube,
    hip: tube.hip * k,
    middle: [tube.middle[0], tube.middle[1] * k],
    knee: tube.knee * k,
    shin: [tube.shin[0] * k, tube.shin[1] * k],
  };
}

/**
 * Scales the width, the length, and the heel of a foot by a factor. The height stays.
 *
 * @param foot The foot.
 * @param k The factor.
 * @returns The scaled foot.
 */
function scaleFoot(foot: FootValues, k: number): FootValues {
  return { ...foot, width: foot.width * k, length: foot.length * k, heelBack: foot.heelBack * k };
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
  const { h, footHeight } = frame;
  const { tube, foot, hock, joints } = legBuild(species, frame, side);
  const left = side < 0;
  const legColor = partColor(species, colors, 'legs');
  const shinColor = partColor(species, colors, 'lower-legs', legColor);
  const feet = partColor(species, colors, 'feet');
  const sockColor = species.accentParts.includes('feet') ? feet : shinColor;

  // The rings, from the end behind the hip to the ankle. The thigh part ends in the second ring of
  // the turn of the knee, and the shin part starts there. With accent lower legs, the shin part
  // has the accent color from the knee down, as the dark legs of the foxes of `lowpoly-animals.png`.
  // With accent feet, the shin below the sock ring has the color of the feet.
  if (tube) {
    const rings = legRings(frame, joints, tube);
    const options = { sides: LEG_SIDES, side: [1, 0, 0] } as const;
    const parts = [
      [rings.slice(0, KNEE_RING + 1), legColor, left ? 'thighL' : 'thighR', 'cap', 'open'],
      [rings.slice(KNEE_RING, SOCK_RING + 1), shinColor, left ? 'shinL' : 'shinR', 'open', 'open'],
      [rings.slice(SOCK_RING), sockColor, left ? 'shinL' : 'shinR', 'open', 'cap'],
    ] as const;
    for (const [part, color, bone, start, end] of parts) {
      builder.add(sweep(part, { ...options, start, end }), {
        color,
        bone: boneIndex(bone),
        finish: 'fur',
      });
    }
  }

  // The paw stands under the ankle, or under the knee on a leg with a hock.
  const footBone = boneIndex(left ? 'footL' : 'footR');
  const { ankle, knee } = joints;
  let paw: Vec3 = [ankle[0], footHeight, ankle[2]];
  if (hock) {
    paw = [knee[0], footHeight, knee[2] - hock.forward * h];
    const top: Vec3 = [paw[0], paw[1] + (foot.height / 2) * h, paw[2]];
    const shin = tube ? tube.shin[1] : hock.radius;
    builder.add(metatarsus(frame, ankle, top, [shin, hock.radius]), {
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
 * The rings of the hem of a webbed body, from the point at its bottom to the point at its top, in
 * H above the base of the torso: the height, the half width, and the depth of the front as a part
 * of the half width. The hem continues the round pear of the torso down to just above the paddle
 * feet, 0.12 H above the floor, so that the body is an egg and no leg shows, as the penguins of
 * `orchestra-latest.png`. Its top lies inside the hips of the torso.
 */
const HEM_RINGS: readonly (readonly [y: number, halfWidth: number, front: number])[] = [
  [-0.67, 0, 1],
  [-0.65, 0.28, 0.85],
  [-0.5, 0.44, 0.92],
  [-0.22, 0.55, 1.02],
  [0.16, 0.6, 1.15],
  [0.3, 0, 1],
];

/** The half angle of the belly color on the hem, in radians: the angle at the base of the torso. */
const HEM_BELLY = (20 * Math.PI) / 180;

/** The depth of the back of the hem, as a part of the half width, as the back of the torso. */
const HEM_BACK = 0.72;

/** The number of corners of each ring of the hem, as the rings of the trunk grid. */
const HEM_SEGMENTS = 12;

/**
 * Adds the hem of a webbed body (decision D9 of the anatomy plan): a closed loft below the torso
 * down to just above the feet, on `hips`, which no pose turns. The front has the belly color, and
 * its border cuts the triangles, as the belly stripe of the torso. The base of the torso keeps
 * 0.77 H above the floor, so the choir keeps its height and its holds.
 *
 * @param builder The mesh that gets the parts.
 * @param species The species parameters.
 * @param colors The colors of the species.
 * @param frame The frame of the body.
 */
function addHem(
  builder: MeshBuilder,
  species: SpeciesParams,
  colors: BodyColors,
  frame: BodyFrame,
): void {
  const bulge = ((species.form?.belly ?? DEFAULT_BELLY) - 1) / (DEFAULT_BELLY - 1);
  const corners = loft(
    HEM_RINGS.map(([y, radius, front], i) => {
      const halfWidth = radius * frame.girth;
      return {
        y,
        halfWidth,
        front: (1 + (front - 1) * bulge) * halfWidth * frame.proportions.torsoDepth,
        back: HEM_BACK * halfWidth * frame.proportions.torsoDepth,
        turn: i % 2 === 0 ? 0.5 : 0,
      };
    }),
    HEM_SEGMENTS,
  );
  const [belly, back] = splitByField(
    corners,
    ([x, , z]) => Math.atan2(Math.abs(x), -z) - HEM_BELLY,
  );
  const part = {
    bone: boneIndex('hips'),
    at: transform(frame.at(0, 0, 0), undefined, [frame.h, frame.h, frame.h]),
    finish: 'fur',
  } as const;
  builder.add(belly, { color: colors.belly, ...part });
  builder.add(back, { color: colors.fur, ...part });
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
  const { h, girth } = frame;
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
  const turn =
    thighAxis.angleTo(shinAxis) < STRAIGHT_ANGLE
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
