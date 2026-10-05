import { notBuiltYet, partColor, unknownValue } from './body-parts.ts';
import type { BodyColors } from './body-parts.ts';
import { add, transform } from './math.ts';
import type { Vec3 } from './math.ts';
import type { MeshBuilder } from './mesh.ts';
import type { SpeciesParams } from './species.ts';
import { icosphere } from './primitives.ts';
import { boneIndex } from './rig.ts';

/**
 * Adds the tail of a species behind the hips (design 4.3, 4.5).
 *
 * @param builder The mesh that gets the parts.
 * @param species The species parameters.
 * @param colors The colors of the species.
 * @param h The head height `H`, in meters.
 * @param base The point where the tail leaves the body.
 * @throws Error for a tail type that step 4 adds.
 */
export function addTail(
  builder: MeshBuilder,
  species: SpeciesParams,
  colors: BodyColors,
  h: number,
  base: Vec3,
): void {
  switch (species.tail) {
    case 'puff':
      // A ball of 0.2 H on one bone (design 4.5).
      builder.add(icosphere(0.12 * h, 0), {
        color: partColor(species, colors, 'tail'),
        bone: boneIndex('tail1'),
        at: transform(add(base, [0, 0, 0.06 * h])),
      });
      return;
    case 'none':
    case 'bushy':
    case 'ringed':
    case 'thin':
    case 'flat':
      throw notBuiltYet('tail type', species.tail);
    default:
      throw unknownValue('tail type', species.tail);
  }
}
