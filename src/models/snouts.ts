import { LIMB_SEGMENTS, addLimb, alongAxis, partColor, unknownValue } from './body-parts.ts';
import type { BodyColors } from './body-parts.ts';
import { add, normalize, scale, transform } from './math.ts';
import type { Vec3 } from './math.ts';
import type { MeshBuilder, Rgb } from './mesh.ts';
import { cylinder, icosphere, lathe } from './primitives.ts';
import { boneIndex } from './rig.ts';
import type { SpeciesParams } from './species.ts';

/** The bind positions of the bones that the snout places. */
export interface SnoutBones {
  /** The hinge of the lower jaw or of the lower beak (design 4.7). */
  readonly jaw: Vec3;
  /** The joints of the trunk. Each species has them, and only the elephant has a trunk. */
  readonly trunk: readonly [Vec3, Vec3, Vec3];
}

/**
 * The three segments of the trunk (design 4.5: 1.4 H on 3 bones): the direction, the length in
 * H, and the radius at the start in H. The trunk hangs down in front of the chest, and its tip
 * turns to the front.
 */
const TRUNK_SEGMENTS: readonly (readonly [direction: Vec3, length: number, radius: number])[] = [
  [[0, -1.2, -1], 0.5, 0.19],
  [[0, -1, -0.05], 0.5, 0.14],
  [[0, -0.6, -1], 0.4, 0.11],
];

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
  const joints: Vec3[] = [add(headCenter, [0, -0.15 * h, -0.33 * h])];
  for (const [direction, length] of TRUNK_SEGMENTS) {
    const last = joints.at(-1) ?? headCenter;
    joints.push(add(last, scale(normalize(direction), length * h)));
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
 */
function addNose(builder: MeshBuilder, colors: BodyColors, h: number, at: Vec3): void {
  builder.add(icosphere(0.05 * h, 0), {
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
 * @returns The bind positions of the jaw and of the trunk.
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
  const at = (x: number, y: number, z: number): Vec3 => add(headCenter, [x * h, y * h, z * h]);
  const [root = headCenter, second = headCenter, third = headCenter] = trunkJoints(h, headCenter);
  const bones: SnoutBones = { jaw: at(0, -0.2, -0.3), trunk: [root, second, third] };
  switch (species.snout) {
    case 'short': {
      // A muzzle of 0.25 H in front of the face, and the nose.
      builder.add(icosphere(1, 0), {
        color: muzzle,
        bone: head,
        at: transform(at(0, -0.17, -0.36), undefined, [0.17 * h, 0.13 * h, 0.13 * h]),
      });
      addNose(builder, colors, h, at(0, -0.1, -0.48));
      return bones;
    }
    case 'long': {
      // A tapered muzzle that reaches 0.45 H in front of the face, with the nose at its tip.
      const axis = normalize([0, -0.3, -1]);
      const from = at(0, -0.12, -0.28);
      const length = 0.62;
      addCone(
        builder,
        from,
        axis,
        [
          [0.2 * h, 0],
          [0.17 * h, 0.22 * h],
          [0.11 * h, 0.47 * h],
          [0.06 * h, length * h],
        ],
        0.8,
        muzzle,
        'head',
      );
      addNose(builder, colors, h, add(add(from, scale(axis, length * h)), [0, 0.03 * h, 0]));
      return bones;
    }
    case 'trunk': {
      // Three segments of 1.4 H in all, with a ball at each bend. The tip of the trunk is its
      // nose, so the trunk has no nose ball.
      const joints = [root, second, third];
      const names = ['trunk1', 'trunk2', 'trunk3'] as const;
      for (const [i, [direction, length, radius]] of TRUNK_SEGMENTS.entries()) {
        const start = joints[i] ?? root;
        const end = add(start, scale(normalize(direction), length * h));
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
      const front = -0.56;
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
        at: transform(at(0, -0.2, -0.4), undefined, [0.24 * h, 0.2 * h, 0.3 * h]),
      });
      addNose(builder, colors, h, at(0, -0.26, -0.69));
      addCone(
        builder,
        at(0, -0.04, -0.58),
        [0, 1, -0.45],
        [
          [0.08 * h, 0],
          [0.05 * h, 0.2 * h],
          [0, 0.4 * h],
        ],
        1,
        partColor(species, colors, 'horn'),
        'head',
      );
      return bones;
    }
    case 'beak': {
      // An upper beak that reaches 0.3 H in front of the face, and a lower beak on the jaw, so
      // that the choir can open it (design 4.7).
      const color = partColor(species, colors, 'beak');
      addCone(
        builder,
        at(0, -0.06, -0.36),
        [0, -0.15, -1],
        [
          [0.12 * h, 0],
          [0, 0.4 * h],
        ],
        0.6,
        color,
        'head',
      );
      const jaw = at(0, -0.12, -0.34);
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
