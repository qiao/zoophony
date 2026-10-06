import { Matrix4, Quaternion, Vector3 } from 'three';
import { toQuat } from './tuples.ts';
import type { Quat, Vec3 } from './tuples.ts';
import { applyTransform, srgb, transform } from './mesh.ts';
import type { MeshBuilder, Rgb, Transform } from './mesh.ts';
import { tube } from './primitives.ts';
import { boneIndex } from './rig.ts';
import type { BoneName } from './rig.ts';
import { EYE_COLOR, NOSE_COLOR } from './species.ts';
import type { AccentPart, SpeciesParams } from './species.ts';

/** The number of sides of a limb tube (design 4.5, facets). */
export const LIMB_SEGMENTS = 10;

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
 * Makes the rotation that turns the y axis to `axis` and the x axis as near as possible to
 * `xHint`. A part that is flat on x or z then keeps its flat side to a known direction.
 *
 * @param axis The new y axis. The function normalizes it.
 * @param xHint A direction that is not parallel to `axis`.
 * @returns The rotation.
 */
export function alongAxis(axis: Vec3, xHint: Vec3): Quat {
  const y = new Vector3(...axis).normalize();
  const x = new Vector3(...xHint).projectOnPlane(y).normalize();
  const z = new Vector3().crossVectors(x, y);
  return toQuat(new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, y, z)));
}

/**
 * Applies a transform to the corners of a part. The transform must not mirror the part.
 *
 * @param corners The corner list, 9 numbers for each triangle.
 * @param at The transform.
 * @returns The new corner list.
 */
export function placeCorners(corners: readonly number[], at: Transform): number[] {
  const out: number[] = [];
  for (let i = 0; i + 2 < corners.length; i += 3) {
    out.push(...applyTransform(at, [corners[i] ?? 0, corners[i + 1] ?? 0, corners[i + 2] ?? 0]));
  }
  return out;
}

/** The transform that mirrors a part of the right side to the left side (x to -x). */
export const MIRROR_X = transform([0, 0, 0], undefined, [-1, 1, 1]);

/**
 * The radius of the inner rings of a limb, as a factor of the radius between the end radii. The
 * limb bulges a little in its middle, as a muscle.
 */
export const LIMB_BULGE = 1.1;

/**
 * Adds a limb segment from one joint to the next: a faceted tube of 10 sides with four rings. Each
 * ring turns by half a side against its neighbors, so that the limb has small triangle facets and
 * looks round, as in `animals.webp`. The two inner rings bulge, as a muscle.
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
  const axis = new Vector3(...to).sub(new Vector3(...from));
  const length = axis.length();
  const inner = (t: number): number => (radii[0] + (radii[1] - radii[0]) * t) * LIMB_BULGE;
  const rings = [
    { radius: radii[0], y: 0, turn: 0 },
    { radius: inner(1 / 3), y: length / 3, turn: 0.5 },
    { radius: inner(2 / 3), y: (2 * length) / 3, turn: 0 },
    { radius: radii[1], y: length, turn: 0.5 },
  ];
  builder.add(tube(rings, LIMB_SEGMENTS), {
    color,
    bone: boneIndex(bone),
    at: transform(
      from,
      toQuat(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), axis.normalize())),
    ),
  });
}
