import type { BodyProportions } from './proportions.ts';
import { SPECIES_COLORS } from './colors.ts';
import type { SpeciesColors } from './colors.ts';

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

/** The parameters that each species has (design 4.3, 4.5). */
interface CommonParams {
  /** Height scale. 1.0 is the rabbit of the reference image. */
  readonly size: number;
  /** The colors of the species (design 4.5, species colors). */
  readonly colors: SpeciesColors;
  /** The parts that get the accent color (design 4.5). */
  readonly accentParts: readonly AccentPart[];
  /**
   * The skeleton of the species (design 4.3): the head height and the places and the lengths of
   * the bones. Each value that it does not give has its default (`proportionsOf()` of
   * `proportions.ts`).
   */
  readonly proportions?: Partial<BodyProportions>;
}

/** The parameters of a species with the parametric biped (design 4.3): the shape of its parts. */
export interface BipedParams extends CommonParams {
  /** The ear type (design 4.3). */
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
    | 'low-round'
    | 'none';
  /** The snout type (design 4.3). */
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
    | 'roman';
  /** The tail type (design 4.3). */
  readonly tail: 'none' | 'puff' | 'bushy' | 'thin' | 'flat';
  /** Face pattern, for example the eye patches of the panda. */
  readonly facePattern:
    | 'none'
    | 'eye-patches'
    | 'cap'
    | 'stripe'
    | 'forehead-stripes'
    | 'face-disc';
  /** No body of its own: the species has the parametric biped. */
  readonly body?: undefined;
}

/**
 * The parameters of a species with a body of its own in place of the parametric biped (design
 * 4.4). The body reads the size, the colors, and the head height of the species, and it has no
 * shape parameters.
 */
export interface OwnBodyParams extends CommonParams {
  /** The body of its own: `penguin` for the egg body of the choir (`models/penguin/`). */
  readonly body: 'penguin';
}

/** The parameters of one species (design 4.3): the parametric biped, or a body of its own. */
export type SpeciesParams = BipedParams | OwnBodyParams;

/**
 * The ids of the species that the generator builds (design 4.3), in the order of {@link SPECIES}.
 * The fox has two color variants: `fox-red` for the second violins and `fox-tan` for the flutes.
 */
export const SPECIES_IDS = [
  'rabbit',
  'fox-red',
  'fox-tan',
  'wolf',
  'elephant',
  'bear',
  'cat',
  'hippo',
  'deer',
  'panda',
  'mouse',
  'beaver',
  'dog',
  'monkey',
  'pig',
  'rhino',
  'badger',
  'penguin',
  'polar-bear',
] as const;

/** A species that the generator builds: one of {@link SPECIES_IDS}. */
export type SpeciesId = (typeof SPECIES_IDS)[number];

/**
 * Finds if a text is the id of a species.
 *
 * @param value The text.
 * @returns True for one of {@link SPECIES_IDS}.
 */
export function isSpeciesId(value: string): value is SpeciesId {
  return SPECIES_IDS.some((id) => id === value);
}

/**
 * The standing legs of the reference images (design 4.3): the base of the torso 0.55 H above the
 * floor, as the bear of `animals.webp` and of `bear-views.png`, and a thigh of 0.33 H, so that the
 * thigh keeps its part of the leg. The legs of 2026-10-06 (the defaults, 0.77 H and 0.45 H) were
 * 1.4 times as long. Each species except the penguin gives these values. The penguin keeps the
 * defaults: its own body comes from another branch, and with the short legs, its torso went into
 * the next level of the choir risers.
 */
export const SHORT_STANDING_LEGS = {
  standingBase: 0.55,
  standingThigh: 0.33,
} as const satisfies Partial<BodyProportions>;

/**
 * The skeleton of the bear conductor (design 4.3): the short standing legs, and the long trunk of
 * `bear-views.png`. On the page of the sheet, the crown of the sheet bear is 3.05 H above the floor,
 * and its shoulder joints are 2.21 H above it. The head keeps its size, so the shoulder joints stay
 * 0.1 H below the `head` bone: 1.95 H above the floor. With the default trunk, the shorter bear
 * moved 41 px down from the bear of the sheet (`docs/research/2026-10-11-short-legs.md`).
 */
export const BEAR_PROPORTIONS = {
  ...SHORT_STANDING_LEGS,
  shoulderHeight: 1.4,
  headCenter: 2.0,
} as const satisfies Partial<BodyProportions>;

/** The parameters of each species (design 4.3, 4.5). */
export const SPECIES = {
  /** Rabbit, the first violins (reference image). */
  rabbit: {
    ears: 'long',
    snout: 'short',
    tail: 'puff',
    size: 1,
    colors: SPECIES_COLORS.rabbit,
    accentParts: ['inner-ears', 'nose'],
    facePattern: 'none',
    proportions: SHORT_STANDING_LEGS,
  },
  /** Red-orange fox with a white face, the second violins (reference image). */
  'fox-red': {
    ears: 'pointed',
    snout: 'long',
    tail: 'bushy',
    size: 1,
    colors: SPECIES_COLORS['fox-red'],
    accentParts: ['feet'],
    facePattern: 'none',
    proportions: SHORT_STANDING_LEGS,
  },
  /** Light tan fox, the flutes (reference image). */
  'fox-tan': {
    ears: 'pointed',
    snout: 'long',
    tail: 'bushy',
    size: 1,
    colors: SPECIES_COLORS['fox-tan'],
    accentParts: ['ears', 'feet'],
    facePattern: 'none',
    proportions: SHORT_STANDING_LEGS,
  },
  /** Wolf, the clarinets (the gray animal with a clarinet of `animals.webp`). */
  wolf: {
    ears: 'pointed',
    snout: 'long',
    tail: 'bushy',
    size: 0.95,
    colors: SPECIES_COLORS.wolf,
    accentParts: ['inner-ears'],
    facePattern: 'none',
    proportions: SHORT_STANDING_LEGS,
  },
  /** Elephant, the timpani. The reference image shows it with a cello. */
  elephant: {
    ears: 'large-flap',
    snout: 'trunk',
    tail: 'thin',
    size: 1.35,
    colors: SPECIES_COLORS.elephant,
    accentParts: ['inner-ears'],
    facePattern: 'none',
    proportions: SHORT_STANDING_LEGS,
  },
  /** Bear, the conductor (reference image). */
  bear: {
    ears: 'round',
    snout: 'short',
    tail: 'puff',
    size: 1.35,
    colors: SPECIES_COLORS.bear,
    accentParts: ['snout'],
    facePattern: 'none',
    proportions: BEAR_PROPORTIONS,
  },
  /** Cat, the violas. */
  cat: {
    ears: 'pointed',
    snout: 'short',
    tail: 'thin',
    size: 0.95,
    colors: SPECIES_COLORS.cat,
    accentParts: ['face-pattern'],
    facePattern: 'forehead-stripes',
    proportions: SHORT_STANDING_LEGS,
  },
  /** Hippo, the contrabasses. */
  hippo: {
    ears: 'small',
    snout: 'broad',
    tail: 'thin',
    size: 1.35,
    colors: SPECIES_COLORS.hippo,
    accentParts: ['nose', 'inner-ears'],
    facePattern: 'none',
    proportions: SHORT_STANDING_LEGS,
  },
  /** Deer, the harp. */
  deer: {
    ears: 'antlered',
    snout: 'long',
    tail: 'puff',
    size: 1.1,
    colors: SPECIES_COLORS.deer,
    accentParts: ['nose', 'feet'],
    facePattern: 'none',
    proportions: SHORT_STANDING_LEGS,
  },
  /** Panda, the trombones. */
  panda: {
    ears: 'round',
    snout: 'short',
    tail: 'puff',
    size: 1.2,
    colors: SPECIES_COLORS.panda,
    accentParts: ['face-pattern', 'ears', 'arms', 'hands', 'legs', 'feet'],
    facePattern: 'eye-patches',
    proportions: SHORT_STANDING_LEGS,
  },
  /** Mouse, the oboes. */
  mouse: {
    ears: 'large-round',
    snout: 'pointed',
    tail: 'thin',
    size: 0.75,
    colors: SPECIES_COLORS.mouse,
    accentParts: ['inner-ears'],
    facePattern: 'none',
    proportions: SHORT_STANDING_LEGS,
  },
  /** Beaver, the bassoons. */
  beaver: {
    ears: 'small',
    snout: 'buck-teeth',
    tail: 'flat',
    size: 0.95,
    colors: SPECIES_COLORS.beaver,
    accentParts: ['tail'],
    facePattern: 'none',
    proportions: SHORT_STANDING_LEGS,
  },
  /** Dog, the cellos: a beagle with a brown cap and brown ears, as in `mockup.png`. */
  dog: {
    ears: 'floppy',
    snout: 'blunt',
    tail: 'thin',
    size: 1.05,
    colors: SPECIES_COLORS.dog,
    accentParts: ['ears', 'face-pattern'],
    facePattern: 'cap',
    proportions: SHORT_STANDING_LEGS,
  },
  /** Monkey, the trumpets. */
  monkey: {
    ears: 'side-round',
    snout: 'short',
    tail: 'thin',
    size: 0.95,
    colors: SPECIES_COLORS.monkey,
    accentParts: ['hands', 'feet'],
    facePattern: 'face-disc',
    proportions: SHORT_STANDING_LEGS,
  },
  /** Pig, the horns. */
  pig: {
    ears: 'pointed',
    snout: 'flat-nose',
    tail: 'thin',
    size: 1.05,
    colors: SPECIES_COLORS.pig,
    accentParts: ['snout'],
    facePattern: 'none',
    proportions: SHORT_STANDING_LEGS,
  },
  /** Rhino, the tuba. */
  rhino: {
    ears: 'small',
    snout: 'horn',
    tail: 'thin',
    size: 1.35,
    colors: SPECIES_COLORS.rhino,
    accentParts: ['horn'],
    facePattern: 'none',
    proportions: SHORT_STANDING_LEGS,
  },
  /** Badger, the percussion. */
  badger: {
    ears: 'small',
    snout: 'long',
    tail: 'puff',
    size: 0.95,
    colors: SPECIES_COLORS.badger,
    accentParts: ['face-pattern'],
    facePattern: 'stripe',
    proportions: SHORT_STANDING_LEGS,
  },
  /** Penguin, the choir. The black and white egg body looks like a choir robe (design 4.4). */
  penguin: {
    size: 0.9,
    colors: SPECIES_COLORS.penguin,
    accentParts: ['beak', 'feet'],
    body: 'penguin',
  },
  /**
   * Polar bear, the piano and the other keyboards. It has the round body of the bear, with white fur, small round ears
   * low on the head, a long straight muzzle, and a black nose.
   */
  'polar-bear': {
    ears: 'low-round',
    snout: 'roman',
    tail: 'puff',
    size: 1.1,
    colors: SPECIES_COLORS['polar-bear'],
    accentParts: ['nose'],
    facePattern: 'none',
    proportions: SHORT_STANDING_LEGS,
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

/**
 * The default head height `H` for the size 1, in meters. A species with no head height of its own
 * multiplies it by its size (design 4.5).
 */
export const DEFAULT_HEAD_HEIGHT = 0.38;
