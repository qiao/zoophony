import { buildBiped } from './biped.ts';
import type { BodyBones } from './biped.ts';
import { seated } from './body-frame.ts';
import type { Stance } from './body-frame.ts';
import type { Vec3 } from './tuples.ts';
import { MeshBuilder } from './mesh.ts';
import type { MeshData } from './mesh.ts';
import { BONE_NAMES, boneIndex, makeSkeleton } from './rig.ts';
import type { BoneName } from './rig.ts';
import { SPECIES } from './species.ts';
import type { SpeciesParams } from './species.ts';

/** The seat height of the test bodies, in meters. */
export const SEAT = 0.45;

/**
 * The deer: the sample body of the tests of the parametric parts. It keeps the parametric biped,
 * with the antlered ears, the long snout, and the puff tail. The badger was the sample body until it
 * got the studio body of the badger mesh (design 4.4).
 */
const SAMPLE = SPECIES.deer;

/** The head height `H` of the sample body (design 4.5, body proportions). */
export const H = SAMPLE.headHeight;

/** The mesh and the bones of the sample body. */
export interface SampleBody {
  /** The mesh of the body. */
  readonly mesh: MeshData;
  /** The bind position of each body bone. */
  readonly positions: BodyBones['positions'];
}

/**
 * Builds the sample body on a seat of {@link SEAT}.
 *
 * @returns The mesh and the bones.
 */
export function sampleBody(): SampleBody {
  const { mesh, body } = builtBody(SAMPLE, seated(SEAT));
  return { mesh, positions: body.positions };
}

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

/** The smallest and the largest x, y, and z of the parts that follow one bone. */
export interface Bounds {
  /** The smallest x, y, and z. */
  readonly min: Vec3;
  /** The largest x, y, and z. */
  readonly max: Vec3;
}

/**
 * Finds the box around the parts that follow one bone.
 *
 * @param mesh The mesh.
 * @param bone The bone.
 * @returns The box.
 */
export function boundsOf(mesh: MeshData, bone: BoneName): Bounds {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let v = 0; v < mesh.bones.length; v++) {
    if (mesh.bones[v] !== boneIndex(bone)) {
      continue;
    }
    for (let k = 0; k < 3; k++) {
      const value = mesh.positions[v * 3 + k] ?? 0;
      min[k] = Math.min(min[k] ?? Infinity, value);
      max[k] = Math.max(max[k] ?? -Infinity, value);
    }
  }
  return {
    min: [min[0] ?? 0, min[1] ?? 0, min[2] ?? 0],
    max: [max[0] ?? 0, max[1] ?? 0, max[2] ?? 0],
  };
}

/**
 * Counts the triangles that follow one bone.
 *
 * @param mesh The mesh.
 * @param bone The bone.
 * @returns The count.
 */
export function trianglesOn(mesh: MeshData, bone: BoneName): number {
  let count = 0;
  for (let t = 0; t < mesh.bones.length / 3; t++) {
    if (mesh.bones[t * 3] === boneIndex(bone)) {
      count++;
    }
  }
  return count;
}

/** The parent of each bone, by its index, or -1 for the root (design 4.7). */
const PARENTS: readonly number[] = makeSkeleton(
  // SAFETY: the entries hold each name of BONE_NAMES, so the record has all keys.
  Object.fromEntries(BONE_NAMES.map((name): [BoneName, Vec3] => [name, [0, 0, 0]])) as Record<
    BoneName,
    Vec3
  >,
  'chest',
).parents;

/**
 * Tells if the three corners of a triangle follow one bone, or a bone and its parent (design
 * 4.4). A rigid part follows one bone. A welded part, such as the torso, joins a bone and its
 * child at a joint.
 *
 * @param mesh The mesh.
 * @param triangle The index of the triangle.
 * @returns True if the corners follow at most one joint.
 */
export function joinsAtMostOneJoint(mesh: MeshData, triangle: number): boolean {
  const bones = new Set([0, 1, 2].map((k) => mesh.bones[triangle * 3 + k] ?? -1));
  if (bones.size === 1) {
    return true;
  }

  const [a = -1, b = -1] = [...bones];
  return bones.size === 2 && (PARENTS[a] === b || PARENTS[b] === a);
}
