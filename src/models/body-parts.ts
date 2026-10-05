import { rotationBetween, sub, transform } from './math.ts';
import type { Vec3 } from './math.ts';
import { srgb } from './mesh.ts';
import type { MeshBuilder, Rgb } from './mesh.ts';
import { cylinder } from './primitives.ts';
import { boneIndex } from './rig.ts';
import type { BoneName } from './rig.ts';
import { EYE_COLOR, NOSE_COLOR } from './species.ts';
import type { AccentPart, SpeciesParams } from './species.ts';

/** The number of sides of a limb cylinder (design 4.5, facets). */
export const LIMB_SEGMENTS = 6;

/** The colors of one species, in linear values. */
export interface BodyColors {
  readonly fur: Rgb;
  readonly belly: Rgb;
  readonly accent: Rgb;
  readonly eye: Rgb;
  readonly nose: Rgb;
}

/**
 * Converts the colors of a species to linear values (design 4.5, species colors).
 *
 * @param species The species parameters.
 * @returns The colors. The nose has the accent color if the accent parts include the nose.
 */
export function bodyColors(species: SpeciesParams): BodyColors {
  return {
    fur: srgb(species.colors.fur),
    belly: srgb(species.colors.belly),
    accent: srgb(species.colors.accent),
    eye: srgb(EYE_COLOR),
    nose: srgb(species.accentParts.includes('nose') ? species.colors.accent : NOSE_COLOR),
  };
}

/**
 * Gives the color of a part that can get the accent color.
 *
 * @param species The species parameters.
 * @param colors The colors of the species.
 * @param part The accent part.
 * @param otherwise The color if the accent parts do not include `part`. Default: the fur.
 * @returns The accent color, or `otherwise`.
 */
export function partColor(
  species: SpeciesParams,
  colors: BodyColors,
  part: AccentPart,
  otherwise: Rgb = colors.fur,
): Rgb {
  return species.accentParts.includes(part) ? colors.accent : otherwise;
}

/**
 * Makes the error for a value outside its union. The `never` parameter makes the TypeScript check
 * fail when a switch misses a member of the union.
 *
 * @param kind The name of the parameter.
 * @param value The value that no case handles.
 * @returns The error.
 */
export function unknownValue(kind: string, value: never): Error {
  return new Error(`The ${kind} "${String(value)}" is not known.`);
}

/**
 * Makes the error for a shape parameter that step 4 builds.
 *
 * @param kind The name of the parameter, such as "ear type".
 * @param value The value of the parameter.
 * @returns The error.
 */
export function notBuiltYet(kind: string, value: string): Error {
  return new Error(`The ${kind} "${value}" is not built yet (step 4).`);
}

/**
 * Adds a limb segment: a cylinder of 6 sides from one joint to the next.
 *
 * @param builder The mesh that gets the part.
 * @param from The start joint.
 * @param to The end joint.
 * @param radii The radius at the start and at the end.
 * @param color The color.
 * @param bone The bone that the part follows.
 */
export function addLimb(
  builder: MeshBuilder,
  from: Vec3,
  to: Vec3,
  radii: readonly [number, number],
  color: Rgb,
  bone: BoneName,
): void {
  const axis = sub(to, from);
  const length = Math.hypot(axis[0], axis[1], axis[2]);
  builder.add(cylinder(radii[0], radii[1], length, LIMB_SEGMENTS), {
    color,
    bone: boneIndex(bone),
    at: transform(from, rotationBetween([0, 1, 0], axis)),
  });
}
