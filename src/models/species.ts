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
    | 'side-round'
    | 'antlered'
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
  readonly facePattern:
    | 'none'
    | 'mask'
    | 'eye-patches'
    | 'stripe'
    | 'forehead-stripes'
    | 'face-disc';
}

/**
 * The species that the generator builds (design 4.3). The fox has two color variants: `fox-red` for
 * the second violins and `fox-tan` for the flutes.
 */
export type SpeciesId =
  | 'rabbit'
  | 'fox-red'
  | 'fox-tan'
  | 'raccoon'
  | 'elephant'
  | 'bear'
  | 'cat'
  | 'hippo'
  | 'deer'
  | 'panda'
  | 'mouse'
  | 'beaver'
  | 'dog'
  | 'monkey'
  | 'pig'
  | 'rhino'
  | 'badger'
  | 'meerkat'
  | 'penguin';

/** The parameters of each species (design 4.3, 4.5). */
export const SPECIES = {
  /** Rabbit, the first violins (reference image). */
  rabbit: {
    ears: 'long',
    snout: 'short',
    tail: 'puff',
    size: 1,
    colors: { fur: '#a8a090', belly: '#c8c1b4', accent: '#c9a898' },
    accentParts: ['inner-ears'],
    facePattern: 'none',
  },
  /** Red-orange fox with a white face, the second violins (reference image). */
  'fox-red': {
    ears: 'pointed',
    snout: 'long',
    tail: 'bushy',
    size: 1,
    colors: { fur: '#c47a45', belly: '#ead8bb', accent: '#4a2c1c' },
    accentParts: ['feet'],
    facePattern: 'none',
  },
  /** Light tan fox, the flutes (reference image). */
  'fox-tan': {
    ears: 'pointed',
    snout: 'long',
    tail: 'bushy',
    size: 1,
    colors: { fur: '#c9a273', belly: '#e6d3b5', accent: '#9a7148' },
    accentParts: ['ears', 'feet'],
    facePattern: 'none',
  },
  /** Raccoon, the clarinets (reference image). */
  raccoon: {
    ears: 'round',
    snout: 'short',
    tail: 'ringed',
    size: 0.9,
    colors: { fur: '#7a7168', belly: '#d8d2c8', accent: '#2a2622' },
    accentParts: ['face-pattern', 'tail'],
    facePattern: 'mask',
  },
  /** Elephant, the cellos (reference image). */
  elephant: {
    ears: 'large-flap',
    snout: 'trunk',
    tail: 'thin',
    size: 1.35,
    colors: { fur: '#a8a198', belly: '#b9b2a8', accent: '#b9a39a' },
    accentParts: ['inner-ears'],
    facePattern: 'none',
  },
  /** Bear, the conductor (reference image). */
  bear: {
    ears: 'round',
    snout: 'short',
    tail: 'puff',
    size: 1.35,
    colors: { fur: '#6e4b33', belly: '#9a7656', accent: '#3a271b' },
    accentParts: ['nose', 'inner-ears'],
    facePattern: 'none',
  },
  /** Cat, the violas. */
  cat: {
    ears: 'pointed',
    snout: 'short',
    tail: 'thin',
    size: 0.95,
    colors: { fur: '#8d9298', belly: '#e2ddd4', accent: '#5f646a' },
    accentParts: ['face-pattern'],
    facePattern: 'forehead-stripes',
  },
  /** Hippo, the contrabasses. */
  hippo: {
    ears: 'small',
    snout: 'flat-nose',
    tail: 'thin',
    size: 1.35,
    colors: { fur: '#8f7d83', belly: '#b8a3a6', accent: '#6f5f66' },
    accentParts: ['nose', 'inner-ears'],
    facePattern: 'none',
  },
  /** Deer, the harp. */
  deer: {
    ears: 'antlered',
    snout: 'long',
    tail: 'puff',
    size: 1.1,
    colors: { fur: '#a8774c', belly: '#e5d3b8', accent: '#3a2a20' },
    accentParts: ['nose', 'feet'],
    facePattern: 'none',
  },
  /** Panda, the piano. */
  panda: {
    ears: 'round',
    snout: 'short',
    tail: 'puff',
    size: 1.2,
    colors: { fur: '#e9e5dc', belly: '#e9e5dc', accent: '#24211e' },
    accentParts: ['face-pattern', 'ears', 'hands', 'feet'],
    facePattern: 'eye-patches',
  },
  /** Mouse, the oboes. */
  mouse: {
    ears: 'large-round',
    snout: 'short',
    tail: 'thin',
    size: 0.75,
    colors: { fur: '#9a8b7e', belly: '#c9bcae', accent: '#d6a59a' },
    accentParts: ['inner-ears'],
    facePattern: 'none',
  },
  /** Beaver, the bassoons. */
  beaver: {
    ears: 'small',
    snout: 'short',
    tail: 'flat',
    size: 0.95,
    colors: { fur: '#6a4630', belly: '#8c6a52', accent: '#3e2e26' },
    accentParts: ['tail'],
    facePattern: 'none',
  },
  /** Dog, the horns. */
  dog: {
    ears: 'floppy',
    snout: 'long',
    tail: 'thin',
    size: 1.05,
    colors: { fur: '#c9b08a', belly: '#e6d8c0', accent: '#7a5638' },
    accentParts: ['ears'],
    facePattern: 'none',
  },
  /** Monkey, the trumpets. */
  monkey: {
    ears: 'side-round',
    snout: 'short',
    tail: 'thin',
    size: 0.95,
    colors: { fur: '#8a5a3a', belly: '#d9b892', accent: '#5a3a26' },
    accentParts: ['hands', 'feet'],
    facePattern: 'face-disc',
  },
  /** Pig, the trombones. */
  pig: {
    ears: 'pointed',
    snout: 'flat-nose',
    tail: 'thin',
    size: 1.05,
    colors: { fur: '#d99a8e', belly: '#e6b2a8', accent: '#c98276' },
    accentParts: ['snout'],
    facePattern: 'none',
  },
  /** Rhino, the tuba. */
  rhino: {
    ears: 'small',
    snout: 'horn',
    tail: 'thin',
    size: 1.35,
    colors: { fur: '#8e8a84', belly: '#a6a29b', accent: '#cfc6b5' },
    accentParts: ['horn'],
    facePattern: 'none',
  },
  /** Badger, the timpani. */
  badger: {
    ears: 'small',
    snout: 'long',
    tail: 'puff',
    size: 0.95,
    colors: { fur: '#7d7a76', belly: '#e6e1d8', accent: '#24211e' },
    accentParts: ['face-pattern'],
    facePattern: 'stripe',
  },
  /** Meerkat, the percussion. */
  meerkat: {
    ears: 'small',
    snout: 'long',
    tail: 'thin',
    size: 0.85,
    colors: { fur: '#b99a6e', belly: '#d8c3a0', accent: '#4a3828' },
    accentParts: ['face-pattern'],
    facePattern: 'eye-patches',
  },
  /** Penguin, the choir. The black and white body looks like a choir robe. */
  penguin: {
    ears: 'none',
    snout: 'beak',
    tail: 'none',
    size: 0.9,
    colors: { fur: '#1f1d1c', belly: '#ece8e0', accent: '#d98a3a' },
    accentParts: ['beak', 'feet'],
    facePattern: 'none',
  },
} as const satisfies Readonly<Record<SpeciesId, SpeciesParams>>;

/** The color of the eyes of all species (design 4.5). */
export const EYE_COLOR = '#15110e';

/** The color of the nose of a species with no accent nose (design 4.5). */
export const NOSE_COLOR = '#2a1d15';

/** The head height `H` of the rabbit, in meters. A species multiplies it by its size (4.5). */
export const RABBIT_HEAD_HEIGHT = 0.38;
