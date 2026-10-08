import { writeFile } from 'node:fs/promises';

import { buildBiped } from '../src/models/biped.ts';
import type { BodyBoneName } from '../src/models/biped.ts';
import { seated } from '../src/models/body-frame.ts';
import type { Stance } from '../src/models/body-frame.ts';
import { MeshBuilder } from '../src/models/mesh.ts';
import { CHAIR } from '../src/models/props.ts';
import { SPECIES } from '../src/models/species.ts';
import type { SpeciesId, SpeciesParams } from '../src/models/species.ts';
import type { Vec3 } from '../src/models/tuples.ts';

/**
 * The stances that a sculpt holds (design 4.4). A seated sculpt sits on a seat 0.35 m high with its
 * feet on the floor. A move of the whole body fits it to the other seats with the same drop from
 * the seat to the feet: the chair, the stool, and the high stool with its foot ring.
 */
export const SCULPT_STANCES = {
  seated: seated(CHAIR.seatHeight),
  standing: { kind: 'standing' },
} as const satisfies Readonly<Record<string, Stance>>;

/** The name of a stance of a sculpt. */
export type SculptStanceName = keyof typeof SCULPT_STANCES;

/** The skeleton and the body points of one stance, in the axes of the model. */
export interface SculptRigStance {
  /** The bind position of each body bone. */
  readonly bones: Readonly<Record<BodyBoneName, Vec3>>;
  /** The center of the head. */
  readonly headCenter: Vec3;
  /** The middle of the mouth, at the front of the snout. */
  readonly mouth: Vec3;
  /** The middle of the palm of each hand. */
  readonly palmL: Vec3;
  readonly palmR: Vec3;
  /** The middle of the finger block of each hand. */
  readonly fingerBlockL: Vec3;
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
  /** The skeleton of each stance. */
  readonly stances: Readonly<Record<SculptStanceName, SculptRigStance>>;
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

  return {
    species,
    h: buildBiped(new MeshBuilder(), params, SCULPT_STANCES.seated).headHeight,
    colors: {
      fur: params.colors.fur,
      belly: params.colors.belly,
      accent: params.colors.accent,
      iris: params.eyes.iris ?? '#000000',
    },
    stances: {
      seated: rigOf(SCULPT_STANCES.seated),
      standing: rigOf(SCULPT_STANCES.standing),
    },
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
