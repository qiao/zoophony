import { Vector3 } from 'three';

import { buildBiped } from './biped.ts';
import type { BodyBones } from './biped.ts';
import { seated } from './body-frame.ts';
import type { Vec3 } from './tuples.ts';
import { MeshBuilder } from './mesh.ts';
import type { MeshData, Rgb } from './mesh.ts';
import { BONE_NAMES, boneIndex, makeSkeleton } from './rig.ts';
import type { BoneName } from './rig.ts';
import { proportionsOf } from './proportions.ts';
import { SPECIES } from './species.ts';
import type { SpeciesParams } from './species.ts';

/** The seat height of the test bodies, in meters. */
export const SEAT = 0.45;

/** The head height `H` of the rabbit (design 4.5, body proportions), from its skeleton. */
export const H = proportionsOf(SPECIES.rabbit).headHeight;

/** The parameters of the rabbit, with no sculpt: its parametric body on its own skeleton. */
export const PARAMETRIC_RABBIT: SpeciesParams = parametricOf(SPECIES.rabbit);

/**
 * Gives the parameters of a species with no sculpt, so that a test measures the parametric parts
 * (design 4.4).
 *
 * @param species The species parameters.
 * @returns The parameters with no sculpt.
 */
function parametricOf(species: SpeciesParams): SpeciesParams {
  const { sculpt: _sculpt, ...parametric } = species;
  return parametric;
}

/** The mesh and the bones of the rabbit body. */
export interface RabbitBody {
  /** The mesh of the body. */
  readonly mesh: MeshData;
  /** The bind position of each body bone. */
  readonly positions: BodyBones['positions'];
}

/**
 * Builds the body of the rabbit on a seat of {@link SEAT}.
 *
 * @returns The mesh and the bones.
 */
export function rabbit(): RabbitBody {
  const builder = new MeshBuilder();
  const body = buildBiped(builder, SPECIES.rabbit, seated(SEAT));
  return { mesh: builder.build(), positions: body.positions };
}

/** The mesh and the bones of one body. */
export interface BuiltBody {
  /** The mesh of the body. */
  readonly mesh: MeshData;
  /** The bind positions of the body bones, and the points that the instruments need. */
  readonly body: BodyBones;
}

/**
 * Builds the body of a variant of the rabbit on a seat of {@link SEAT}.
 *
 * @param change The parameters that differ from the rabbit.
 * @returns The mesh and the bones.
 */
export function variant(change: Partial<SpeciesParams>): BuiltBody {
  const builder = new MeshBuilder();
  const body = buildBiped(builder, { ...SPECIES.rabbit, ...change }, seated(SEAT));
  return { mesh: builder.build(), body };
}

/**
 * Finds the lowest vertex of the parts that follow one bone.
 *
 * @param mesh The mesh.
 * @param bone The bone.
 * @returns The height of the vertex, or `Infinity` if no part follows the bone.
 */
export function bottomOf(mesh: MeshData, bone: BoneName): number {
  let bottom = Infinity;
  for (let v = 0; v < mesh.bones.length; v++) {
    if (mesh.bones[v] === boneIndex(bone)) {
      bottom = Math.min(bottom, mesh.positions[v * 3 + 1] ?? Infinity);
    }
  }
  return bottom;
}

/**
 * Finds the highest vertex of the parts that follow one bone.
 *
 * @param mesh The mesh.
 * @param bone The bone.
 * @returns The height of the vertex, or `-Infinity` if no part follows the bone.
 */
export function topOf(mesh: MeshData, bone: BoneName): number {
  let top = -Infinity;
  for (let v = 0; v < mesh.bones.length; v++) {
    if (mesh.bones[v] === boneIndex(bone)) {
      top = Math.max(top, mesh.positions[v * 3 + 1] ?? -Infinity);
    }
  }
  return top;
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

/**
 * Calculates the signed volume of the triangles of one bone. It is larger than 0 when the
 * corners of each closed part go counterclockwise when seen from outside.
 *
 * @param mesh The mesh.
 * @param bone The bone.
 * @returns The volume, in cubic meters.
 */
export function volumeOn(mesh: MeshData, bone: BoneName): number {
  let volume = 0;
  const p = mesh.positions;
  for (let t = 0; t < mesh.bones.length / 3; t++) {
    if (mesh.bones[t * 3] !== boneIndex(bone)) {
      continue;
    }
    const at = (k: number): Vector3 =>
      new Vector3(p[t * 9 + k * 3] ?? 0, p[t * 9 + k * 3 + 1] ?? 0, p[t * 9 + k * 3 + 2] ?? 0);
    volume += at(0).dot(new Vector3().crossVectors(at(1), at(2))) / 6;
  }
  return volume;
}

/**
 * Finds the largest distance of a vertex of one bone from a point.
 *
 * @param mesh The mesh.
 * @param bone The bone.
 * @param from The point.
 * @returns The distance, in meters.
 */
export function reachFrom(mesh: MeshData, bone: BoneName, from: Vec3): number {
  let reach = 0;
  const origin = new Vector3(...from);
  for (let v = 0; v < mesh.bones.length; v++) {
    if (mesh.bones[v] === boneIndex(bone)) {
      const p = new Vector3(
        mesh.positions[v * 3] ?? 0,
        mesh.positions[v * 3 + 1] ?? 0,
        mesh.positions[v * 3 + 2] ?? 0,
      );
      reach = Math.max(reach, p.distanceTo(origin));
    }
  }
  return reach;
}

/**
 * Finds the largest distance between two vertices of one bone.
 *
 * @param mesh The mesh.
 * @param bone The bone.
 * @returns The distance, in meters.
 */
export function spanOf(mesh: MeshData, bone: BoneName): number {
  const points: Vector3[] = [];
  for (let v = 0; v < mesh.bones.length; v++) {
    if (mesh.bones[v] === boneIndex(bone)) {
      points.push(
        new Vector3(
          mesh.positions[v * 3] ?? 0,
          mesh.positions[v * 3 + 1] ?? 0,
          mesh.positions[v * 3 + 2] ?? 0,
        ),
      );
    }
  }

  let span = 0;
  for (const a of points) {
    for (const b of points) {
      span = Math.max(span, a.distanceTo(b));
    }
  }
  return span;
}

/**
 * Finds the vertices of one color, on all bones or on a list of bones.
 *
 * @param mesh The mesh.
 * @param color The color, in linear values.
 * @param bones The bones. Default: all bones.
 * @returns The vertices.
 */
export function verticesWithColor(mesh: MeshData, color: Rgb, bones?: readonly BoneName[]): Vec3[] {
  const found: Vec3[] = [];
  const wanted = bones?.map(boneIndex);
  for (let v = 0; v < mesh.bones.length; v++) {
    if (wanted && !wanted.includes(mesh.bones[v] ?? -1)) {
      continue;
    }
    const same = color.every((c, k) => Math.abs((mesh.colors[v * 3 + k] ?? 0) - c) < 1e-6);
    if (same) {
      found.push([
        mesh.positions[v * 3] ?? 0,
        mesh.positions[v * 3 + 1] ?? 0,
        mesh.positions[v * 3 + 2] ?? 0,
      ]);
    }
  }
  return found;
}
