import { bodyColors } from '../body-parts.ts';
import { srgb } from '../mesh.ts';
import type { Rgb } from '../mesh.ts';
import type { SpeciesParams } from '../species.ts';

/** The dark brown of the iris of the bear (`bear-views.png`). */
const IRIS_COLOR = '#3b2417';

/**
 * The part of the fur color that the hollow of an ear keeps: the hollow is in the shade, as in
 * `bear-views.png`.
 */
const EAR_SHADE = 0.82;

/** The colors of the bear body, in linear values (`bear-views.png`). */
export interface BearPalette {
  /** The one brown of the fur. */
  readonly fur: Rgb;
  /** The light tan of the muzzle: the accent color of the species. */
  readonly muzzle: Rgb;
  /** The darker brown of the hollow of each ear. */
  readonly innerEar: Rgb;
  /** The near black of the nose and the claws. */
  readonly dark: Rgb;
  /** The dark brown of the iris. */
  readonly iris: Rgb;
  /** The black of the pupil. */
  readonly pupil: Rgb;
  /** The white light on each eye. */
  readonly light: Rgb;
}

/**
 * Gives the colors of the bear body from the colors of the species.
 *
 * @param species The species parameters of the bear.
 * @returns The colors.
 */
export function bearPalette(species: SpeciesParams): BearPalette {
  const colors = bodyColors(species);
  const [r, g, b] = colors.fur;
  return {
    fur: colors.fur,
    muzzle: colors.accent,
    innerEar: [r * EAR_SHADE, g * EAR_SHADE, b * EAR_SHADE],
    dark: colors.nose,
    iris: srgb(IRIS_COLOR),
    pupil: colors.eye,
    light: colors.eyeLight,
  };
}
