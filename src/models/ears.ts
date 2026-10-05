import {
  LIMB_SEGMENTS,
  MIRROR_X,
  alongAxis,
  partColor,
  placeCorners,
  unknownValue,
} from './body-parts.ts';
import type { BodyColors } from './body-parts.ts';
import { DEG, add, basisRotation, euler, scale, transform } from './math.ts';
import type { Vec3 } from './math.ts';
import type { MeshBuilder, Rgb } from './mesh.ts';
import { icosphere, lathe, prism } from './primitives.ts';
import type { OutlinePoint } from './primitives.ts';
import { boneIndex } from './rig.ts';
import type { SpeciesParams } from './species.ts';

/** One part of the right ear, in the axes of the model. */
interface EarPart {
  readonly corners: readonly number[];
  readonly color: Rgb;
}

/** The right ear: its parts and its base, which is the place of the `earR` bone. */
interface RightEar {
  readonly parts: readonly EarPart[];
  readonly base: Vec3;
}

/**
 * The turn of the large-flap ear out of the middle plane of the head. The ear points back and
 * out, so that the ears of two elephants on neighbor seats (0.95 m of arc) do not touch.
 */
export const FLAP_EAR_ANGLE = 32 * DEG;

/**
 * The outline of the large-flap ear (design 4.5: 0.9 H wide), in H: back and up from the front
 * edge. It goes counterclockwise when seen from the front face of the ear.
 */
const FLAP_OUTLINE: readonly OutlinePoint[] = [
  [0, 0.42],
  [0.3, 0.52],
  [0.62, 0.45],
  [0.85, 0.2],
  [0.9, -0.1],
  [0.78, -0.4],
  [0.5, -0.58],
  [0.2, -0.55],
  [0, -0.3],
];

/**
 * Makes a disc ear: a flat ball on the head, with a smaller inner disc at its front.
 *
 * @param h The head height `H`.
 * @param base The base of the ear, a little inside the head.
 * @param lean The turn of the ear out from up.
 * @param size The diameter of the ear, in H.
 * @param outer The color of the ear.
 * @param inner The color of the inner ear.
 * @returns The right ear.
 */
function discEar(
  h: number,
  base: Vec3,
  lean: number,
  size: number,
  outer: Rgb,
  inner: Rgb,
): RightEar {
  const axis: Vec3 = [Math.sin(lean), Math.cos(lean), 0];
  const turn = alongAxis(axis, [1, 0, 0]);
  const center = add(base, scale(axis, 0.35 * size * h));
  return {
    base,
    parts: [
      {
        corners: placeCorners(
          icosphere(0.5, 0),
          transform(center, turn, [size * h, size * h, 0.12 * h]),
        ),
        color: outer,
      },
      {
        corners: placeCorners(
          icosphere(0.5, 0),
          transform(add(center, [0, 0.05 * size * h, -0.05 * h]), turn, [
            0.6 * size * h,
            0.6 * size * h,
            0.05 * h,
          ]),
        ),
        color: inner,
      },
    ],
  };
}

/**
 * Makes a tall ear: a flat cone that stands on the head, with an inner cone at its front.
 *
 * @param h The head height `H`.
 * @param base The base of the ear, a little inside the head.
 * @param height The height of the ear, in H.
 * @param width The width of the ear at its base, in H.
 * @param lean The turn of the ear out from up.
 * @param outer The color of the ear.
 * @param inner The color of the inner ear.
 * @returns The right ear.
 */
function tallEar(
  h: number,
  base: Vec3,
  height: number,
  width: number,
  lean: number,
  outer: Rgb,
  inner: Rgb,
): RightEar {
  const r = (width / 2) * h;
  const outerProfile =
    height > 0.8
      ? // The long ear of the rabbit is widest at a third of its height.
        ([
          [0.1 * h, 0],
          [0.15 * h, 0.35 * h],
          [0.13 * h, 0.8 * h],
          [0.05 * h, 1.05 * h],
          [0, 1.1 * h],
        ] as const)
      : ([
          [r, 0],
          [0.75 * r, 0.5 * height * h],
          [0, height * h],
        ] as const);
  const innerProfile =
    height > 0.8
      ? ([
          [0.05 * h, 0.12 * h],
          [0.09 * h, 0.4 * h],
          [0.07 * h, 0.8 * h],
          [0, 1.0 * h],
        ] as const)
      : ([
          [0.6 * r, 0.1 * height * h],
          [0, 0.85 * height * h],
        ] as const);
  // Each ear leans out, and back by 8°.
  const turn = euler(8 * DEG, 0, -lean);
  return {
    base,
    parts: [
      {
        corners: placeCorners(
          lathe(outerProfile, LIMB_SEGMENTS),
          transform(base, turn, [1, 1, 0.45]),
        ),
        color: outer,
      },
      {
        corners: placeCorners(
          lathe(innerProfile, LIMB_SEGMENTS),
          transform(add(base, [0, 0, -0.045 * h]), turn, [1, 1, 0.3]),
        ),
        color: inner,
      },
    ],
  };
}

/**
 * Makes a floppy ear: a flat leaf that hangs down at the side of the head.
 *
 * @param h The head height `H`.
 * @param color The color of the ear.
 * @returns The right ear.
 */
function floppyEar(h: number, color: Rgb): RightEar {
  const base: Vec3 = [0.33 * h, 0.33 * h, 0];
  const turn = alongAxis([0.45, -1, 0.05], [1, 0, 0]);
  const profile = [
    [0.1 * h, 0],
    [0.15 * h, 0.22 * h],
    [0.13 * h, 0.4 * h],
    [0, 0.5 * h],
  ] as const;
  return {
    base,
    parts: [
      {
        corners: placeCorners(lathe(profile, LIMB_SEGMENTS), transform(base, turn, [0.3, 1, 1])),
        color,
      },
    ],
  };
}

/**
 * Makes a large-flap ear: a flat plate of 0.9 H that points back and out from the side of the
 * head, with the inner ear on its front face.
 *
 * @param h The head height `H`.
 * @param outer The color of the ear.
 * @param inner The color of the inner ear.
 * @returns The right ear.
 */
function flapEar(h: number, outer: Rgb, inner: Rgb): RightEar {
  const base: Vec3 = [0.36 * h, -0.02 * h, 0.05 * h];
  // x of the plate points back and out, y is the normal of its front face, and z points up.
  const back: Vec3 = [Math.sin(FLAP_EAR_ANGLE), 0, Math.cos(FLAP_EAR_ANGLE)];
  const front: Vec3 = [Math.cos(FLAP_EAR_ANGLE), 0, -Math.sin(FLAP_EAR_ANGLE)];
  const turn = basisRotation(back, front);
  const middle = 0.45;
  const outline = (shrink: number): OutlinePoint[] =>
    FLAP_OUTLINE.map(([u, v]) => [(u - middle) * shrink * h, v * shrink * h]);
  const center = add(base, scale(back, middle * h));
  return {
    base,
    parts: [
      {
        corners: placeCorners(prism(outline(1), -0.03 * h, 0.03 * h), transform(center, turn)),
        color: outer,
      },
      {
        corners: placeCorners(prism(outline(0.75), 0.03 * h, 0.045 * h), transform(center, turn)),
        color: inner,
      },
    ],
  };
}

/**
 * Makes the right ear of a species, in the axes of the model with the head center at the origin.
 *
 * @param species The species parameters.
 * @param colors The colors of the species.
 * @param h The head height `H`, in meters.
 * @returns The right ear.
 */
function rightEar(species: SpeciesParams, colors: BodyColors, h: number): RightEar {
  const outer = partColor(species, colors, 'ears');
  // The inside of an ear has the belly color, unless the accent parts include it.
  const inner = partColor(
    species,
    colors,
    'inner-ears',
    partColor(species, colors, 'ears', colors.belly),
  );
  switch (species.ears) {
    case 'long':
      return tallEar(h, [0.17 * h, 0.4 * h, 0.03 * h], 1.1, 0.3, 12 * DEG, outer, inner);
    case 'pointed':
      return tallEar(h, [0.25 * h, 0.38 * h, 0.02 * h], 0.45, 0.3, 18 * DEG, outer, inner);
    case 'round':
      return discEar(h, [0.27 * h, 0.36 * h, 0.04 * h], 30 * DEG, 0.3, outer, inner);
    case 'large-round':
      return discEar(h, [0.3 * h, 0.3 * h, 0.05 * h], 45 * DEG, 0.45, outer, inner);
    case 'small':
      return discEar(h, [0.28 * h, 0.34 * h, 0.06 * h], 35 * DEG, 0.2, outer, inner);
    case 'floppy':
      return floppyEar(h, outer);
    case 'large-flap':
      return flapEar(h, outer, inner);
    case 'none':
      return { base: [0.25 * h, 0.38 * h, 0], parts: [] };
    default:
      throw unknownValue('ear type', species.ears);
  }
}

/**
 * Adds the two ears of a species to the head (design 4.3, 4.5). Each ear follows its ear bone.
 * The left ear is the mirror image of the right ear.
 *
 * @param builder The mesh that gets the parts.
 * @param species The species parameters.
 * @param colors The colors of the species.
 * @param h The head height `H`, in meters.
 * @param headCenter The center of the head. It is on the middle plane (x = 0).
 * @returns The base of the left ear and of the right ear, for the ear bones.
 */
export function addEars(
  builder: MeshBuilder,
  species: SpeciesParams,
  colors: BodyColors,
  h: number,
  headCenter: Vec3,
): [Vec3, Vec3] {
  const ear = rightEar(species, colors, h);
  const atHead = transform(headCenter);
  for (const part of ear.parts) {
    const corners = placeCorners(part.corners, atHead);
    builder.add(corners, { color: part.color, bone: boneIndex('earR') });
    builder.add(corners, { color: part.color, bone: boneIndex('earL'), at: MIRROR_X });
  }
  const base = add(headCenter, ear.base);
  return [[-base[0], base[1], base[2]], base];
}
