/** A part of an animal that gets the accent color (design 4.5). */
export type AccentPart =
  | 'inner-ears'
  | 'ears'
  | 'nose'
  | 'snout'
  | 'horn'
  | 'beak'
  | 'arms'
  | 'hands'
  | 'legs'
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
  readonly snout:
    | 'short'
    | 'long'
    | 'blunt'
    | 'broad'
    | 'pointed'
    | 'buck-teeth'
    | 'trunk'
    | 'flat-nose'
    | 'horn'
    | 'beak';
  readonly tail: 'none' | 'puff' | 'bushy' | 'thin' | 'flat';
  /** Height scale. 1.0 is the rabbit of the reference image. */
  readonly size: number;
  /**
   * The width of the torso and the thickness of the arms and the legs, as a factor. With no
   * value, it is 1.0, the body of design 4.5. The meerkat has 0.75.
   */
  readonly girth?: number;
  /** CSS hex colors in sRGB (design 4.5, species colors). */
  readonly colors: { readonly fur: string; readonly belly: string; readonly accent: string };
  /** The parts that get the accent color (design 4.5). */
  readonly accentParts: readonly AccentPart[];
  /** Face pattern, for example the eye patches of the panda. */
  readonly facePattern:
    | 'none'
    | 'eye-patches'
    | 'cap'
    | 'stripe'
    | 'forehead-stripes'
    | 'face-disc'
    | 'eye-rings';
}

/**
 * The species that the generator builds (design 4.3). The fox has two color variants: `fox-red` for
 * the second violins and `fox-tan` for the flutes.
 */
export type SpeciesId =
  | 'rabbit'
  | 'fox-red'
  | 'fox-tan'
  | 'wolf'
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
    colors: { fur: '#ece6dc', belly: '#f4f0ea', accent: '#e9a7a5' },
    accentParts: ['inner-ears', 'nose'],
    facePattern: 'none',
  },
  /** Red-orange fox with a white face, the second violins (reference image). */
  'fox-red': {
    ears: 'pointed',
    snout: 'long',
    tail: 'bushy',
    size: 1,
    colors: { fur: '#f0934c', belly: '#f6eee0', accent: '#4a3324' },
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
  /** Wolf, the clarinets (the gray animal with a clarinet of `animals.webp`). */
  wolf: {
    ears: 'pointed',
    snout: 'long',
    tail: 'bushy',
    size: 0.95,
    colors: { fur: '#bab2aa', belly: '#f0ece4', accent: '#8a807a' },
    accentParts: ['inner-ears'],
    facePattern: 'none',
  },
  /** Elephant, the timpani. The reference image shows it with a cello. */
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
    colors: { fur: '#93603a', belly: '#9c6a44', accent: '#c9a07a' },
    accentParts: ['snout'],
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
    snout: 'broad',
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
  /** Panda, the trombones. */
  panda: {
    ears: 'round',
    snout: 'short',
    tail: 'puff',
    size: 1.2,
    colors: { fur: '#e9e5dc', belly: '#e9e5dc', accent: '#24211e' },
    accentParts: ['face-pattern', 'ears', 'arms', 'hands', 'legs', 'feet'],
    facePattern: 'eye-patches',
  },
  /** Mouse, the oboes. */
  mouse: {
    ears: 'large-round',
    snout: 'pointed',
    tail: 'thin',
    size: 0.75,
    colors: { fur: '#9a8b7e', belly: '#c9bcae', accent: '#d6a59a' },
    accentParts: ['inner-ears'],
    facePattern: 'none',
  },
  /** Beaver, the bassoons. */
  beaver: {
    ears: 'small',
    snout: 'buck-teeth',
    tail: 'flat',
    size: 0.95,
    colors: { fur: '#6a4630', belly: '#8c6a52', accent: '#3e2e26' },
    accentParts: ['tail'],
    facePattern: 'none',
  },
  /** Dog, the cellos: a beagle with a brown cap and brown ears, as in `mockup.png`. */
  dog: {
    ears: 'floppy',
    snout: 'blunt',
    tail: 'thin',
    size: 1.05,
    colors: { fur: '#e6dfd1', belly: '#f3eee4', accent: '#a0643a' },
    accentParts: ['ears', 'face-pattern'],
    facePattern: 'cap',
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
  /** Pig, the horns. */
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
  /** Badger, the percussion. */
  badger: {
    ears: 'small',
    snout: 'long',
    tail: 'puff',
    size: 0.95,
    colors: { fur: '#7d7a76', belly: '#e6e1d8', accent: '#24211e' },
    accentParts: ['face-pattern'],
    facePattern: 'stripe',
  },
  /** Meerkat, the piano. */
  meerkat: {
    ears: 'small',
    snout: 'pointed',
    tail: 'thin',
    size: 0.85,
    girth: 0.75,
    colors: { fur: '#b99a6e', belly: '#d8c3a0', accent: '#2a1f17' },
    accentParts: ['face-pattern', 'ears'],
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
    facePattern: 'eye-rings',
  },
} as const satisfies Readonly<Record<SpeciesId, SpeciesParams>>;

/** The color of the eyes of all species (design 4.5). */
export const EYE_COLOR = '#15110e';

/** The color of the small light on each eye (design 4.5). */
export const EYE_LIGHT_COLOR = '#f6f2ea';

/** The color of the front teeth of the beaver (design 4.5). */
export const TEETH_COLOR = '#f1ead9';

/** The color of the nose of a species with no accent nose (design 4.5). */
export const NOSE_COLOR = '#2a1d15';

/** The head height `H` of the rabbit, in meters. A species multiplies it by its size (4.5). */
export const RABBIT_HEAD_HEIGHT = 0.38;
