import type { BowGrip } from './instruments/strings.ts';
import type { BodyProportions } from './proportions.ts';
import type { StudioBodyName } from './studio-body.ts';
import type { StudioPalette } from './studio-format.ts';
import { STUDIO_BEAR } from './studio/bear.ts';
import { STUDIO_CAT } from './studio/cat.ts';
import { STUDIO_FOX } from './studio/fox.ts';
import { STUDIO_POLAR_BEAR } from './studio/polar-bear.ts';
import { STUDIO_RABBIT } from './studio/rabbit.ts';
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
  /**
   * The scale of the violin and its bow for the species, as a factor of the violin of the app
   * (design 4.6). It is 1 when it is not given. A species can play a smaller violin, as a child
   * plays a fractional size. The rule of a violin shop sizes a violin for the arms: with the
   * violin under the chin and the left arm extended, the scroll lies in the middle of the palm.
   * The rabbit and the red fox keep the size that the user chose, which is larger than the rule
   * gives for their arms (2026-10-14-arms-rest decisions).
   */
  readonly violinScale?: number;
  /**
   * The grip of the bow in the right paw of the species (design 4.6): the place of the stick and
   * its turn in the palm. The grip of the bind pose of the bow (`BOW_GRIP`) when it is not given.
   */
  readonly bowGrip?: BowGrip;
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
    | 'horn';
  /** The tail type (design 4.3). */
  readonly tail: 'none' | 'puff' | 'bushy' | 'thin' | 'flat';
  /** Face pattern, for example the eye patches of the panda. */
  readonly facePattern: 'none' | 'eye-patches' | 'cap' | 'stripe' | 'face-disc';
  /** No body of its own: the species has the parametric biped. */
  readonly body?: undefined;
}

/**
 * The parameters of a species with a body of its own in place of the parametric biped (design
 * 4.4). The egg body of the penguin reads the size, the colors, and the head height of the
 * species. A studio body keeps the mesh, the colors, and the size of its GLB file. A body of its
 * own has no shape parameters.
 */
export interface OwnBodyParams extends CommonParams {
  /**
   * The body of its own: `penguin` for the egg body of the choir (`models/penguin/`), or a studio
   * body of `lowpoly-studio/` (`models/studio-body.ts`).
   */
  readonly body: 'penguin' | StudioBodyName;
  /**
   * Another palette of the faces of a studio body (`StudioBody.palettes`), such as the tan palette
   * of the fox mesh. The colors of the mesh when it is not given.
   */
  readonly palette?: StudioPalette;
  /**
   * The seated tail of a studio body: `curl` when it lies curled on the seat
   * (`studio.tailCurl` of the rig config), so that it does not sway in the idle motion on a seat
   * (design 5.1). A tail that hangs behind the chair sways when it is not given.
   */
  readonly seatedTail?: 'curl';
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

/** The parameters of each species (design 4.3, 4.5). */
export const SPECIES = {
  /**
   * Rabbit, the first violins (reference image). It has the studio body of the mesh of the user,
   * `assets/models/rabbit/rabbit-4.glb`, which `pnpm rig-mesh rabbit` rigs (design 4.4), seated
   * with the bind pose of the studio rabbit, and standing as a soloist. Its head height is the
   * head of the studio body, and its chair fits its legs: the seat height is the seat of the
   * studio body, in H. Its violin is almost the violin of the app, the size that the user chose:
   * the user made its arms longer for a full violin, and then shorter with the same violin
   * (2026-10-14-arms-rest decisions).
   */
  rabbit: {
    body: 'studio-rabbit',
    size: 1,
    colors: SPECIES_COLORS.rabbit,
    accentParts: ['inner-ears', 'nose'],
    violinScale: 0.958,
    proportions: {
      headHeight: STUDIO_RABBIT.headHeight,
      seatHeight: STUDIO_RABBIT.seatHeight / STUDIO_RABBIT.headHeight,
    },
  },
  /**
   * Red-orange fox with a white face, the second violins (reference image). It has the studio body
   * of the mesh of the user, `assets/models/fox/fox.glb`, which `pnpm rig-mesh fox` rigs (design
   * 4.4), seated with its long thighs on the seat and its tail back through the chair, and
   * standing as a soloist. Its head height is the head of the studio body, and its chair fits its
   * legs: the seat height is the seat of the studio body, in H. Its violin is almost the violin of
   * the app, the size that the user chose: the user made its arms longer for a full violin, and
   * then shorter with the same violin (2026-10-14-arms-rest decisions).
   */
  'fox-red': {
    body: 'studio-fox',
    size: 1,
    colors: SPECIES_COLORS['fox-red'],
    accentParts: ['feet'],
    violinScale: 0.998,
    proportions: {
      headHeight: STUDIO_FOX.headHeight,
      seatHeight: STUDIO_FOX.seatHeight / STUDIO_FOX.headHeight,
    },
  },
  /**
   * Light tan fox, the flutes (reference image). It has the studio body of the red fox with the tan
   * palette of the faces (design 4.4, 4.5): the colors of the mesh of the user moved from the
   * colors of the red fox to the colors of the tan fox. It sits with its tail back through the
   * chair, and stands as a soloist. Its head height is the head of the studio body, and its chair
   * fits its legs.
   */
  'fox-tan': {
    body: 'studio-fox',
    palette: 'tan',
    size: 1,
    colors: SPECIES_COLORS['fox-tan'],
    accentParts: ['ears', 'feet'],
    proportions: {
      headHeight: STUDIO_FOX.headHeight,
      seatHeight: STUDIO_FOX.seatHeight / STUDIO_FOX.headHeight,
    },
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
  /**
   * Bear, the conductor (reference image). It has the studio body of `lowpoly-studio/` (design
   * 4.4), with the mesh and the colors of the studio. Its head height is the head of the studio.
   */
  bear: {
    body: 'studio-bear',
    size: 1.35,
    colors: SPECIES_COLORS.bear,
    accentParts: ['snout'],
    proportions: { headHeight: STUDIO_BEAR.headHeight },
  },
  /**
   * Gray cat with a cream belly, the violas (`cat-views.png`). It has the studio body of the mesh
   * of the user, `assets/models/cat/cat.glb`, which `pnpm rig-mesh cat` rigs (design 4.4), with the
   * size, the reach, and the leg factor of the red fox that the user chose (2026-10-16-mesh-cat
   * decisions). It sits with its tail curled on the seat around the left side of the haunch
   * (2026-10-16-cat-seat decisions), and stands as a soloist. Its head
   * height is the head of the studio body, and its chair fits its legs: the seat height is the seat
   * of the studio body, in H.
   *
   * The stick of the bow passes through the middle of the closed right paw (2026-10-17-cat-bow
   * decisions). The paw of the studio turns in the plane of its palm toward the forearm by 0° to 70°
   * (`PAW_TURN` of `studio-rig.ts`), and its middle moves on an arc around the wrist. The stick
   * lies along the line nearest to that arc, 50° from square toward the wrist, so that the paw
   * slides along the stick and keeps it in each turn. With the grip of `BOW_GRIP`, the stick lay 4.3 cm
   * out from the middle of the paw on the palm side, under the paw.
   */
  cat: {
    body: 'studio-cat',
    size: 1,
    colors: SPECIES_COLORS.cat,
    accentParts: ['inner-ears', 'nose'],
    seatedTail: 'curl',
    bowGrip: { at: [-0.002, 0.007, -0.079], turn: 50 * (Math.PI / 180) },
    proportions: {
      headHeight: STUDIO_CAT.headHeight,
      seatHeight: STUDIO_CAT.seatHeight / STUDIO_CAT.headHeight,
    },
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
  /** Penguin, the choir. The black and white egg body looks like a choir robe (design 4.4). */
  penguin: {
    size: 0.9,
    colors: SPECIES_COLORS.penguin,
    accentParts: ['beak', 'feet'],
    body: 'penguin',
  },
  /**
   * Polar bear, the piano and the other keyboards. It has the studio body of `lowpoly-studio/`
   * (design 4.4), seated as the pianist of the studio. Its head height is the head of the studio.
   * It sits on a bench of 0.25 m (`seat` of its entry in `ANIMALS` of `tools/studio-body.ts`), and
   * its soles touch the floor: the studio made its shins longer for the bench. The seat height is
   * the seat of the studio body, in H.
   */
  'polar-bear': {
    body: 'studio-polar-bear',
    size: 1.1,
    colors: SPECIES_COLORS['polar-bear'],
    accentParts: ['nose'],
    proportions: {
      headHeight: STUDIO_POLAR_BEAR.headHeight,
      seatHeight: STUDIO_POLAR_BEAR.seatHeight / STUDIO_POLAR_BEAR.headHeight,
    },
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
