import {
  LIMB_SEGMENTS,
  MIRROR_X,
  alongAxis,
  partColor,
  placeCorners,
  unknownValue,
} from './body-parts.ts';
import type { BodyColors } from './body-parts.ts';
import {
  DEG,
  add,
  axisAngle,
  basisRotation,
  euler,
  multiply,
  normalize,
  rotate,
  scale,
  transform,
} from './math.ts';
import type { Vec3 } from './math.ts';
import type { MeshBuilder, Rgb } from './mesh.ts';
import { cylinder, icosphere, lathe, prism } from './primitives.ts';
import type { OutlinePoint } from './primitives.ts';
import { boneIndex } from './rig.ts';
import type { SpeciesParams } from './species.ts';

/** One part of the right ear, in the axes of the model. */
interface EarPart {
  readonly corners: readonly number[];
  readonly color: Rgb;
  /** The ear bone for an ear, and the head bone for a part that must not move with the ear. */
  readonly bone: 'ear' | 'head';
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
        bone: 'ear',
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
        bone: 'ear',
      },
    ],
  };
}

/**
 * The outline of the long ear of the rabbit (design 4.5: 1.25 H long and 0.4 H wide), in H, as
 * (across, up) from the middle of the ear. It goes clockwise in that view, which is
 * counterclockwise in the axes of {@link prism}. The ear is widest at a third of its length and
 * ends in a point, as in `animals.webp`.
 */
const LONG_OUTLINE: readonly OutlinePoint[] = [
  [0.2, -0.13],
  [0.14, -0.55],
  [-0.14, -0.55],
  [-0.2, -0.13],
  [-0.13, 0.4],
  [0, 0.7],
  [0.13, 0.4],
];

/** The place of the middle of the long ear above its base, in H. */
const LONG_MIDDLE = 0.55;

/**
 * The outline of the pointed ear (design 4.5: 0.55 H tall and 0.42 H wide at the base), in H, as
 * (across, up) from the middle of the ear: a triangle, clockwise in that view.
 */
const POINTED_OUTLINE: readonly OutlinePoint[] = [
  [0.21, -0.2],
  [-0.21, -0.2],
  [0, 0.35],
];

/** The place of the middle of the pointed ear above its base, in H. */
const POINTED_MIDDLE = 0.2;

/** The turn of the front face of a flat ear out to the side of the head. */
const EAR_TURN_OUT = 30 * DEG;

/**
 * Makes a flat ear: a plate with a sharp outline that stands on the head, with a smaller inner
 * plate on its front face, as the ears of `animals.webp`.
 *
 * @param h The head height `H`.
 * @param base The base of the ear, a little inside the head.
 * @param outline The outline of the ear, in H, as (across, up) from its middle, clockwise.
 * @param middle The height of the middle of the outline above the base, in H.
 * @param lean The turn of the ear out from up.
 * @param outer The color of the ear.
 * @param inner The color of the inner ear.
 * @returns The right ear.
 */
function flatEar(
  h: number,
  base: Vec3,
  outline: readonly OutlinePoint[],
  middle: number,
  lean: number,
  outer: Rgb,
  inner: Rgb,
): RightEar {
  // The ear leans out, and back by 10°. Its front face turns out by 30°, so that the side view
  // shows the inner ear, as in `animals.webp`. The prism axes: x across the ear, y to the front
  // of the ear, and z up along the ear.
  const turn = multiply(
    euler(10 * DEG, 0, -lean),
    multiply(axisAngle([0, 1, 0], -EAR_TURN_OUT), basisRotation([1, 0, 0], [0, 0, -1])),
  );
  const center = add(base, rotate(turn, [0, 0, middle * h]));
  const plate = (shrink: number): OutlinePoint[] =>
    outline.map(([u, v]) => [u * shrink * h, (v * shrink - 0.04 * (1 - shrink)) * h]);
  return {
    base,
    parts: [
      {
        corners: placeCorners(prism(plate(1), -0.045 * h, 0.045 * h), transform(center, turn)),
        color: outer,
        bone: 'ear',
      },
      {
        corners: placeCorners(prism(plate(0.66), 0.045 * h, 0.065 * h), transform(center, turn)),
        color: inner,
        bone: 'ear',
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
  const base: Vec3 = [0.44 * h, 0.28 * h, 0];
  const turn = alongAxis([0.7, -1, 0.05], [1, 0, 0]);
  const profile = [
    [0.12 * h, 0],
    [0.18 * h, 0.25 * h],
    [0.15 * h, 0.42 * h],
    [0, 0.5 * h],
  ] as const;
  return {
    base,
    parts: [
      {
        corners: placeCorners(lathe(profile, LIMB_SEGMENTS), transform(base, turn, [0.3, 1, 1])),
        color,
        bone: 'ear',
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
        bone: 'ear',
      },
      {
        corners: placeCorners(prism(outline(0.75), 0.03 * h, 0.045 * h), transform(center, turn)),
        color: inner,
        bone: 'ear',
      },
    ],
  };
}

/**
 * Makes the right antler of a deer: a beam of 0.45 H that rises from the top of the head and
 * leans out and back, with two tines that point up. The antler follows the head bone.
 *
 * @param h The head height `H`.
 * @param color The color of the antler.
 * @returns The parts of the antler.
 */
function antler(h: number, color: Rgb): EarPart[] {
  const base: Vec3 = [0.14 * h, 0.42 * h, 0.04 * h];
  const beam: Vec3 = normalize([0.55, 1, 0.35]);
  const parts: EarPart[] = [
    {
      corners: placeCorners(
        cylinder(0.04 * h, 0.025 * h, 0.45 * h, LIMB_SEGMENTS),
        transform(base, alongAxis(beam, [1, 0, 0])),
      ),
      color,
      bone: 'head',
    },
  ];
  for (const [at, length] of [
    [0.2, 0.2],
    [0.36, 0.15],
  ] as const) {
    parts.push({
      corners: placeCorners(
        cylinder(0.025 * h, 0.012 * h, length * h, LIMB_SEGMENTS),
        transform(add(base, scale(beam, at * h)), alongAxis([-0.1, 1, -0.35], [1, 0, 0])),
      ),
      color,
      bone: 'head',
    });
  }
  return parts;
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
      return flatEar(
        h,
        [0.2 * h, 0.42 * h, 0.04 * h],
        LONG_OUTLINE,
        LONG_MIDDLE,
        8 * DEG,
        outer,
        inner,
      );
    case 'pointed':
      return flatEar(
        h,
        [0.3 * h, 0.36 * h, 0.03 * h],
        POINTED_OUTLINE,
        POINTED_MIDDLE,
        22 * DEG,
        outer,
        inner,
      );
    case 'round':
      return discEar(h, [0.3 * h, 0.36 * h, 0.04 * h], 30 * DEG, 0.3, outer, inner);
    case 'large-round':
      // Large ears set high on the head and out to the sides, so that the mouse does not look
      // like the bear with its small round ears (review of step 4).
      return discEar(h, [0.24 * h, 0.4 * h, 0.05 * h], 38 * DEG, 0.7, outer, inner);
    case 'small':
      return discEar(h, [0.28 * h, 0.34 * h, 0.06 * h], 35 * DEG, 0.2, outer, inner);
    case 'floppy':
      return floppyEar(h, outer);
    case 'large-flap':
      return flapEar(h, outer, inner);
    case 'side-round':
      return discEar(h, [0.54 * h, 0.08 * h, 0.04 * h], 80 * DEG, 0.32, outer, inner);
    case 'antlered': {
      const ear = flatEar(
        h,
        [0.46 * h, 0.22 * h, 0.04 * h],
        POINTED_OUTLINE,
        POINTED_MIDDLE,
        65 * DEG,
        outer,
        inner,
      );
      return { base: ear.base, parts: [...ear.parts, ...antler(h, colors.belly)] };
    }
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
    const [right, left] =
      part.bone === 'ear'
        ? [boneIndex('earR'), boneIndex('earL')]
        : [boneIndex('head'), boneIndex('head')];
    builder.add(corners, { color: part.color, bone: right });
    builder.add(corners, { color: part.color, bone: left, at: MIRROR_X });
  }
  const base = add(headCenter, ear.base);
  return [[-base[0], base[1], base[2]], base];
}
