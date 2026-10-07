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

/**
 * The form of the eyes of a species (design 4.5): an almond that is wider than high, with its
 * outer end up, an upright oval, or a small round bead.
 */
export type EyeForm = 'almond' | 'oval' | 'bead';

/** The eyes of a species (design 4.3, 4.5). */
export interface EyeLook {
  /** The form of the eyes. */
  readonly form: EyeForm;
  /**
   * The color of the iris as a CSS hex color in sRGB. An eye with an iris has a black pupil in
   * front of it. With no value, the eye is black.
   */
  readonly iris?: string;
}

/** The forms of the body of a species (design 4.3, 4.5). All values are in H. */
export interface BodyForm {
  /**
   * The extra half width of the cheeks of the head. Default 0.03 (`DEFAULT_CHEEKS` of
   * `head.ts`): the head is then 1.32 H wide.
   */
  readonly cheeks?: number;
  /**
   * The width of the head at the cheeks, in H. All rings of the head scale to it, so that the
   * cheeks keep their form. Default: the width that the cheeks give (1.32 H for 0.03).
   */
  readonly headWidth?: number;
  /** The forward move of the rings above the eyes, in H. Default 0, at most 0.08. */
  readonly brow?: number;
  /**
   * The forward bulge of the belly, as a factor of the half width of the torso. Default 1.16
   * (spec 2.4).
   */
  readonly belly?: number;
  /**
   * The half width of the neck ring between the torso and the jaw, in H. Default 0.36, at least
   * 0.3 (spec 2.5).
   */
  readonly neck?: number;
  /**
   * The factor of the width of the torso. It acts on the depth by half. Default: {@link plumpOf},
   * 1.25 for the large species, 1.1 for the medium species, and 1 for the small species.
   */
  readonly plump?: number;
}

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
  /**
   * The width of the torso and the thickness of the arms and the legs, as a factor. With no
   * value, it is 1.0, the body of design 4.5. The meerkat has 0.75.
   */
  readonly girth?: number;
  /** The colors of the species (design 4.5, species colors). */
  readonly colors: SpeciesColors;
  /** The parts that get the accent color (design 4.5). */
  readonly accentParts: readonly AccentPart[];
  /** The eyes of the species. */
  readonly eyes: EyeLook;
  /** Face pattern, for example the eye patches of the panda. */
  readonly facePattern:
    | 'none'
    | 'eye-patches'
    | 'cap'
    | 'stripe'
    | 'forehead-stripes'
    | 'face-disc'
    | 'eye-rings';
  /** The forms of the body. With no value, each form has its default. */
  readonly form?: BodyForm;
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
  | 'penguin'
  | 'polar-bear';

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
    eyes: { form: 'oval' },
    facePattern: 'none',
    form: { brow: 0.02, belly: 1.14 },
  },
  /** Red-orange fox with a white face, the second violins (reference image). */
  'fox-red': {
    ears: 'pointed',
    snout: 'long',
    tail: 'bushy',
    size: 1,
    colors: SPECIES_COLORS['fox-red'],
    accentParts: ['feet'],
    eyes: { form: 'almond', iris: '#c98a2e' },
    facePattern: 'none',
    form: { cheeks: 0.05, headWidth: 1.2, brow: 0.04, belly: 1.08 },
  },
  /** Light tan fox, the flutes (reference image). */
  'fox-tan': {
    ears: 'pointed',
    snout: 'long',
    tail: 'bushy',
    size: 1,
    colors: SPECIES_COLORS['fox-tan'],
    accentParts: ['ears', 'feet'],
    eyes: { form: 'almond', iris: '#c98a2e' },
    facePattern: 'none',
    form: { cheeks: 0.05, headWidth: 1.2, brow: 0.04, belly: 1.08 },
  },
  /** Wolf, the clarinets (the gray animal with a clarinet of `animals.webp`). */
  wolf: {
    ears: 'pointed',
    snout: 'long',
    tail: 'bushy',
    size: 0.95,
    colors: SPECIES_COLORS.wolf,
    accentParts: ['inner-ears'],
    eyes: { form: 'almond', iris: '#d2a443' },
    facePattern: 'none',
    form: { cheeks: 0.05, headWidth: 1.12, brow: 0.04, belly: 1.08 },
  },
  /** Elephant, the timpani. The reference image shows it with a cello. */
  elephant: {
    ears: 'large-flap',
    snout: 'trunk',
    tail: 'thin',
    size: 1.35,
    colors: SPECIES_COLORS.elephant,
    accentParts: ['inner-ears'],
    eyes: { form: 'bead' },
    facePattern: 'none',
    form: { cheeks: 0.04, brow: 0.03, belly: 1.2 },
  },
  /** Bear, the conductor (reference image). */
  bear: {
    ears: 'round',
    snout: 'short',
    tail: 'puff',
    size: 1.35,
    colors: SPECIES_COLORS.bear,
    accentParts: ['snout'],
    eyes: { form: 'bead' },
    facePattern: 'none',
    form: { cheeks: 0.01, brow: 0.05, belly: 1.22 },
  },
  /** Cat, the violas. */
  cat: {
    ears: 'pointed',
    snout: 'short',
    tail: 'thin',
    size: 0.95,
    colors: SPECIES_COLORS.cat,
    accentParts: ['face-pattern'],
    eyes: { form: 'almond', iris: '#c9b03c' },
    facePattern: 'forehead-stripes',
    form: { cheeks: 0.04, headWidth: 1.08, brow: 0.03, belly: 1.12 },
  },
  /** Hippo, the contrabasses. */
  hippo: {
    ears: 'small',
    snout: 'broad',
    tail: 'thin',
    size: 1.35,
    colors: SPECIES_COLORS.hippo,
    accentParts: ['nose', 'inner-ears'],
    eyes: { form: 'bead' },
    facePattern: 'none',
    form: { cheeks: 0.01, brow: 0.03, belly: 1.2 },
  },
  /** Deer, the harp. */
  deer: {
    ears: 'antlered',
    snout: 'long',
    tail: 'puff',
    size: 1.1,
    colors: SPECIES_COLORS.deer,
    accentParts: ['nose', 'feet'],
    eyes: { form: 'oval' },
    facePattern: 'none',
    form: { cheeks: -0.03, brow: 0.02, belly: 1.08, neck: 0.3 },
  },
  /** Panda, the trombones. */
  panda: {
    ears: 'round',
    snout: 'short',
    tail: 'puff',
    size: 1.2,
    colors: SPECIES_COLORS.panda,
    accentParts: ['face-pattern', 'ears', 'arms', 'hands', 'legs', 'feet'],
    eyes: { form: 'bead' },
    facePattern: 'eye-patches',
    form: { cheeks: 0.02, brow: 0.05, belly: 1.22 },
  },
  /** Mouse, the oboes. */
  mouse: {
    ears: 'large-round',
    snout: 'pointed',
    tail: 'thin',
    size: 0.75,
    colors: SPECIES_COLORS.mouse,
    accentParts: ['inner-ears'],
    eyes: { form: 'oval' },
    facePattern: 'none',
    form: { cheeks: 0.04, belly: 1.14 },
  },
  /** Beaver, the bassoons. */
  beaver: {
    ears: 'small',
    snout: 'buck-teeth',
    tail: 'flat',
    size: 0.95,
    colors: SPECIES_COLORS.beaver,
    accentParts: ['tail'],
    eyes: { form: 'bead' },
    facePattern: 'none',
    form: { cheeks: 0.04, brow: 0.03, belly: 1.2 },
  },
  /** Dog, the cellos: a beagle with a brown cap and brown ears, as in `mockup.png`. */
  dog: {
    ears: 'floppy',
    snout: 'blunt',
    tail: 'thin',
    size: 1.05,
    colors: SPECIES_COLORS.dog,
    accentParts: ['ears', 'face-pattern'],
    eyes: { form: 'oval' },
    facePattern: 'cap',
    form: { cheeks: 0.02, headWidth: 1.22, brow: 0.04, belly: 1.14 },
  },
  /** Monkey, the trumpets. */
  monkey: {
    ears: 'side-round',
    snout: 'short',
    tail: 'thin',
    size: 0.95,
    colors: SPECIES_COLORS.monkey,
    accentParts: ['hands', 'feet'],
    eyes: { form: 'oval' },
    facePattern: 'face-disc',
    form: { cheeks: 0.02, brow: 0.06, belly: 1.14 },
  },
  /** Pig, the horns. */
  pig: {
    ears: 'pointed',
    snout: 'flat-nose',
    tail: 'thin',
    size: 1.05,
    colors: SPECIES_COLORS.pig,
    accentParts: ['snout'],
    eyes: { form: 'bead' },
    facePattern: 'none',
    form: { cheeks: 0.04, brow: 0.03, belly: 1.2 },
  },
  /** Rhino, the tuba. */
  rhino: {
    ears: 'small',
    snout: 'horn',
    tail: 'thin',
    size: 1.35,
    colors: SPECIES_COLORS.rhino,
    accentParts: ['horn'],
    eyes: { form: 'bead' },
    facePattern: 'none',
    form: { cheeks: 0.04, brow: 0.03, belly: 1.2 },
  },
  /** Badger, the percussion. */
  badger: {
    ears: 'small',
    snout: 'long',
    tail: 'puff',
    size: 0.95,
    colors: SPECIES_COLORS.badger,
    accentParts: ['face-pattern'],
    eyes: { form: 'bead' },
    facePattern: 'stripe',
    form: { cheeks: 0.04, brow: 0.03, belly: 1.2 },
  },
  /**
   * Meerkat. It has no seat since 2026-10-06, when the polar bear became the pianist (design
   * 4.3). The tests of a thin body (girth 0.75) still build it.
   */
  meerkat: {
    ears: 'small',
    snout: 'pointed',
    tail: 'thin',
    size: 0.85,
    girth: 0.75,
    colors: SPECIES_COLORS.meerkat,
    accentParts: ['face-pattern', 'ears'],
    eyes: { form: 'oval' },
    facePattern: 'eye-patches',
    form: { brow: 0.02, belly: 1.08, neck: 0.3 },
  },
  /** Penguin, the choir. The black and white body looks like a choir robe. */
  penguin: {
    ears: 'none',
    snout: 'beak',
    tail: 'none',
    size: 0.9,
    colors: SPECIES_COLORS.penguin,
    accentParts: ['beak', 'feet'],
    eyes: { form: 'oval' },
    facePattern: 'eye-rings',
    form: { cheeks: 0, belly: 1.2, neck: 0.4 },
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
    eyes: { form: 'bead' },
    facePattern: 'none',
    form: { cheeks: 0.02, brow: 0.05, belly: 1.22 },
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

/**
 * Gives the factor of the width of the torso of a species (design 4.5): the value of its form, or
 * 1.25 for a large species (size 1.2 or more), 1.1 for a medium species (1.05 to 1.15), and 1 for
 * a small species. The plump bears and pandas of `mockup.png` and `scene.png` are about two head
 * widths wide at the belly. The user chose these factors on 2026-10-07.
 *
 * @param species The species parameters.
 * @returns The factor.
 */
export function plumpOf(species: SpeciesParams): number {
  if (species.form?.plump !== undefined) {
    return species.form.plump;
  }

  if (species.size >= 1.2) {
    return 1.25;
  }
  return species.size >= 1.05 ? 1.1 : 1;
}
