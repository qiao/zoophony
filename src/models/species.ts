/** A part of an animal that gets the accent color (design 4.5). */
export type AccentPart =
  | 'inner-ears'
  | 'ears'
  | 'nose'
  | 'snout'
  | 'horn'
  | 'beak'
  | 'hands'
  | 'feet'
  | 'tail'
  | 'face-pattern';

/** The parameters of one species of the parametric biped (design 4.3). */
export interface SpeciesParams {
  readonly ears:
    | 'long'
    | 'pointed'
    | 'round'
    | 'large-round'
    | 'floppy'
    | 'large-flap'
    | 'small'
    | 'none';
  readonly snout: 'short' | 'long' | 'trunk' | 'flat-nose' | 'horn' | 'beak';
  readonly tail: 'none' | 'puff' | 'bushy' | 'ringed' | 'thin' | 'flat';
  /** Height scale. 1.0 is the rabbit of the reference image. */
  readonly size: number;
  /** CSS hex colors in sRGB (design 4.5, species colors). */
  readonly colors: { readonly fur: string; readonly belly: string; readonly accent: string };
  /** The parts that get the accent color (design 4.5). */
  readonly accentParts: readonly AccentPart[];
  /** Face pattern, for example the raccoon mask. */
  readonly facePattern: 'none' | 'mask' | 'eye-patches' | 'stripe';
}

/** The species that the generator builds. Step 4 adds the other species of design 4.3. */
export type SpeciesId = 'rabbit';

/** The parameters of each species (design 4.3, 4.5). */
export const SPECIES = {
  rabbit: {
    ears: 'long',
    snout: 'short',
    tail: 'puff',
    size: 1,
    colors: { fur: '#a8a090', belly: '#c8c1b4', accent: '#c9a898' },
    accentParts: ['inner-ears'],
    facePattern: 'none',
  },
} as const satisfies Readonly<Record<SpeciesId, SpeciesParams>>;

/** The color of the eyes of all species (design 4.5). */
export const EYE_COLOR = '#15110e';

/** The color of the nose of a species with no accent nose (design 4.5). */
export const NOSE_COLOR = '#2a1d15';

/** The head height `H` of the rabbit, in meters. A species multiplies it by its size (4.5). */
export const RABBIT_HEAD_HEIGHT = 0.3;
