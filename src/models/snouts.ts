import { Vector3 } from 'three';
import {
  LIMB_SEGMENTS,
  addLimb,
  alongAxis,
  partColor,
  placeCorners,
  unknownValue,
} from './body-parts.ts';
import type { BodyColors } from './body-parts.ts';
import { toVec3 } from './tuples.ts';
import type { Vec3 } from './tuples.ts';
import { splitByFacing, srgb, transform } from './mesh.ts';
import type { MeshBuilder, Rgb } from './mesh.ts';
import { box, cylinder, icosphere, lathe } from './primitives.ts';
import { boneIndex } from './rig.ts';
import { TEETH_COLOR } from './species.ts';
import type { SpeciesParams } from './species.ts';

/** The bind positions of the bones that the snout places. */
export interface SnoutBones {
  /** The hinge of the lower jaw or of the lower beak (design 4.7). */
  readonly jaw: Vec3;
  /** The joints of the trunk. Each species has them, and only the elephant has a trunk. */
  readonly trunk: readonly [Vec3, Vec3, Vec3];
  /**
   * The middle of the mouth, at the front of the snout or between the two halves of the beak. A
   * wind instrument touches this point (design 4.6).
   */
  readonly mouth: Vec3;
}

/**
 * The mouth of each snout type, from the head center in head heights `H`. The mouth is under
 * the front of the muzzle, under the root of the trunk, or between the halves of the beak. A
 * long or a pointed muzzle reaches past the mouth, so that a wind instrument keeps the place
 * where the arms reach its grips (design 5.3).
 */
const MOUTHS = {
  short: [0, -0.38, -0.62],
  long: [0, -0.43, -0.78],
  pointed: [0, -0.36, -0.62],
  'buck-teeth': [0, -0.4, -0.6],
  trunk: [0, -0.44, -0.5],
  'flat-nose': [0, -0.42, -0.58],
  horn: [0, -0.42, -0.66],
  beak: [0, -0.17, -0.76],
} as const satisfies Readonly<Record<SpeciesParams['snout'], Vec3>>;

/**
 * The three segments of the trunk (design 4.5: 1.4 H on 3 bones): the direction, the length in
 * H, and the radius at the start in H. The trunk starts low on the face, hangs down in front of
 * the chest, and its tip curls up.
 */
const TRUNK_SEGMENTS: readonly (readonly [direction: Vec3, length: number, radius: number])[] = [
  [[0, -1, -0.35], 0.5, 0.2],
  [[0, -1, -0.6], 0.5, 0.15],
  [[0, 1, -0.25], 0.4, 0.11],
];

/** The cosine above which a face of the long muzzle points up, so that it gets the fur color. */
const MUZZLE_TOP_FACING = 0.35;

/** The direction of the horn: up, and a little to the front. */
export const RHINO_HORN_AXIS: Vec3 = [0, 1, -0.3];

/** The radius of the trunk at its tip, in H. */
const TRUNK_TIP_RADIUS = 0.08;

/**
 * Calculates the joints of the trunk: its root and the start of the second and third segments.
 *
 * @param h The head height `H`.
 * @param headCenter The center of the head.
 * @returns The joints, and the tip of the trunk.
 */
function trunkJoints(h: number, headCenter: Vec3): Vec3[] {
  const joints: Vec3[] = [
    toVec3(new Vector3(...headCenter).add(new Vector3(0, -0.3 * h, -0.5 * h))),
  ];
  for (const [direction, length] of TRUNK_SEGMENTS) {
    const last = joints.at(-1) ?? headCenter;
    joints.push(
      toVec3(
        new Vector3(...last).addScaledVector(new Vector3(...direction).normalize(), length * h),
      ),
    );
  }
  return joints;
}

/**
 * Adds a nose ball.
 *
 * @param builder The mesh that gets the part.
 * @param colors The colors of the species.
 * @param h The head height `H`.
 * @param at The center of the nose.
 * @param radius The radius of the nose, in H.
 */
function addNose(
  builder: MeshBuilder,
  colors: BodyColors,
  h: number,
  at: Vec3,
  radius = 0.05,
): void {
  builder.add(icosphere(radius * h, 0), {
    color: colors.nose,
    bone: boneIndex('head'),
    at: transform(at),
  });
}

/**
 * Adds a cone that points out of the face, such as a long muzzle, a horn, or a beak.
 *
 * @param builder The mesh that gets the part.
 * @param from The base of the cone.
 * @param axis The direction of the cone.
 * @param profile The radii and the heights along the axis.
 * @param flat The scale of the cone across the axis, up and down.
 * @param color The color.
 * @param bone The bone that the part follows.
 */
function addCone(
  builder: MeshBuilder,
  from: Vec3,
  axis: Vec3,
  profile: readonly (readonly [number, number])[],
  flat: number,
  color: Rgb,
  bone: 'head' | 'jaw',
): void {
  builder.add(lathe(profile, LIMB_SEGMENTS), {
    color,
    bone: boneIndex(bone),
    at: transform(from, alongAxis(axis, [1, 0, 0]), [1, 1, flat]),
  });
}

/**
 * Adds the snout and the nose of a species to the head (design 4.3, 4.5). The muzzle has the
 * belly color, unless the accent parts include the snout.
 *
 * @param builder The mesh that gets the parts.
 * @param species The species parameters.
 * @param colors The colors of the species.
 * @param h The head height `H`, in meters.
 * @param headCenter The center of the head.
 * @returns The bind positions of the jaw and of the trunk, and the mouth.
 */
export function addSnout(
  builder: MeshBuilder,
  species: SpeciesParams,
  colors: BodyColors,
  h: number,
  headCenter: Vec3,
): SnoutBones {
  const head = boneIndex('head');
  const muzzle = partColor(species, colors, 'snout', colors.belly);
  const at = (x: number, y: number, z: number): Vec3 =>
    toVec3(new Vector3(...headCenter).addScaledVector(new Vector3(x, y, z), h));
  const [root = headCenter, second = headCenter, third = headCenter] = trunkJoints(h, headCenter);
  const [mx, my, mz] = MOUTHS[species.snout];
  const bones: SnoutBones = {
    jaw: at(0, -0.2, -0.3),
    trunk: [root, second, third],
    mouth: at(mx, my, mz),
  };
  switch (species.snout) {
    case 'short': {
      // A small muzzle at the point of the face, and the nose on its top.
      builder.add(icosphere(1, 0), {
        color: muzzle,
        bone: head,
        at: transform(at(0, -0.3, -0.56), undefined, [0.2 * h, 0.14 * h, 0.16 * h]),
      });
      addNose(builder, colors, h, at(0, -0.22, -0.7));
      return bones;
    }
    case 'buck-teeth': {
      // A wide muzzle of 0.25 H with the nose, and two front teeth below it.
      builder.add(icosphere(1, 0), {
        color: muzzle,
        bone: head,
        at: transform(at(0, -0.3, -0.6), undefined, [0.21 * h, 0.13 * h, 0.12 * h]),
      });
      addNose(builder, colors, h, at(0, -0.24, -0.69));
      for (const side of [-1, 1]) {
        builder.add(box(0.1 * h, 0.2 * h, 0.04 * h), {
          color: srgb(TEETH_COLOR),
          bone: head,
          at: transform(at(side * 0.055, -0.46, -0.64)),
        });
      }
      return bones;
    }
    case 'long': {
      // A pointed muzzle that reaches 0.38 H in front of the point of the face, with the nose on
      // its tip, as the long muzzle of the fox in `animals.webp`. It starts high and wide, so
      // that its top continues the forehead. Its top has the fur color, and its sides and its
      // underside have the color of the muzzle.
      const axis = new Vector3(0, -0.3, -1).normalize();
      const from = at(0, -0.1, -0.2);
      const length = 0.86;
      const cone = placeCorners(
        lathe(
          [
            [0.4 * h, 0],
            [0.26 * h, 0.44 * h],
            [0.07 * h, length * h],
          ],
          LIMB_SEGMENTS,
        ),
        transform(from, alongAxis(toVec3(axis), [1, 0, 0]), [1, 1, 0.75]),
      );
      const [top, sides] = splitByFacing(cone, [0, 1, 0], MUZZLE_TOP_FACING);
      builder.add(top, { color: colors.fur, bone: head });
      builder.add(sides, { color: muzzle, bone: head });
      const nose = new Vector3(...from).addScaledVector(axis, (length - 0.02) * h);
      addNose(builder, colors, h, toVec3(nose), 0.06);
      return bones;
    }
    case 'pointed': {
      // A thin cone that reaches 0.2 H in front of the face, with a small nose at its tip.
      const axis = new Vector3(0, -0.3, -1).normalize();
      const from = at(0, -0.16, -0.42);
      const length = 0.45;
      addCone(
        builder,
        from,
        toVec3(axis),
        [
          [0.17 * h, 0],
          [0.11 * h, 0.2 * h],
          [0.04 * h, length * h],
        ],
        0.85,
        muzzle,
        'head',
      );
      const nose = new Vector3(...from).addScaledVector(axis, length * h);
      addNose(builder, colors, h, toVec3(nose), 0.045);
      return bones;
    }
    case 'trunk': {
      // Three segments of 1.4 H in all, with a ball at each bend. The tip of the trunk is its
      // nose, so the trunk has no nose ball.
      const joints = [root, second, third];
      const names = ['trunk1', 'trunk2', 'trunk3'] as const;
      for (const [i, [direction, length, radius]] of TRUNK_SEGMENTS.entries()) {
        const start = joints[i] ?? root;
        const end = toVec3(
          new Vector3(...start).addScaledVector(new Vector3(...direction).normalize(), length * h),
        );
        const next = TRUNK_SEGMENTS[i + 1]?.[2] ?? TRUNK_TIP_RADIUS;
        const bone = names[i] ?? 'trunk1';
        addLimb(builder, start, end, [radius * h, next * h], colors.fur, bone);
        if (i > 0) {
          builder.add(icosphere(radius * h, 0), {
            color: colors.fur,
            bone: boneIndex(bone),
            at: transform(start),
          });
        }
      }
      return bones;
    }
    case 'flat-nose': {
      // A flat oval disc, 0.4 H wide and 0.3 H tall, in front of the face, with two nostrils.
      const front = -0.8;
      builder.add(cylinder(0.2 * h, 0.2 * h, 0.2 * h, 8), {
        color: muzzle,
        bone: head,
        at: transform(at(0, -0.2, front + 0.2), alongAxis([0, 0, -1], [1, 0, 0]), [1, 1, 0.75]),
      });
      for (const side of [-1, 1]) {
        builder.add(icosphere(0.035 * h, 0), {
          color: colors.nose,
          bone: head,
          at: transform(at(side * 0.08, -0.2, front)),
        });
      }
      return bones;
    }
    case 'horn': {
      // A large muzzle with the nose, and a horn of 0.4 H on it.
      builder.add(icosphere(1, 0), {
        color: muzzle,
        bone: head,
        at: transform(at(0, -0.24, -0.52), undefined, [0.24 * h, 0.2 * h, 0.3 * h]),
      });
      addNose(builder, colors, h, at(0, -0.28, -0.8));
      addCone(
        builder,
        at(0, -0.08, -0.68),
        RHINO_HORN_AXIS,
        [
          [0.13 * h, 0],
          [0.07 * h, 0.2 * h],
          [0, 0.4 * h],
        ],
        1,
        partColor(species, colors, 'horn'),
        'head',
      );
      return bones;
    }
    case 'beak': {
      // An upper beak that reaches 0.2 H in front of the face, and a lower beak on the jaw, so
      // that the choir can open it (design 4.7).
      const color = partColor(species, colors, 'beak');
      addCone(
        builder,
        at(0, -0.06, -0.48),
        [0, -0.15, -1],
        [
          [0.12 * h, 0],
          [0, 0.4 * h],
        ],
        0.6,
        color,
        'head',
      );
      const jaw = at(0, -0.14, -0.46);
      addCone(
        builder,
        jaw,
        [0, -0.3, -1],
        [
          [0.07 * h, 0],
          [0, 0.32 * h],
        ],
        0.5,
        color,
        'jaw',
      );
      return { ...bones, jaw };
    }
    default:
      throw unknownValue('snout type', species.snout);
  }
}
