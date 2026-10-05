import { addLimb, bodyColors, partColor } from './body-parts.ts';
import { addEars } from './ears.ts';
import { addFacePattern } from './face-patterns.ts';
import { EYE_DIRECTION, HEAD_CORNERS, LOWER_FACE_TOP, headSurface } from './head.ts';
import { add, transform } from './math.ts';
import type { Vec3 } from './math.ts';
import { splitByFacing } from './mesh.ts';
import type { MeshBuilder } from './mesh.ts';
import { box, icosphere, loft, wedge } from './primitives.ts';
import type { LoftRing, ProfilePoint } from './primitives.ts';
import { boneIndex } from './rig.ts';
import type { BoneName } from './rig.ts';
import { addSnout } from './snouts.ts';
import { RABBIT_HEAD_HEIGHT } from './species.ts';
import type { SpeciesParams } from './species.ts';
import { addTail } from './tails.ts';

/** The bones that the body places. The instrument generators place the other bones. */
export type BodyBoneName = Exclude<
  BoneName,
  'instrument' | 'bow' | 'malletL' | 'malletR' | 'baton' | 'slide'
>;

/** The bind positions of the body bones, and the points that the instruments need. */
export interface BodyBones {
  readonly positions: Readonly<Record<BodyBoneName, Vec3>>;
  /** The head height `H` of the species, in meters (design 4.5, body proportions). */
  readonly headHeight: number;
  /** The center of the head. */
  readonly headCenter: Vec3;
  /** The middle of the mouth, at the front of the snout or the beak (design 4.6). */
  readonly mouth: Vec3;
  /** The point on the floor under the middle of the body. */
  readonly floor: Vec3;
  /** The point in the middle of the palm of each hand. */
  readonly palmL: Vec3;
  readonly palmR: Vec3;
}

/**
 * How a body rests in its bind pose (design 4.5, 4.7). A seated body sits on a seat, with the
 * thighs forward and the shins down to its feet. A standing body has straight legs, and its feet
 * are on the floor.
 */
export type Stance =
  | {
      readonly kind: 'seated';
      /** The height of the top of the seat above the floor, in meters. */
      readonly seatHeight: number;
      /**
       * The height of the rest under the feet, in meters: 0 for the floor, or the height of the
       * foot ring of a high stool.
       */
      readonly footHeight: number;
      /**
       * The distance of the body in front of the seat center (-z), in meters, so that the torso
       * keeps clear of a chair back.
       */
      readonly forward: number;
    }
  | { readonly kind: 'standing' };

/**
 * Makes the stance of a body on a seat.
 *
 * @param seatHeight The height of the seat, in meters.
 * @param footHeight The height of the rest under the feet, in meters. Default: the floor.
 * @param forward The distance of the body in front of the seat center, in meters. Default: 0.
 * @returns The stance.
 */
export function seated(seatHeight: number, footHeight = 0, forward = 0): Stance {
  return { kind: 'seated', seatHeight, footHeight, forward };
}

/**
 * The height of the base of the torso above the floor for a standing body, in H (design 4.5).
 * The legs of a standing body are 28% of its height, as in the reference image (about 25%). The
 * legs of a body on a chair, straight down, made them 41% of the height of the bear.
 */
export const STANDING_BASE = 0.75;

/** The thigh of a standing body, in H. The shin reaches from the knee down to the ankle. */
export const STANDING_THIGH = 0.42;

/**
 * The upper arm, from the shoulder joint to the elbow, in H (design 4.5). With the forearm, the
 * shoulder is 1.43 H from the palm: 0.60 of the seated height, as the reference image shows (0.55
 * to 0.62). The first arms (0.6 H and 0.55 H, 0.51 of the seated height) did not reach the bow
 * hair of the bowed strings, nor 7 of the 11 other instruments (review of step 4).
 */
export const UPPER_ARM = 0.7;

/** The forearm, from the elbow to the wrist, in H (design 4.5). */
export const FOREARM = 0.65;

const TORSO_SEGMENTS = 8;

/** The cosine above which a face of the torso faces the front, for the belly color. */
const FRONT_FACING = 0.55;

/**
 * The cosine below which a face of the head faces the back. The faces of the lower face that do
 * not face the back get the belly color: the cheeks, the jaw, and the face up to the eyes.
 */
const BACK_FACING = -0.3;

/**
 * The seated thigh, from the hip to the knee, in H (design 4.5). The thigh lies flat on the seat,
 * and the knee reaches past the front edge of the chair, as in `animals.webp`.
 */
export const SEATED_THIGH = 0.68;

/** The height of a seated hip above the seat, in H. The thick thigh rests on the seat. */
export const SEATED_HIP = 0.22;

/** The part of the shin above the ankle that gets the color of accent feet. */
const SOCK = 0.45;

/** The foot, in H: a wedge 0.4 wide, 0.62 long, 0.22 high at the heel, and 0.12 at the toes. */
export const FOOT = { width: 0.4, length: 0.62, heel: 0.22, toes: 0.12 } as const;

/**
 * Splits the corners of a part by the height of the centroid of each triangle.
 *
 * @param corners The corner list.
 * @param below The height under which a triangle matches.
 * @returns The triangles below the height, then the other triangles.
 */
function splitByHeight(corners: readonly number[], below: number): [number[], number[]] {
  const low: number[] = [];
  const high: number[] = [];
  for (let t = 0; t < corners.length / 9; t++) {
    const y =
      ((corners[t * 9 + 1] ?? 0) + (corners[t * 9 + 4] ?? 0) + (corners[t * 9 + 7] ?? 0)) / 3;
    (y < below ? low : high).push(...corners.slice(t * 9, t * 9 + 9));
  }
  return [low, high];
}

/**
 * Builds the body of the parametric biped in its bind pose, and adds its parts to a mesh (design
 * 4.3, 4.5). The animal faces -z, its left side is -x, and the floor is at y = 0. The arms hang
 * down beside the body. Each part follows one bone (design 4.4).
 *
 * A standing body has short straight legs: the base of its torso is {@link STANDING_BASE} above
 * the floor, and its thigh is {@link STANDING_THIGH} long.
 *
 * @param builder The mesh that gets the parts.
 * @param species The species parameters.
 * @param stance The seat under the body, or no seat.
 * @returns The bind positions of the body bones.
 */
export function buildBiped(
  builder: MeshBuilder,
  species: SpeciesParams,
  stance: Stance,
): BodyBones {
  const h = RABBIT_HEAD_HEIGHT * species.size;
  const girth = species.girth ?? 1;
  const colors = bodyColors(species);
  const standing = stance.kind === 'standing';
  // The base of the torso: the seat, or the base of a standing body.
  const seatHeight = standing ? STANDING_BASE * h : stance.seatHeight;
  const footHeight = standing ? 0 : stance.footHeight;
  const forward = standing ? 0 : stance.forward;
  const at = (x: number, y: number, z: number): Vec3 => [
    x * h,
    seatHeight + y * h,
    z * h - forward,
  ];

  // The torso: a faceted pear, 1.45 H tall, 1.12 H wide at the hips, and 0.84 H at the shoulders.
  // Its top is under the chin. The rings have a corner at the front, so the chest has a ridge, as
  // in `animals.webp`. The part below the chest bone follows `spine`. The part above it follows
  // `chest`, as the shoulders and the arms do (design 4.7). The faces at the front get the belly
  // color.
  const chestY = 0.8;
  const torsoParts: readonly [BoneName, readonly ProfilePoint[]][] = [
    [
      'spine',
      [
        [0, 0],
        [0.44, 0.02],
        [0.56, 0.22],
        [0.54, 0.5],
        [0.47, chestY],
      ],
    ],
    [
      'chest',
      [
        [0.47, chestY],
        [0.42, 1.05],
        [0.3, 1.3],
        [0, 1.45],
      ],
    ],
  ];
  const torsoRing = ([radius, y]: ProfilePoint): LoftRing => ({
    y,
    halfWidth: radius,
    front: 1.05 * radius,
    back: 0.95 * radius,
  });
  const torsoPlace = transform(at(0, 0, 0), undefined, [girth * h, h, girth * h]);
  for (const [bone, profile] of torsoParts) {
    const corners = loft(profile.map(torsoRing), TORSO_SEGMENTS);
    const [belly, back] = splitByFacing(corners, [0, 0, -1], FRONT_FACING);
    builder.add(belly, { color: colors.belly, bone: boneIndex(bone), at: torsoPlace });
    builder.add(back, { color: colors.fur, bone: boneIndex(bone), at: torsoPlace });
  }

  // A short thick neck under the head, and the head. The head is the sculpted head of
  // `animals.webp`: 1.0 H tall and 1.26 H wide at the cheeks. Its top is 2.4 H above the seat, so
  // that it sits on the shoulders.
  addLimb(builder, at(0, 1.15, 0), at(0, 1.6, 0), [0.3 * h, 0.27 * h], colors.fur, 'neck');
  const headCenter = at(0, 1.9, 0);
  // The lower face (the cheeks, the jaw, and the face up to the eyes) gets the belly color. The
  // forehead and the back of the head keep the fur color.
  const [lower, upper] = splitByHeight(HEAD_CORNERS, LOWER_FACE_TOP);
  const [nape, face] = splitByFacing(lower, [0, 0, 1], -BACK_FACING);
  const headPlace = transform(headCenter, undefined, [h, h, h]);
  builder.add(face, { color: colors.belly, bone: boneIndex('head'), at: headPlace });
  builder.add([...upper, ...nape], { color: colors.fur, bone: boneIndex('head'), at: headPlace });

  // The eyes: two black upright ovals of about 0.07 × 0.15 H, wide apart, half in the head
  // surface. An icosahedron reaches 0.85 of its radius on x and y.
  const eyeAt = (side: number): Vec3 => {
    const { point, normal } = headSurface(h, headCenter, [
      side * EYE_DIRECTION[0],
      EYE_DIRECTION[1],
      EYE_DIRECTION[2],
    ]);
    return add(point, [-0.01 * h * normal[0], -0.01 * h * normal[1], -0.01 * h * normal[2]]);
  };
  const eyes: [Vec3, Vec3] = [eyeAt(-1), eyeAt(1)];
  for (const [i, eye] of eyes.entries()) {
    builder.add(icosphere(0.5, 0), {
      color: colors.eye,
      bone: boneIndex(i === 0 ? 'eyeL' : 'eyeR'),
      at: transform(eye, undefined, [0.08 * h, 0.17 * h, 0.05 * h]),
    });
  }

  const [earL, earR] = addEars(builder, species, colors, h, headCenter);
  const snout = addSnout(builder, species, colors, h, headCenter);
  addFacePattern(builder, species, colors, h, headCenter);
  const tailBase = at(0, 0.3, 0.4);
  const [tail1, tail2] = addTail(builder, species, colors, h, tailBase);

  // The arms hang down: an upper arm, a forearm, and a mitten hand of 0.25 H. They are thick, so
  // that the animal looks chunky.
  const arms = ([-1, 1] as const).map((side) => {
    const shoulder = at(side * 0.5 * girth, 1.05, 0);
    const elbow = add(shoulder, [0, -UPPER_ARM * h, 0]);
    const wrist = add(elbow, [0, -FOREARM * h, 0]);
    const knuckles = add(wrist, [0, -0.12 * h, 0]);
    const left = side < 0;
    addLimb(
      builder,
      shoulder,
      elbow,
      [0.2 * girth * h, 0.17 * girth * h],
      colors.fur,
      left ? 'upperArmL' : 'upperArmR',
    );
    addLimb(
      builder,
      elbow,
      wrist,
      [0.17 * girth * h, 0.15 * girth * h],
      colors.fur,
      left ? 'forearmL' : 'forearmR',
    );
    const handColor = partColor(species, colors, 'hands');
    builder.add(box(0.24 * h, 0.13 * h, 0.16 * h), {
      color: handColor,
      bone: boneIndex(left ? 'handL' : 'handR'),
      at: transform(add(wrist, [0, -0.06 * h, 0])),
    });
    builder.add(box(0.22 * h, 0.13 * h, 0.15 * h), {
      color: handColor,
      bone: boneIndex(left ? 'fingersL' : 'fingersR'),
      at: transform(add(knuckles, [0, -0.06 * h, 0])),
    });
    return { clavicle: at(side * 0.15 * girth, 1.05, 0), shoulder, elbow, wrist, knuckles };
  });

  // Seated, the thick thighs lie flat on the seat and point forward, the knees bend at 90°, and
  // the shins go straight down. Standing, the short thighs point down. The shin reaches down to
  // the ankle at 0.1 H, so that the large flat foot rests on the floor or on the foot rest.
  const legs = ([-1, 1] as const).map((side) => {
    const hip = at(side * 0.3 * girth, standing ? 0.17 : SEATED_HIP, -0.05);
    const knee = add(hip, standing ? [0, -STANDING_THIGH * h, 0] : [0, 0, -SEATED_THIGH * h]);
    const ankle: Vec3 = [knee[0], footHeight + 0.1 * h, knee[2]];
    const left = side < 0;
    const thigh = [0.33 * girth * h, 0.27 * girth * h] as const;
    addLimb(builder, hip, knee, thigh, colors.fur, left ? 'thighL' : 'thighR');
    // With accent feet, the lower part of the shin has the accent color too, as the dark socks
    // of the fox in `animals.webp`.
    const shinBone = left ? 'shinL' : 'shinR';
    const feet = partColor(species, colors, 'feet');
    const shin = [0.23 * girth * h, 0.2 * girth * h] as const;
    if (species.accentParts.includes('feet')) {
      const sock = SOCK * (knee[1] - ankle[1]);
      const top: Vec3 = [ankle[0], ankle[1] + sock, ankle[2]];
      const middle = shin[1] + (shin[0] - shin[1]) * SOCK;
      addLimb(builder, knee, top, [shin[0], middle], colors.fur, shinBone);
      addLimb(builder, top, ankle, [middle, shin[1]], feet, shinBone);
    } else {
      addLimb(builder, knee, ankle, shin, colors.fur, shinBone);
    }
    builder.add(wedge(FOOT.width * h, FOOT.heel * h, FOOT.toes * h, FOOT.length * h), {
      color: feet,
      bone: boneIndex(left ? 'footL' : 'footR'),
      at: transform([ankle[0], footHeight, ankle[2] - (FOOT.length / 2 - 0.12) * h]),
    });
    return { hip, knee, ankle };
  });

  const [armL, armR] = arms;
  const [legL, legR] = legs;
  if (!armL || !armR || !legL || !legR) {
    throw new Error('The body has no arms or legs.');
  }
  const palm = (wrist: Vec3): Vec3 => add(wrist, [0, -0.08 * h, 0]);
  return {
    headHeight: h,
    headCenter,
    mouth: snout.mouth,
    floor: [0, 0, -forward],
    palmL: palm(armL.wrist),
    palmR: palm(armR.wrist),
    positions: {
      root: [0, 0, 0],
      hips: at(0, 0.15, 0),
      spine: at(0, 0.45, 0),
      chest: at(0, chestY, 0),
      neck: at(0, 1.15, 0),
      head: at(0, 1.4, 0),
      jaw: snout.jaw,
      eyeL: eyes[0],
      eyeR: eyes[1],
      earL,
      earR,
      tail1,
      tail2,
      trunk1: snout.trunk[0],
      trunk2: snout.trunk[1],
      trunk3: snout.trunk[2],
      shoulderL: armL.clavicle,
      upperArmL: armL.shoulder,
      forearmL: armL.elbow,
      handL: armL.wrist,
      fingersL: armL.knuckles,
      shoulderR: armR.clavicle,
      upperArmR: armR.shoulder,
      forearmR: armR.elbow,
      handR: armR.wrist,
      fingersR: armR.knuckles,
      thighL: legL.hip,
      shinL: legL.knee,
      footL: legL.ankle,
      thighR: legR.hip,
      shinR: legR.knee,
      footR: legR.ankle,
    },
  };
}
