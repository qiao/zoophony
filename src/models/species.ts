import type { BodyProportions } from './proportions.ts';
import { SPECIES_COLORS } from './colors.ts';
import type { SpeciesColors } from './colors.ts';
import type { RiggedBody } from './rigged-format.ts';
import { BEAR_RIGGED } from './rigged/bear.ts';
import { RABBIT_RIGGED } from './rigged/rabbit.ts';

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
    | 'low-round'
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
    | 'beak'
    | 'roman';
  readonly tail: 'none' | 'puff' | 'bushy' | 'thin' | 'flat';
  /** Height scale. 1.0 is the rabbit of the reference image. */
  readonly size: number;
  /** The colors of the species (design 4.5, species colors). */
  readonly colors: SpeciesColors;
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
  /**
   * The skeleton of the species (design 4.3): the head height and the places and the lengths of
   * the bones. Each value that it does not give has its default (`proportionsOf()` of
   * `proportions.ts`).
   */
  readonly proportions?: Partial<BodyProportions>;
  /**
   * The body of its own that the species has in place of the parametric biped (design 4.4):
   * `fox` for the body of `fox-views.png` (`models/fox/`). Default: the parametric biped.
   */
  readonly body?: 'fox';
  /**
   * The rigged body from a GLB file that the species has in place of the parametric biped (design
   * 4.4, `models/rigged-body.ts`). It wins over {@link SpeciesParams.body}. Default: none.
   */
  readonly rigged?: RiggedBody;
}

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
 * The skeleton of the fox of `fox-views.png` (design 4.3), from the measures of the sheet at
 * 737 px for each meter: the head is 0.3 m tall and its center is 0.72 m above the seat, the
 * shoulder joints are 0.43 m above the seat and 0.14 m from the middle, and the seated knee is
 * 0.3 m in front of the hip joint.
 */
const FOX_PROPORTIONS = {
  headHeight: 0.3,
  headCenter: 2.33,
  shoulderHeight: 1.43,
  shoulderSpread: 0.47,
  upperArm: 0.8,
  forearm: 0.75,
  hipSpread: 0.4,
  seatedKnee: { forward: 0.9, height: 0.3 },
  standingBase: 1.05,
} as const satisfies Partial<BodyProportions>;

/**
 * The skeleton of the bear conductor of `bear-views.png` (design 4.3). The sheet has no scale in
 * meters, so the head height gives the bear the height of the conductor of 2026-10-06 (1.6 m).
 * The head is then 0.32 m high, and the bear is 5 head heights high to the tops of the ears. The
 * base of the torso is at the crotch, 0.8 H above the floor, and the shoulder joints are 3.35 H
 * above the floor, under the jowls.
 */
const BEAR_PROPORTIONS = {
  headHeight: 0.32,
  headCenter: 3.63,
  shoulderHeight: 2.55,
  shoulderSpread: 0.88,
  upperArm: 1.15,
  forearm: 0.95,
  hipSpread: 0.58,
  standingBase: 0.8,
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
    rigged: RABBIT_RIGGED,
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
    body: 'fox',
    proportions: FOX_PROPORTIONS,
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
    body: 'fox',
    proportions: FOX_PROPORTIONS,
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
  },
  /** Bear, the conductor (`bear-views.png`). */
  bear: {
    ears: 'round',
    snout: 'short',
    tail: 'puff',
    size: 1.35,
    colors: SPECIES_COLORS.bear,
    accentParts: ['snout'],
    facePattern: 'none',
    proportions: BEAR_PROPORTIONS,
    rigged: BEAR_RIGGED,
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
  },
  /** Penguin, the choir. The black and white body looks like a choir robe. */
  penguin: {
    ears: 'none',
    snout: 'beak',
    tail: 'none',
    size: 0.9,
    colors: SPECIES_COLORS.penguin,
    accentParts: ['beak', 'feet'],
    facePattern: 'eye-rings',
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

/**
 * Gives the parameters of a species with no rigged body, so that `buildBiped()` builds its body in
 * code: the parametric biped, or the fox body. Tests use it for a sample of the parametric parts,
 * and `pnpm glb-init` for the head of the body before a rigged one.
 *
 * @param species The parameters of the species.
 * @returns The parameters with no `rigged`.
 */
export function withoutRigged(species: SpeciesParams): SpeciesParams {
  const { rigged, ...rest } = species;
  return rigged ? rest : species;
}
