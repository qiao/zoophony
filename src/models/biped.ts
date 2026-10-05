import { addLimb, bodyColors, partColor } from './body-parts.ts';
import { addEars } from './ears.ts';
import { addFacePattern } from './face-patterns.ts';
import { add, transform } from './math.ts';
import type { Vec3 } from './math.ts';
import { splitByFacing } from './mesh.ts';
import type { MeshBuilder } from './mesh.ts';
import { box, icosphere, lathe } from './primitives.ts';
import type { ProfilePoint } from './primitives.ts';
import { CHAIR } from './props.ts';
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
    }
  | { readonly kind: 'standing' };

/**
 * Makes the stance of a body on a seat.
 *
 * @param seatHeight The height of the seat, in meters.
 * @param footHeight The height of the rest under the feet, in meters. Default: the floor.
 * @returns The stance.
 */
export function seated(seatHeight: number, footHeight = 0): Stance {
  return { kind: 'seated', seatHeight, footHeight };
}

/** The facets of design 4.5: a head is an icosphere of detail 1. */
const HEAD_DETAIL = 1;
const TORSO_SEGMENTS = 8;

/** The cosine above which a face of the head or the torso faces the front, for the belly color. */
const FRONT_FACING = 0.55;

/** The cosine above which a face of the head front points up, to the forehead. */
const FOREHEAD_FACING = 0.45;

/**
 * Builds the body of the parametric biped in its bind pose, and adds its parts to a mesh (design
 * 4.3, 4.5). The animal faces -z, its left side is -x, and the floor is at y = 0. The arms hang
 * down beside the body. Each part follows one bone (design 4.4).
 *
 * A standing body has the legs of a body on a chair, but straight, so that its hips are 0.55 H
 * (the thigh) higher than on the chair.
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
  const colors = bodyColors(species);
  const standing = stance.kind === 'standing';
  // The base of the torso: the seat, or the height of a seat on a chair plus the thigh.
  const seatHeight = standing ? CHAIR.seatHeight + 0.55 * h : stance.seatHeight;
  const footHeight = standing ? 0 : stance.footHeight;
  const at = (x: number, y: number, z: number): Vec3 => [x * h, seatHeight + y * h, z * h];

  // The torso: a round pear-shaped lathe, 1.45 H tall, 1.2 H wide at the belly and the hips, and
  // 0.84 H at the shoulders. Its top is under the chin. The part below the chest bone follows
  // `spine`. The part above it follows `chest`, as the shoulders and the arms do (design 4.7). The
  // faces at the front get the belly color.
  const chestY = 0.8;
  const torsoParts: readonly [BoneName, readonly ProfilePoint[]][] = [
    [
      'spine',
      [
        [0, 0],
        [0.45, 0.03],
        [0.6, 0.22],
        [0.58, 0.5],
        [0.5, chestY],
      ],
    ],
    [
      'chest',
      [
        [0.5, chestY],
        [0.42, 1.05],
        [0.3, 1.3],
        [0, 1.45],
      ],
    ],
  ];
  const torsoPlace = transform(at(0, 0, 0), undefined, [h, h, 0.85 * h]);
  for (const [bone, profile] of torsoParts) {
    const [belly, back] = splitByFacing(lathe(profile, TORSO_SEGMENTS), [0, 0, -1], FRONT_FACING);
    builder.add(belly, { color: colors.belly, bone: boneIndex(bone), at: torsoPlace });
    builder.add(back, { color: colors.fur, bone: boneIndex(bone), at: torsoPlace });
  }

  // A short thick neck under the head, and the head. The head is 1.0 H tall and 0.9 H wide, and
  // its top is 2.4 H above the seat, so that it sits on the shoulders.
  addLimb(builder, at(0, 1.15, 0), at(0, 1.6, 0), [0.3 * h, 0.27 * h], colors.fur, 'neck');
  const headCenter = at(0, 1.9, 0);
  // The face is the front of the head up to a little above the eyes. The forehead above it
  // keeps the fur color.
  const [front, back] = splitByFacing(icosphere(0.5, HEAD_DETAIL), [0, 0, -1], FRONT_FACING);
  const [forehead, face] = splitByFacing(front, [0, 1, 0], FOREHEAD_FACING);
  const skull = [...back, ...forehead];
  const headPlace = transform(headCenter, undefined, [0.9 * h, h, 0.9 * h]);
  builder.add(face, { color: colors.belly, bone: boneIndex('head'), at: headPlace });
  builder.add(skull, { color: colors.fur, bone: boneIndex('head'), at: headPlace });

  // The eyes: two black spheres of 0.08 H, wide apart, on the surface of the head.
  const eyes: [Vec3, Vec3] = [
    add(headCenter, [-0.2 * h, 0.1 * h, -0.39 * h]),
    add(headCenter, [0.2 * h, 0.1 * h, -0.39 * h]),
  ];
  builder.add(icosphere(0.04 * h, 0), {
    color: colors.eye,
    bone: boneIndex('eyeL'),
    at: transform(eyes[0]),
  });
  builder.add(icosphere(0.04 * h, 0), {
    color: colors.eye,
    bone: boneIndex('eyeR'),
    at: transform(eyes[1]),
  });

  const [earL, earR] = addEars(builder, species, colors, h, headCenter);
  const snout = addSnout(builder, species, colors, h, headCenter);
  addFacePattern(builder, species, colors, h, headCenter);
  const tailBase = at(0, 0.3, 0.4);
  const [tail1, tail2] = addTail(builder, species, colors, h, tailBase);

  // The arms hang down: upper arm 0.6 H, forearm 0.55 H, and a mitten hand of 0.25 H. They are
  // thick, so that the animal looks chunky.
  const arms = ([-1, 1] as const).map((side) => {
    const shoulder = at(side * 0.5, 1.05, 0);
    const elbow = add(shoulder, [0, -0.6 * h, 0]);
    const wrist = add(elbow, [0, -0.55 * h, 0]);
    const knuckles = add(wrist, [0, -0.12 * h, 0]);
    const left = side < 0;
    addLimb(
      builder,
      shoulder,
      elbow,
      [0.16 * h, 0.14 * h],
      colors.fur,
      left ? 'upperArmL' : 'upperArmR',
    );
    addLimb(
      builder,
      elbow,
      wrist,
      [0.14 * h, 0.12 * h],
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
    return { clavicle: at(side * 0.15, 1.05, 0), shoulder, elbow, wrist, knuckles };
  });

  // Seated, the thick thighs point forward 0.55 H, and the shins hang down. Standing, the thighs
  // point down. The shin reaches down to the ankle at 0.1 H, so that the bottom of the foot rests
  // on the floor or on the foot rest.
  const legs = ([-1, 1] as const).map((side) => {
    const hip = at(side * 0.25, 0.17, -0.05);
    const knee = add(hip, standing ? [0, -0.55 * h, 0] : [0, 0, -0.55 * h]);
    const ankle: Vec3 = [knee[0], footHeight + 0.1 * h, knee[2]];
    const left = side < 0;
    addLimb(builder, hip, knee, [0.26 * h, 0.2 * h], colors.fur, left ? 'thighL' : 'thighR');
    addLimb(builder, knee, ankle, [0.2 * h, 0.16 * h], colors.fur, left ? 'shinL' : 'shinR');
    builder.add(box(0.3 * h, 0.15 * h, 0.44 * h), {
      color: partColor(species, colors, 'feet'),
      bone: boneIndex(left ? 'footL' : 'footR'),
      at: transform(add(ankle, [0, -0.025 * h, -0.1 * h])),
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
