import { writeFile } from 'node:fs/promises';

import { buildBiped } from '../src/models/biped.ts';
import type { BodyBoneName } from '../src/models/biped.ts';
import { seated } from '../src/models/body-frame.ts';
import type { Stance } from '../src/models/body-frame.ts';
import { SECTION_INSTRUMENTS, SECTION_SPECIES } from '../src/models/cast.ts';
import { PIANO_BENCH } from '../src/models/instruments/piano.ts';
import { MeshBuilder } from '../src/models/mesh.ts';
import { INSTRUMENT_SUPPORTS } from '../src/models/player.ts';
import { CHAIR } from '../src/models/props.ts';
import { proportionsOf } from '../src/models/proportions.ts';
import type { BodyProportions } from '../src/models/proportions.ts';
import { SPECIES } from '../src/models/species.ts';
import type { AccentPart, SpeciesId, SpeciesParams } from '../src/models/species.ts';
import type { Vec3 } from '../src/models/tuples.ts';

/**
 * The stances that a sculpt can hold (design 4.4). A seated sculpt sits on a seat 0.35 m high with
 * its feet on the floor. A move of the whole body fits it to the other seats with the same drop
 * from the seat to the feet: the chair, the stool, and the high stool with its foot ring. A sculpt
 * on the bench of the piano sits 0.45 m high. A standing sculpt stands on the floor.
 */
export const SCULPT_STANCES = {
  seated: seated(CHAIR.seatHeight),
  bench: seated(PIANO_BENCH.seatHeight),
  standing: { kind: 'standing' },
} as const satisfies Readonly<Record<string, Stance>>;

/** The name of a stance of a sculpt. */
export type SculptStanceName = keyof typeof SCULPT_STANCES;

/**
 * Gives the stances of the sculpt of a species, in the order of `Sculpt.stances` (design 4.4):
 * seated, then the bench of the piano for a species that plays an instrument on the bench, then
 * standing. The Blender build makes the body above the legs from the first stance.
 *
 * @param species The species.
 * @returns The names of the stances.
 */
export function sculptStances(species: SpeciesId): readonly SculptStanceName[] {
  const sections = Object.keys(SECTION_SPECIES).filter(
    (section): section is keyof typeof SECTION_SPECIES => Object.hasOwn(SECTION_SPECIES, section),
  );
  const bench = sections.some(
    (section) =>
      SECTION_SPECIES[section].some((id) => id === species) &&
      SECTION_INSTRUMENTS[section].some(
        (instrument) => INSTRUMENT_SUPPORTS[instrument] === 'bench',
      ),
  );
  return bench ? ['seated', 'bench', 'standing'] : ['seated', 'standing'];
}

/** The skeleton and the body points of one stance, in the axes of the model. */
export interface SculptRigStance {
  /** The bind position of each body bone. */
  readonly bones: Readonly<Record<BodyBoneName, Vec3>>;
  /** The center of the head. */
  readonly headCenter: Vec3;
  /** The middle of the mouth, at the front of the snout. */
  readonly mouth: Vec3;
  /** The middle of the palm of the left hand. */
  readonly palmL: Vec3;
  /** The middle of the palm of the right hand. */
  readonly palmR: Vec3;
  /** The middle of the finger block of the left hand. */
  readonly fingerBlockL: Vec3;
  /** The middle of the finger block of the right hand. */
  readonly fingerBlockR: Vec3;
}

/**
 * The input of the Blender build of one species (`tools/blender/build_sculpt.py`): the head
 * height, the colors, and the skeleton of each stance. The model faces -z, its left side is -x,
 * and the floor is at y = 0.
 */
export interface SculptRig {
  /** The species. */
  readonly species: SpeciesId;
  /** The head height `H`, in meters (design 4.5, body proportions). */
  readonly h: number;
  /**
   * The skeleton of the species (design 4.3). A recipe reads the heights of the torso from it,
   * for example the shoulder joints of the yoke.
   */
  readonly proportions: BodyProportions;
  /** The base colors of the species as CSS hex colors in sRGB (design 4.5). */
  readonly colors: {
    /** The fur color. */
    readonly fur: string;
    /** The belly color: the chest, the lower face, and the tip of the tail. */
    readonly belly: string;
    /** The accent color: the lower legs, the feet, and the hands of the fox. */
    readonly accent: string;
    /** The iris color, or black. */
    readonly iris: string;
  };
  /** The parts that get the accent color (design 4.5), as `accentParts` of the species. */
  readonly accentParts: readonly AccentPart[];
  /**
   * The skeleton of each stance of {@link sculptStances}: seated and standing, and the bench of
   * the piano for a species that plays on it.
   */
  readonly stances: Readonly<Record<'seated' | 'standing', SculptRigStance>> & {
    /** The skeleton on the bench of the piano. */
    readonly bench?: SculptRigStance;
  };
}

/**
 * Gives the skeleton and the body points of a species in each stance of a sculpt, from the
 * parametric body (`buildBiped()`). The Blender build makes the sculpt around these bones, so
 * that the poses, the holds, and the tests keep their bones.
 *
 * @param species The species.
 * @returns The input of the Blender build.
 */
export function sculptRig(species: SpeciesId): SculptRig {
  const params: SpeciesParams = SPECIES[species];
  const rigOf = (stance: Stance): SculptRigStance => {
    const body = buildBiped(new MeshBuilder(), params, stance);
    return {
      bones: body.positions,
      headCenter: body.headCenter,
      mouth: body.mouth,
      palmL: body.palmL,
      palmR: body.palmR,
      fingerBlockL: body.fingerBlockL,
      fingerBlockR: body.fingerBlockR,
    };
  };

  // The keys keep the order of `sculptStances()`: the Blender build reads the stances in order.
  const seatedRig = rigOf(SCULPT_STANCES.seated);
  const standingRig = rigOf(SCULPT_STANCES.standing);
  let stances: SculptRig['stances'] = { seated: seatedRig, standing: standingRig };
  if (sculptStances(species).includes('bench')) {
    stances = { seated: seatedRig, bench: rigOf(SCULPT_STANCES.bench), standing: standingRig };
  }

  return {
    species,
    h: buildBiped(new MeshBuilder(), params, SCULPT_STANCES.seated).headHeight,
    proportions: proportionsOf(params),
    colors: {
      fur: params.colors.fur,
      belly: params.colors.belly,
      accent: params.colors.accent,
      iris: params.eyes.iris ?? '#000000',
    },
    accentParts: params.accentParts,
    stances,
  };
}

/**
 * Writes the rig of a species as JSON: `node tools/sculpt-rig.ts <species> <file>`.
 */
async function main(): Promise<void> {
  const [species, file] = process.argv.slice(2);
  if (!species || !file || !(species in SPECIES)) {
    throw new Error('Usage: node tools/sculpt-rig.ts <species> <file>');
  }

  // SAFETY: the `in` check above makes the name a key of SPECIES.
  const rig = sculptRig(species as SpeciesId);
  await writeFile(file, `${JSON.stringify(rig, null, 2)}\n`);
  console.log(`${file}: the rig of ${species}`);
}

if (import.meta.main) {
  await main();
}
