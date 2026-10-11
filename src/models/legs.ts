import { Quaternion, Vector3 } from 'three';
import { below, HIP_JOINT, hipJoint } from './body-frame.ts';
import type { BodyFrame } from './body-frame.ts';
import { addLimb, partColor } from './body-parts.ts';
import type { BodyColors } from './body-parts.ts';
import { toQuat } from './tuples.ts';
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

/** The part of the shin above the ankle that gets the color of accent feet. */
const SOCK = 0.45;

/**
 * The foot, in H: a round shoe 0.48 wide, 0.72 long, and 0.25 high above the heel. The heel
 * reaches 0.22 behind the ankle, so that the toes end 1.23 in front of the hip, as the feet of step
 * 4. Longer toes touched the legs of the shared music stands, and the rows grew.
 */
const FOOT = { width: 0.48, length: 0.72, height: 0.25, heelBack: 0.22 } as const;

/** The radii of one leg, in H. */
interface LegRadii {
  /** The thigh at the hip joint. */
  readonly hip: number;
  /** The thigh at the knee. */
  readonly thigh: number;
  /** The faceted ball of the knee. */
  readonly knee: number;
  /** The shin at the knee. */
  readonly shin: number;
  /** The shin at the ankle. */
  readonly ankle: number;
}

/**
 * The radii of a seated leg (design 4.5, short legs). The thigh is 0.44 H thick in the middle, as
 * the thighs of the model sheets (0.37 to 0.45 H), and the shin narrows to 0.9 of its width at
 * the ankle, as the shins of the sheets (0.89 to 0.94). The thighs of 0.59 H and the shins that
 * narrowed to 0.77 looked heavy above thin shins. The thighs of 0.76 H looked like boxes beside
 * `animals.webp`.
 */
const SEATED_LEG: LegRadii = { hip: 0.24, thigh: 0.2, knee: 0.22, shin: 0.2, ankle: 0.18 };

/**
 * The radii of a standing leg (design 4.5, short legs): a straight column with no step at the
 * knee, as the legs of the bear of `bear-views.png` (0.40 H wide). Round thighs of 0.64 H on
 * shins of 0.44 H put a step at the knee.
 */
const STANDING_LEG: LegRadii = { hip: 0.3, thigh: 0.25, knee: 0.25, shin: 0.25, ankle: 0.21 };

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
 * on the seat and point forward to the seated knee of the skeleton of the species, the knees bend,
 * and the shins go straight down. Standing, the short thighs point down. The shin reaches down to
 * the ankle at 0.1 H, so that the flat sole of the foot rests on the floor or on the foot rest.
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
  const { h, standing, footHeight, proportions } = frame;
  const legColor = partColor(species, colors, 'legs');
  const hip = hipJoint(frame, side);
  const { forward, height } = proportions.seatedKnee;
  const knee = standing
    ? below(hip, proportions.standingThigh * h)
    : frame.at(side * proportions.hipSpread, height, HIP_JOINT.z - forward);
  const ankle: Vec3 = [knee[0], footHeight + 0.1 * h, knee[2]];
  const left = side < 0;

  const radii = standing ? STANDING_LEG : SEATED_LEG;
  const thigh = [radii.hip * h, radii.thigh * h] as const;
  addLimb(builder, hip, knee, thigh, legColor, left ? 'thighL' : 'thighR');

  // With accent feet, the lower part of the shin has the accent color too, as the dark socks
  // of the fox in `animals.webp`.
  const shinBone = left ? 'shinL' : 'shinR';
  const feet = partColor(species, colors, 'feet');
  const shin = [radii.shin * h, radii.ankle * h] as const;
  // A faceted knee, as in `animals.webp`.
  builder.add(icosphere(radii.knee * h, 0), {
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
