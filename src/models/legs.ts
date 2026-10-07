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
import type { SpeciesParams } from './species.ts';
import { sweep } from './sweep.ts';
import type { SweepRing } from './sweep.ts';

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
 * at the ankle. Thick legs give the soft, round look of `mockup.png` (spec of the cute bodies,
 * 2.4). The thighs of 0.76 H and the shins of 0.54 H of the second round looked like boxes beside
 * `animals.webp`, and the legs of 0.64 H and 0.44 H with a knee ball looked thin.
 */
const LEG = [0.34, 0.3, 0.24, 0.2] as const;

/** The number of sides of the leg tube (design 4.5, facets). */
const LEG_SIDES = 10;

/**
 * The radius of the middle ring of the thigh and of the shin, as a factor of the mean of its end
 * radii. The thigh and the calf bulge a little, as soft muscles.
 */
const LEG_BULGE = 1.05;

/**
 * The half length of the knee of a standing body, in H: the straight leg narrows from the radius
 * of the thigh to the radius of the shin over twice this length.
 */
const STRAIGHT_KNEE = 0.08;

/**
 * The lift of the middle of the turn of a bent knee off the fold line, in H. The inner side of the
 * knee keeps a small round fold, and the outer side rises by this lift, as a knee cap. The top of
 * the leg near the knee then keeps the height of the knee ball of the first legs, where the
 * resting hands and the bow of design 5.2 lie.
 */
const KNEE_LIFT = 0.035;

/**
 * The length of the rounded end of the thigh behind the hip joint, in H, and its radius as a part
 * of the radius at the hip. The end sinks into the torso, with no flat cap at its side.
 */
const HIP_END = { length: 0.12, radius: 0.8 } as const;

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
  const hip = hipJoint(frame, side);
  const knee = standing
    ? below(hip, STANDING_THIGH * h)
    : toVec3(new Vector3(...hip).add(new Vector3(0, 0, -SEATED_THIGH * h)));
  const ankle: Vec3 = [knee[0], footHeight + 0.1 * h, knee[2]];
  const joints = { hip, knee, ankle };
  const left = side < 0;

  // The rings, from the end behind the hip to the ankle. The thigh part ends in the first ring of
  // the turn of the knee, and the shin part starts there. With accent feet, the shin below the
  // sock ring has the accent color too, as the dark socks of the fox in `animals.webp`.
  const rings = legRings(frame, joints);
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
    builder.add(sweep(part, { ...options, start, end }), { color, bone: boneIndex(bone) });
  }

  builder.add(FOOT_CORNERS, {
    color: feet,
    bone: boneIndex(left ? 'footL' : 'footR'),
    at: transform([ankle[0], footHeight, ankle[2] + FOOT.heelBack * h], FOOT_TURN, [h, h, h]),
  });

  return joints;
}

/** The index of the ring of the leg where the thigh part ends and the shin part starts. */
const KNEE_RING = 4;

/** The index of the ring of the leg at the top of the sock. */
const SOCK_RING = 7;

/**
 * Gives the rings of one leg tube (design 4.5): the rounded end behind the hip, the hip, the
 * middle of the thigh, four rings around the turn of the knee, the top of the sock, and the
 * ankle. Each ring turns by half a side against its neighbors.
 *
 * @param frame The frame of the body.
 * @param joints The joints of the leg.
 * @returns The rings, in meters.
 */
function legRings(frame: BodyFrame, joints: LegJoints): SweepRing[] {
  const { h, girth, standing } = frame;
  const [hipR, kneeR, shinR, ankleR] = [
    LEG[0] * girth * h,
    LEG[1] * girth * h,
    LEG[2] * girth * h,
    LEG[3] * girth * h,
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
  const behind = hip.clone().addScaledVector(thighAxis, -HIP_END.length * h);

  const kneeRing = (part: number): [Vector3, Vector3, number] => {
    const { at, axis, radius } = turn(part);
    return [at, axis, radius];
  };
  const places: readonly (readonly [Vector3, Vector3, number])[] = [
    [behind, thighAxis, hipR * HIP_END.radius],
    [hip, thighAxis, hipR],
    [hip.clone().lerp(start, 0.5), thighAxis, ((hipR + kneeR) / 2) * LEG_BULGE],
    kneeRing(0),
    kneeRing(1 / 3),
    kneeRing(2 / 3),
    kneeRing(1),
    [sockTop, shinAxis, (shinR + (ankleR - shinR) * sockShare) * LEG_BULGE],
    [ankle, shinAxis, ankleR],
  ];
  return places.map(([at, axis, radius], i) => ({
    at: toVec3(at),
    axis: toVec3(axis),
    radius,
    turn: i % 2 === 0 ? 0.5 : 0,
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
