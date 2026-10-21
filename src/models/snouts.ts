import { Vector3 } from 'three';
import { LIMB_SEGMENTS, alongAxis, partColor, placeCorners, unknownValue } from './body-parts.ts';
import type { BodyColors } from './body-parts.ts';
import { toVec3 } from './tuples.ts';
import type { Vec3 } from './tuples.ts';
import { splitByFacing, transform } from './mesh.ts';
import type { MeshBuilder, Rgb } from './mesh.ts';
import { ball, cylinder, icosphere, lathe } from './primitives.ts';
import { boneIndex } from './rig.ts';
import type { BipedParams } from './species.ts';

/** The bind positions of the bones that the snout places. */
export interface SnoutBones {
  /** The hinge of the lower jaw (design 4.7). */
  readonly jaw: Vec3;
  /** The joints of the trunk. Each species has them, and no species of the biped has a trunk. */
  readonly trunk: readonly [Vec3, Vec3, Vec3];
  /**
   * The middle of the mouth, at the front of the snout. A wind instrument touches this point
   * (design 4.6).
   */
  readonly mouth: Vec3;
}

/**
 * The mouth of each snout type, from the head center in head heights `H`. The mouth is under
 * the front of the muzzle. A long or a pointed muzzle reaches past the mouth, so that a wind
 * instrument keeps the place where the arms reach its grips (design 5.3).
 */
const MOUTHS = {
  short: [0, -0.38, -0.62],
  long: [0, -0.43, -0.78],
  blunt: [0, -0.42, -0.74],
  broad: [0, -0.48, -0.7],
  pointed: [0, -0.36, -0.62],
  'flat-nose': [0, -0.42, -0.58],
  horn: [0, -0.42, -0.66],
} as const satisfies Readonly<Record<BipedParams['snout'], Vec3>>;

/**
 * The three segments of the trunk bones (design 4.7: 1.4 H on 3 bones): the direction and the
 * length in H. The bones start low on the face, hang down in front of the chest, and the last
 * bone curls up. Each skeleton has the trunk bones, and no species of the biped has a trunk.
 */
const TRUNK_SEGMENTS: readonly (readonly [direction: Vec3, length: number])[] = [
  [[0, -1, -0.35], 0.5],
  [[0, -1, -0.6], 0.5],
  [[0, 1, -0.25], 0.4],
];

/** The cosine above which a face of the long muzzle points up, so that it gets the fur color. */
const MUZZLE_TOP_FACING = 0.35;

/** The direction of the horn: up, and a little to the front. */
export const RHINO_HORN_AXIS: Vec3 = [0, 1, -0.3];

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
 * Adds a nose: a ball 1.3 times as wide as it is tall.
 *
 * @param builder The mesh that gets the part.
 * @param colors The colors of the species.
 * @param h The head height `H`.
 * @param at The center of the nose.
 * @param radius The half height of the nose, in H.
 */
function addNose(
  builder: MeshBuilder,
  colors: BodyColors,
  h: number,
  at: Vec3,
  radius = 0.05,
): void {
  builder.add(ball(1, 8, 4), {
    color: colors.nose,
    bone: boneIndex('head'),
    at: transform(at, undefined, [1.3 * radius * h, radius * h, radius * h]),
  });
}

/** The number of faces around the axis of a muzzle. */
const MUZZLE_SEGMENTS = 10;

/**
 * Adds a cone that points out of the face, such as a long muzzle or a horn.
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
  species: BipedParams,
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
      // Two round cheeks low on the face, and the nose above them, as the muzzles of the
      // polished images.
      for (const side of [-1, 1]) {
        builder.add(ball(1, 8, 4), {
          color: muzzle,
          bone: head,
          at: transform(at(side * 0.09, -0.31, -0.55), undefined, [0.13 * h, 0.11 * h, 0.12 * h]),
        });
      }
      addNose(builder, colors, h, at(0, -0.21, -0.66), 0.055);
      return bones;
    }
    case 'long': {
      // A full muzzle that reaches 0.25 H in front of the face, with the nose on its tip, as the
      // muzzles of the fox and the wolf in the polished images. It starts high and wide, so
      // that its top continues the forehead. Its top has the fur color, and its sides and its
      // underside have the color of the muzzle.
      const axis = new Vector3(0, -0.35, -1).normalize();
      const from = at(0, -0.12, -0.36);
      const length = 0.5;
      const cone = placeCorners(
        lathe(
          [
            [0.36 * h, 0],
            [0.32 * h, 0.2 * h],
            [0.24 * h, 0.38 * h],
            [0.13 * h, length * h],
          ],
          MUZZLE_SEGMENTS,
        ),
        transform(from, alongAxis(toVec3(axis), [1, 0, 0]), [1, 1, 0.72]),
      );
      const [top, sides] = splitByFacing(cone, [0, 1, 0], MUZZLE_TOP_FACING);
      builder.add(top, { color: colors.fur, bone: head });
      builder.add(sides, { color: muzzle, bone: head });
      const nose = new Vector3(...from).addScaledVector(axis, (length - 0.03) * h);
      addNose(builder, colors, h, toVec3(nose), 0.075);
      return bones;
    }
    case 'blunt': {
      // A short round muzzle of 0.3 H in front of the face, with a large nose on the top of its
      // tip, as the beagles of the polished images.
      const axis = new Vector3(0, -0.2, -1).normalize();
      const from = at(0, -0.17, -0.4);
      const length = 0.5;
      addCone(
        builder,
        from,
        toVec3(axis),
        [
          [0.3 * h, 0],
          [0.3 * h, 0.24 * h],
          [0.27 * h, 0.38 * h],
          [0.17 * h, 0.47 * h],
          [0, length * h],
        ],
        0.82,
        muzzle,
        'head',
      );
      const nose = new Vector3(...from)
        .addScaledVector(axis, (length - 0.06) * h)
        .add(new Vector3(0, 0.12 * h, 0));
      addNose(builder, colors, h, toVec3(nose), 0.085);
      return bones;
    }
    case 'broad': {
      // A large round muzzle, wider than it is tall, with two nostrils on its top front, as the
      // hippos of the polished images.
      builder.add(ball(1, MUZZLE_SEGMENTS, 5), {
        color: muzzle,
        bone: head,
        at: transform(at(0, -0.28, -0.48), undefined, [0.44 * h, 0.3 * h, 0.34 * h]),
      });
      for (const side of [-1, 1]) {
        builder.add(ball(1, 8, 4), {
          color: colors.nose,
          bone: head,
          at: transform(at(side * 0.13, -0.16, -0.76), undefined, [0.06 * h, 0.035 * h, 0.04 * h]),
        });
      }
      return bones;
    }
    case 'pointed': {
      // A thin cone that reaches 0.2 H in front of the face, with a small nose at its tip.
      const axis = new Vector3(0, -0.3, -1).normalize();
      const from = at(0, -0.16, -0.36);
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
    default:
      throw unknownValue('snout type', species.snout);
  }
}
