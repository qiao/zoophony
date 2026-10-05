import { LIMB_SEGMENTS, alongAxis, partColor, unknownValue } from './body-parts.ts';
import type { BodyColors } from './body-parts.ts';
import { add, normalize, scale, transform } from './math.ts';
import type { Vec3 } from './math.ts';
import type { MeshBuilder, Rgb } from './mesh.ts';
import { box, icosphere, lathe } from './primitives.ts';
import type { ProfilePoint } from './primitives.ts';
import { boneIndex } from './rig.ts';
import type { BoneName } from './rig.ts';
import type { SpeciesParams } from './species.ts';

/**
 * The path of a tail of two bones: the direction and the length in H of each segment. The tail
 * leaves the body at the seat, goes back through the gap under the chair back, and hangs down.
 */
interface TailPath {
  readonly first: Vec3;
  readonly firstLength: number;
  readonly second: Vec3;
  readonly secondLength: number;
}

/** The number of rings of a ringed tail on each of its two bones. */
const RINGS_PER_BONE = 3;

/**
 * Gives the path of a tail of two bones (design 4.5: bushy 0.9, ringed 0.8, thin 0.7, flat 0.5 H).
 *
 * @param tail The tail type.
 * @returns The path.
 */
function tailPath(tail: 'bushy' | 'ringed' | 'thin' | 'flat'): TailPath {
  switch (tail) {
    case 'bushy':
      return {
        first: [0, -0.35, 1],
        firstLength: 0.35,
        second: [0.15, -1, 0.3],
        secondLength: 0.55,
      };
    case 'ringed':
      return {
        first: [0, -0.35, 1],
        firstLength: 0.35,
        second: [0.15, -1, 0.3],
        secondLength: 0.45,
      };
    case 'thin':
      return { first: [0, -0.35, 1], firstLength: 0.3, second: [0.15, -1, 0.3], secondLength: 0.4 };
    case 'flat':
      return { first: [0, -0.2, 1], firstLength: 0.15, second: [0, -1, 0.35], secondLength: 0.35 };
    default:
      throw unknownValue('tail type', tail);
  }
}

/**
 * Adds a solid of revolution along a direction.
 *
 * @param builder The mesh that gets the part.
 * @param from The start of the part.
 * @param direction The direction of the part.
 * @param profile The radii and the distances along the direction, in meters.
 * @param color The color.
 * @param bone The bone that the part follows.
 */
function addAlong(
  builder: MeshBuilder,
  from: Vec3,
  direction: Vec3,
  profile: readonly ProfilePoint[],
  color: Rgb,
  bone: BoneName,
): void {
  builder.add(lathe(profile, LIMB_SEGMENTS), {
    color,
    bone: boneIndex(bone),
    at: transform(from, alongAxis(direction, [1, 0, 0])),
  });
}

/**
 * Adds a tail of two bones along its path.
 *
 * @param builder The mesh that gets the parts.
 * @param tail The tail type.
 * @param species The species parameters.
 * @param colors The colors of the species.
 * @param h The head height `H`, in meters.
 * @param base The point where the tail leaves the body.
 * @param joint The point where the second bone starts.
 */
function addLongTail(
  builder: MeshBuilder,
  tail: 'bushy' | 'ringed' | 'thin' | 'flat',
  species: SpeciesParams,
  colors: BodyColors,
  h: number,
  base: Vec3,
  joint: Vec3,
): void {
  const path = tailPath(tail);
  const color = partColor(species, colors, 'tail');
  const l1 = path.firstLength * h;
  const l2 = path.secondLength * h;
  switch (tail) {
    case 'thin':
      addAlong(
        builder,
        base,
        path.first,
        [
          [0.05 * h, 0],
          [0.04 * h, l1],
        ],
        color,
        'tail1',
      );
      addAlong(
        builder,
        joint,
        path.second,
        [
          [0.04 * h, 0],
          [0.025 * h, l2],
        ],
        color,
        'tail2',
      );
      return;
    case 'bushy':
      addAlong(
        builder,
        base,
        path.first,
        [
          [0.06 * h, 0],
          [0.13 * h, 0.55 * l1],
          [0.16 * h, l1],
        ],
        color,
        'tail1',
      );
      addAlong(
        builder,
        joint,
        path.second,
        [
          [0.16 * h, 0],
          [0.15 * h, 0.45 * l2],
          [0.08 * h, 0.85 * l2],
          [0, l2],
        ],
        color,
        'tail2',
      );
      return;
    case 'ringed': {
      // Rings of the fur color and the accent color, with the accent color at the tip.
      const radius = (t: number): number => (0.09 - 0.04 * t) * h;
      const segments = [
        [base, path.first, l1, 'tail1', 0],
        [joint, path.second, l2, 'tail2', 0.5],
      ] as const;
      for (const [from, direction, segmentLength, bone, start] of segments) {
        for (let i = 0; i < RINGS_PER_BONE; i++) {
          const ring = bone === 'tail1' ? i : i + RINGS_PER_BONE;
          const ringColor =
            ring % 2 === 1 ? partColor(species, colors, 'tail', colors.fur) : colors.fur;
          const a = (i / RINGS_PER_BONE) * segmentLength;
          const b = ((i + 1) / RINGS_PER_BONE) * segmentLength;
          const ta = start + (0.5 * i) / RINGS_PER_BONE;
          const tb = start + (0.5 * (i + 1)) / RINGS_PER_BONE;
          addAlong(
            builder,
            from,
            direction,
            [
              [radius(ta), a],
              [radius(tb), b],
            ],
            ringColor,
            bone,
          );
        }
      }
      return;
    }
    case 'flat':
      // A short stalk and a flat paddle with its broad face to the back.
      addAlong(
        builder,
        base,
        path.first,
        [
          [0.06 * h, 0],
          [0.06 * h, l1],
        ],
        color,
        'tail1',
      );
      builder.add(box(0.3 * h, l2, 0.06 * h), {
        color,
        bone: boneIndex('tail2'),
        at: transform(
          add(joint, scale(normalize(path.second), l2 / 2)),
          alongAxis(path.second, [1, 0, 0]),
        ),
      });
      return;
    default:
      throw unknownValue('tail type', tail);
  }
}

/**
 * Adds the tail of a species behind the hips (design 4.3, 4.5). The tail has the fur color, or
 * the accent color if the accent parts include the tail. A ringed tail has rings of both colors.
 *
 * @param builder The mesh that gets the parts.
 * @param species The species parameters.
 * @param colors The colors of the species.
 * @param h The head height `H`, in meters.
 * @param base The point where the tail leaves the body.
 * @returns The bind positions of the `tail1` and `tail2` bones.
 */
export function addTail(
  builder: MeshBuilder,
  species: SpeciesParams,
  colors: BodyColors,
  h: number,
  base: Vec3,
): [Vec3, Vec3] {
  const tail = species.tail;
  switch (tail) {
    case 'none':
      return [base, add(base, [0, 0, 0.1 * h])];
    case 'puff':
      // A ball of 0.2 H on one bone (design 4.5).
      builder.add(icosphere(0.1 * h, 0), {
        color: partColor(species, colors, 'tail'),
        bone: boneIndex('tail1'),
        at: transform(add(base, [0, 0, 0.06 * h])),
      });
      return [base, add(base, [0, 0, 0.1 * h])];
    case 'bushy':
    case 'ringed':
    case 'thin':
    case 'flat': {
      const path = tailPath(tail);
      const joint = add(base, scale(normalize(path.first), path.firstLength * h));
      addLongTail(builder, tail, species, colors, h, base, joint);
      return [base, joint];
    }
    default:
      throw unknownValue('tail type', tail);
  }
}
