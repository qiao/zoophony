import { Vector3 } from 'three';
import { LIMB_SEGMENTS, alongAxis, partColor, unknownValue } from './body-parts.ts';
import type { BodyColors } from './body-parts.ts';
import { transform } from './mesh.ts';
import { toVec3 } from './tuples.ts';
import type { Vec3 } from './tuples.ts';
import type { MeshBuilder, Rgb } from './mesh.ts';
import { icosphere, lathe } from './primitives.ts';
import type { ProfilePoint } from './primitives.ts';
import { boneIndex } from './rig.ts';
import type { BoneName } from './rig.ts';
import type { BipedParams } from './species.ts';

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

/** The path of the thin tail, the only tail of two bones (design 4.5: 0.7 H). */
const THIN_PATH: TailPath = {
  first: [0, -0.35, 1],
  firstLength: 0.3,
  second: [0.15, -1, 0.3],
  secondLength: 0.4,
};

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
 * Adds the thin tail of two bones along its path.
 *
 * @param builder The mesh that gets the parts.
 * @param species The species parameters.
 * @param colors The colors of the species.
 * @param h The head height `H`, in meters.
 * @param base The point where the tail leaves the body.
 * @param joint The point where the second bone starts.
 */
function addLongTail(
  builder: MeshBuilder,
  species: BipedParams,
  colors: BodyColors,
  h: number,
  base: Vec3,
  joint: Vec3,
): void {
  const path = THIN_PATH;
  const color = partColor(species, colors, 'tail');
  const l1 = path.firstLength * h;
  const l2 = path.secondLength * h;
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
  species: BipedParams,
  colors: BodyColors,
  h: number,
  base: Vec3,
): [Vec3, Vec3] {
  const tail = species.tail;
  switch (tail) {
    case 'none':
      return [base, toVec3(new Vector3(...base).add(new Vector3(0, 0, 0.1 * h)))];
    case 'puff':
      // A faceted ball of 0.42 H on one bone (design 4.5), low on the back and 0.26 H behind the
      // root of the tail, so that it stands out of the round back and shows under the top rail of
      // the chair, as in `animals.webp`.
      builder.add(icosphere(0.21 * h, 0), {
        color: partColor(species, colors, 'tail'),
        bone: boneIndex('tail1'),
        at: transform(toVec3(new Vector3(...base).add(new Vector3(0, -0.08 * h, 0.26 * h)))),
      });
      return [base, toVec3(new Vector3(...base).add(new Vector3(0, 0, 0.1 * h)))];
    case 'thin': {
      const path = THIN_PATH;
      const joint = toVec3(
        new Vector3(...base).addScaledVector(
          new Vector3(...path.first).normalize(),
          path.firstLength * h,
        ),
      );
      addLongTail(builder, species, colors, h, base, joint);
      return [base, joint];
    }
    default:
      throw unknownValue('tail type', tail);
  }
}
