import { notBuiltYet, unknownValue } from './body-parts.ts';
import type { BodyColors } from './body-parts.ts';
import { add, transform } from './math.ts';
import type { Vec3 } from './math.ts';
import type { MeshBuilder } from './mesh.ts';
import type { SpeciesParams } from './species.ts';
import { icosphere } from './primitives.ts';
import { boneIndex } from './rig.ts';

/**
 * Adds the snout and the nose of a species to the head (design 4.3, 4.5).
 *
 * @param builder The mesh that gets the parts.
 * @param species The species parameters.
 * @param colors The colors of the species.
 * @param h The head height `H`, in meters.
 * @param headCenter The center of the head.
 * @throws Error for a snout type that step 4 adds.
 */
export function addSnout(
  builder: MeshBuilder,
  species: SpeciesParams,
  colors: BodyColors,
  h: number,
  headCenter: Vec3,
): void {
  const head = boneIndex('head');
  switch (species.snout) {
    case 'short': {
      // A muzzle of 0.25 H in front of the face, in the belly color (design 4.3), and the nose.
      builder.add(icosphere(1, 0), {
        color: colors.belly,
        bone: head,
        at: transform(add(headCenter, [0, -0.17 * h, -0.36 * h]), undefined, [
          0.17 * h,
          0.13 * h,
          0.13 * h,
        ]),
      });
      builder.add(icosphere(0.05 * h, 0), {
        color: colors.nose,
        bone: head,
        at: transform(add(headCenter, [0, -0.1 * h, -0.48 * h])),
      });
      return;
    }
    case 'long':
    case 'trunk':
    case 'flat-nose':
    case 'horn':
    case 'beak':
      throw notBuiltYet('snout type', species.snout);
    default:
      throw unknownValue('snout type', species.snout);
  }
}
