import { Quaternion, Vector3 } from 'three';
import { below, hipJoint } from './body-frame.ts';
import type { BodyFrame } from './body-frame.ts';
import { addLimb, partColor } from './body-parts.ts';
import type { BodyColors } from './body-parts.ts';
import { toQuat, toVec3 } from './tuples.ts';
import type { Vec3 } from './tuples.ts';
import { transform } from './mesh.ts';
import type { MeshBuilder } from './mesh.ts';
import { icosphere, loft } from './primitives.ts';
import { boneIndex } from './rig.ts';
import type { BoneName } from './rig.ts';
import type { SpeciesParams } from './species.ts';

/** The bones that the legs place. */
export type LegBoneName = Extract<
  BoneName,
  'thighL' | 'shinL' | 'footL' | 'thighR' | 'shinR' | 'footR'
>;

/** The thigh of a standing body, in H. The shin reaches from the knee down to the ankle. */
export const STANDING_THIGH = 0.45;

/**
 * The seated thigh, from the hip to the knee, in H (design 4.5). The thigh lies flat on the seat,
 * and the knee reaches past the front edge of the chair, as in `animals.webp`.
 */
export const SEATED_THIGH = 0.68;

/** The part of the shin above the ankle that gets the color of accent feet. */
const SOCK = 0.45;

/**
 * The foot, in H: a round shoe 0.48 wide, 0.72 long, and 0.25 high above the heel. The heel
 * reaches 0.22 behind the ankle, so that the toes end 1.23 in front of the hip, as the feet of step
 * 4. Longer toes touched the legs of the shared music stands, and the rows grew.
 */
export const FOOT = { width: 0.48, length: 0.72, height: 0.25, heelBack: 0.22 } as const;

/**
 * The radii of the leg, in H: the thigh at the hip and at the knee, and the shin at the knee and
 * at the ankle. The thighs of 0.76 H and the shins of 0.54 H looked like boxes beside
 * `animals.webp`.
 */
const LEG = [0.32, 0.27, 0.22, 0.17] as const;

/** The radius of the faceted ball of the knee, in H. */
const KNEE = 0.27;

/**
 * The rings of the foot from the heel to the toes: the distance from the heel, the half width,
 * and the height of the top, as parts of {@link FOOT}. The sole is flat on the floor, and the top
 * is round. The heel and the toes are points.
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

/**
 * The corners of the foot in H, with the heel at the origin and the toes along +y. The rotation
 * {@link FOOT_TURN} points the toes forward (-z) and the top up.
 */
const FOOT_CORNERS: readonly number[] = loft(
  FOOT_RINGS.map(([along, width, height]) => {
    const halfWidth = (width * FOOT.width) / 2;
    const top = height * FOOT.height;
    return {
      y: along * FOOT.length,
      halfWidth,
      front: halfWidth > 0 ? SOLE : 0,
      back: halfWidth > 0 ? top - SOLE : 0,
      z: halfWidth > 0 ? SOLE : top / 2,
    };
  }),
  FOOT_SEGMENTS,
);

/** The turn of the foot: -90° around x, so that +y points forward (-z) and +z points up. */
const FOOT_TURN = toQuat(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2));

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
 * Adds the two legs and feet of a body in its bind pose (design 4.5). Seated, the round thighs lie
 * flat on the seat and point forward, the knees bend at 90°, and the shins go straight down.
 * Standing, the short thighs point down. The shin reaches down to the ankle at 0.1 H, so that the
 * flat sole of the foot rests on the floor or on the foot rest.
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
 * Adds one leg: the thigh, the knee ball, the shin, and the foot.
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
  const { h, girth, standing, footHeight } = frame;
  const legColor = partColor(species, colors, 'legs');
  const hip = hipJoint(frame, side);
  const knee = standing
    ? below(hip, STANDING_THIGH * h)
    : toVec3(new Vector3(...hip).add(new Vector3(0, 0, -SEATED_THIGH * h)));
  const ankle: Vec3 = [knee[0], footHeight + 0.1 * h, knee[2]];
  const left = side < 0;

  const thigh = [LEG[0] * girth * h, LEG[1] * girth * h] as const;
  addLimb(builder, hip, knee, thigh, legColor, left ? 'thighL' : 'thighR');

  // With accent feet, the lower part of the shin has the accent color too, as the dark socks
  // of the fox in `animals.webp`.
  const shinBone = left ? 'shinL' : 'shinR';
  const feet = partColor(species, colors, 'feet');
  const shin = [LEG[2] * girth * h, LEG[3] * girth * h] as const;
  // A large faceted knee, as in `animals.webp`.
  builder.add(icosphere(KNEE * girth * h, 0), {
    color: legColor,
    bone: boneIndex(shinBone),
    at: transform(knee),
  });
  if (species.accentParts.includes('feet')) {
    const sock = SOCK * (knee[1] - ankle[1]);
    const top: Vec3 = [ankle[0], ankle[1] + sock, ankle[2]];
    const middle = shin[1] + (shin[0] - shin[1]) * SOCK;
    addLimb(builder, knee, top, [shin[0], middle], legColor, shinBone);
    addLimb(builder, top, ankle, [middle, shin[1]], feet, shinBone);
  } else {
    addLimb(builder, knee, ankle, shin, legColor, shinBone);
  }

  builder.add(FOOT_CORNERS, {
    color: feet,
    bone: boneIndex(left ? 'footL' : 'footR'),
    at: transform([ankle[0], footHeight, ankle[2] + FOOT.heelBack * h], FOOT_TURN, [h, h, h]),
  });

  return { hip, knee, ankle };
}
