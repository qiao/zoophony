import { buildBiped } from './biped.ts';
import type { BodyBones } from './biped.ts';
import type { Stance } from './body-frame.ts';
import { MeshBuilder } from './mesh.ts';
import type { MeshData } from './mesh.ts';
import type { SpeciesParams } from './species.ts';

/** The mesh and the bones of one body. */
export interface BuiltBody {
  /** The mesh of the body. */
  readonly mesh: MeshData;
  /** The bind positions of the body bones, and the points that the instruments need. */
  readonly body: BodyBones;
}

/**
 * Builds the body of a species in a stance.
 *
 * @param species The species parameters.
 * @param stance The stance of the body.
 * @returns The mesh and the bones.
 */
export function builtBody(species: SpeciesParams, stance: Stance): BuiltBody {
  const builder = new MeshBuilder();
  const body = buildBiped(builder, species, stance);
  return { mesh: builder.build(), body };
}
