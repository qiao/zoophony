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
 * leaves the body at the seat, goes back through the open back under the top rail of the chair,
 * and hangs down.
 */
interface TailPath {
  readonly first: Vec3;
  readonly firstLength: number;
  readonly second: Vec3;
  readonly secondLength: number;
}

/**
 * The space between the tip of a bushy tail and the floor, in meters. The tip stays above the
 * tripod legs of the music stands of the next row. With 0.03 m, the stands of the clarinets of the
 * reference composition touched the tails of the foxes, and `S` became 6.76 m in place of 6.6 m.
 */
const TAIL_FLOOR_GAP = 0.12;

/**
 * Gives the path of a tail of two bones (design 4.5: bushy 1.3, thin 0.7, flat 0.5 H).
 *
 * @param tail The tail type.
 * @param base The point where the tail leaves the body.
 * @param h The head height `H`, in meters.
 * @returns The path.
 */
function tailPath(tail: 'bushy' | 'thin' | 'flat', base: Vec3, h: number): TailPath {
  switch (tail) {
    case 'bushy': {
      // The brush hangs down to the floor behind the seat. It hangs less steeply when the base
      // is low, as on a standing player, so that its tip stays above the floor.
      const first: Vec3 = [0, -0.35, 1];
      const firstLength = 0.4;
      const secondLength = 1.0;
      const joint = base[1] - (0.35 / Math.hypot(0.35, 1)) * firstLength * h;
      const down = Math.min(0.97, (joint - TAIL_FLOOR_GAP) / (secondLength * h));
      const back = Math.max(0.08, Math.sqrt(Math.max(0, 1 - down * down - 0.08 * 0.08)));
      return { first, firstLength, second: [0.08, -down, back], secondLength };
    }
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
  tail: 'bushy' | 'thin' | 'flat',
  species: SpeciesParams,
  colors: BodyColors,
  h: number,
  base: Vec3,
  joint: Vec3,
): void {
  const path = tailPath(tail, base, h);
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
    case 'bushy': {
      // A large faceted brush, 0.5 H wide, with a tip of the belly color, as the tail of the fox
      // in `animals.webp`.
      addAlong(
        builder,
        base,
        path.first,
        [
          [0.08 * h, 0],
          [0.2 * h, 0.6 * l1],
          [0.22 * h, l1],
        ],
        color,
        'tail1',
      );
      const tip = 0.55 * l2;
      addAlong(
        builder,
        joint,
        path.second,
        [
          [0.22 * h, 0],
          [0.27 * h, 0.35 * l2],
          [0.22 * h, tip],
        ],
        color,
        'tail2',
      );
      addAlong(
        builder,
        add(joint, scale(normalize(path.second), tip)),
        path.second,
        [
          [0.22 * h, 0],
          [0, l2 - tip],
        ],
        colors.belly,
        'tail2',
      );
      return;
    }
    case 'flat':
      // A short stalk and a flat paddle of 0.45 H wide with its broad face to the back.
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
      builder.add(box(0.45 * h, l2, 0.06 * h), {
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
 * the accent color if the accent parts include the tail.
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
      // A faceted ball of 0.42 H on one bone (design 4.5), low on the back, so that it shows
      // under the top rail of the chair, as in `animals.webp`.
      builder.add(icosphere(0.21 * h, 0), {
        color: partColor(species, colors, 'tail'),
        bone: boneIndex('tail1'),
        at: transform(add(base, [0, -0.1 * h, 0.14 * h])),
      });
      return [base, add(base, [0, 0, 0.1 * h])];
    case 'bushy':
    case 'thin':
    case 'flat': {
      const path = tailPath(tail, base, h);
      const joint = add(base, scale(normalize(path.first), path.firstLength * h));
      addLongTail(builder, tail, species, colors, h, base, joint);
      return [base, joint];
    }
    default:
      throw unknownValue('tail type', tail);
  }
}
