import { notBuiltYet, partColor, LIMB_SEGMENTS, unknownValue } from './body-parts.ts';
import type { BodyColors } from './body-parts.ts';
import { DEG, add, euler, transform } from './math.ts';
import type { Vec3 } from './math.ts';
import type { MeshBuilder } from './mesh.ts';
import type { SpeciesParams } from './species.ts';
import { lathe } from './primitives.ts';
import { boneIndex } from './rig.ts';

/**
 * Adds the two ears of a species to the head (design 4.3, 4.5). Each ear follows its ear bone.
 *
 * @param builder The mesh that gets the parts.
 * @param species The species parameters.
 * @param colors The colors of the species.
 * @param h The head height `H`, in meters.
 * @param headCenter The center of the head.
 * @returns The base of the left ear and of the right ear, for the ear bones.
 * @throws Error for an ear type that step 4 adds.
 */
export function addEars(
  builder: MeshBuilder,
  species: SpeciesParams,
  colors: BodyColors,
  h: number,
  headCenter: Vec3,
): [Vec3, Vec3] {
  switch (species.ears) {
    case 'long': {
      const outer = lathe(
        [
          [0.1 * h, 0],
          [0.15 * h, 0.35 * h],
          [0.13 * h, 0.8 * h],
          [0.05 * h, 1.05 * h],
          [0, 1.1 * h],
        ],
        LIMB_SEGMENTS,
      );
      const inner = lathe(
        [
          [0.05 * h, 0.12 * h],
          [0.09 * h, 0.4 * h],
          [0.07 * h, 0.8 * h],
          [0, 1.0 * h],
        ],
        LIMB_SEGMENTS,
      );
      const bases: [Vec3, Vec3] = [
        add(headCenter, [-0.17 * h, 0.4 * h, 0.03 * h]),
        add(headCenter, [0.17 * h, 0.4 * h, 0.03 * h]),
      ];
      for (const [i, side] of ([-1, 1] as const).entries()) {
        const base = bases[i] ?? headCenter;
        // Each ear leans out by 12° and back by 8°.
        const turn = euler(8 * DEG, 0, -side * 12 * DEG);
        const bone = boneIndex(side < 0 ? 'earL' : 'earR');
        builder.add(outer, {
          color: partColor(species, colors, 'ears'),
          bone,
          at: transform(base, turn, [1, 1, 0.45]),
        });
        builder.add(inner, {
          color: partColor(species, colors, 'inner-ears'),
          bone,
          at: transform(add(base, [0, 0, -0.045 * h]), turn, [1, 1, 0.3]),
        });
      }
      return bases;
    }
    case 'pointed':
    case 'round':
    case 'large-round':
    case 'floppy':
    case 'large-flap':
    case 'small':
    case 'none':
      throw notBuiltYet('ear type', species.ears);
    default:
      throw unknownValue('ear type', species.ears);
  }
}
