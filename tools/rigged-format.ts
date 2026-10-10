import { FINISH_ORDER } from '../src/models/mesh.ts';
import type { BoneName } from '../src/models/rig.ts';
import type { Vec3 } from '../src/models/tuples.ts';
import { SCULPT_STEP, readVarint, unzigzag } from './sculpt-format.ts';
import type { Reader, SculptRegion } from './sculpt-format.ts';

/**
 * The bones of a player that a rigged body moves (design 4.4, 4.7). The packer maps the bones of
 * the Blender rig onto them, and puts the eyes on `eyeL` and `eyeR`.
 */
export const RIGGED_JOINTS = [
  'hips',
  'spine',
  'chest',
  'neck',
  'head',
  'eyeL',
  'eyeR',
  'tail1',
  'tail2',
  'shoulderL',
  'upperArmL',
  'forearmL',
  'handL',
  'shoulderR',
  'upperArmR',
  'forearmR',
  'handR',
  'thighL',
  'shinL',
  'footL',
  'thighR',
  'shinR',
  'footR',
] as const satisfies readonly BoneName[];

/** A bone of a player that a rigged body moves. */
export type RiggedJoint = (typeof RIGGED_JOINTS)[number];

/** The sum of the packed weights of one vertex: each weight is a step of 1/255. */
export const WEIGHT_UNITS = 255;

/**
 * A rigged body: a mesh from Blender with its own skeleton and automatic weights (route B of the
 * fox spike, design 4.4). The mesh has the seated playing pose of the model sheet of the
 * species, and each vertex follows up to four bones. `pnpm pack-rigged` writes the module of a
 * species from a GLB file. The axes are the axes of the model: the animal faces -z, its left
 * side is -x, and the origin is on the floor under the middle of the seat. The app reads no
 * rigged body.
 */
export interface RiggedBody {
  /** The height of the seat that the body sits on, in meters. */
  readonly seatHeight: number;
  /** The color regions. A triangle holds the index of its region. */
  readonly regions: readonly SculptRegion[];
  /**
   * The place of each joint in the pose of the mesh: the head of its bone in the Blender rig,
   * or the middle of an eye.
   */
  readonly joints: Readonly<Record<RiggedJoint, Vec3>>;
  /**
   * A point of each hand bone in the pose of the mesh, 0.1 m from the wrist: the direction of the
   * hand from the wrist to the paw.
   */
  readonly handTips: Readonly<Record<'handL' | 'handR', Vec3>>;
  /** The tip of the nose: the front point of the triangles of the nose. */
  readonly nose: Vec3;
  /** The packed mesh ({@link decodeRigged}). */
  readonly mesh: string;
}

/** The mesh of a rigged body, as {@link decodeRigged} reads it back from its packed bytes. */
export interface RiggedMesh {
  /** The place of each corner: x, y, and z, in meters. */
  readonly positions: Float32Array;
  /** The main bone of each corner: the bone with the largest weight. */
  readonly bones: Uint8Array;
  /** The finish of each triangle, as an index of `FINISH_ORDER`. */
  readonly finishes: Uint8Array;
  /** The four bones of each corner, from the largest weight to the smallest. */
  readonly skinIndices: Uint8Array;
  /** The four weights of each corner, in the order of {@link RiggedMesh.skinIndices}. */
  readonly skinWeights: Float32Array;
}

/**
 * Decodes the packed mesh of a rigged body: three corners for each triangle, each with its own
 * copy of the position and the skin of four bones (design 4.4, 4.7). The tests of the packer read
 * the packed mesh back with it.
 *
 * The packed bytes, as base64:
 *
 * 1. The vertex count and the triangle count, as LEB128 numbers.
 * 2. The position of each vertex, in the order of the first use by a corner: for each axis, the
 *    difference from the vertex before, in steps of {@link SCULPT_STEP}, as a zigzag LEB128
 *    number.
 * 3. The skin of each vertex: four bones (indices of `BONE_NAMES`) from the largest weight to the
 *    smallest, then the first three weights in steps of 1 / {@link WEIGHT_UNITS}, one byte each.
 *    The fourth weight is the rest of 1.
 * 4. The three corners of each triangle: 0 for the next new vertex, else the new vertex count
 *    minus the vertex, as a LEB128 number.
 * 5. The region of each triangle, one byte each.
 *
 * @param packed The packed mesh.
 * @param regions The color regions of the body.
 * @returns The mesh.
 * @throws Error if a triangle names a region or a vertex that does not exist, or if the weights
 *   of a vertex add up to more than 1.
 */
export function decodeRigged(packed: string, regions: readonly SculptRegion[]): RiggedMesh {
  const reader: Reader = { bytes: Uint8Array.from(atob(packed), (c) => c.charCodeAt(0)), at: 0 };
  const vertexCount = readVarint(reader);
  const triangleCount = readVarint(reader);

  const positions = new Float64Array(vertexCount * 3);
  const last = [0, 0, 0];
  for (let v = 0; v < vertexCount; v++) {
    for (let axis = 0; axis < 3; axis++) {
      last[axis] = (last[axis] ?? 0) + unzigzag(readVarint(reader));
      positions[v * 3 + axis] = (last[axis] ?? 0) * SCULPT_STEP;
    }
  }

  const bones = new Uint8Array(vertexCount * 4);
  const weights = new Float32Array(vertexCount * 4);
  for (let v = 0; v < vertexCount; v++) {
    const bytes = reader.bytes.subarray(reader.at, reader.at + 7);
    reader.at += 7;
    const [a = 0, b = 0, c = 0] = [bytes[4], bytes[5], bytes[6]];
    const units = [a, b, c, WEIGHT_UNITS - a - b - c];
    if (a + b + c > WEIGHT_UNITS) {
      throw new Error(`The weights of the vertex ${v} add up to more than 1.`);
    }
    for (let k = 0; k < 4; k++) {
      bones[v * 4 + k] = bytes[k] ?? 0;
      weights[v * 4 + k] = (units[k] ?? 0) / WEIGHT_UNITS;
    }
  }

  const corners = new Uint32Array(triangleCount * 3);
  let next = 0;
  for (let c = 0; c < corners.length; c++) {
    const code = readVarint(reader);
    corners[c] = code === 0 ? next : next - code;
    if (code === 0) {
      next += 1;
    }
  }

  const triangleRegions = reader.bytes.subarray(reader.at, reader.at + triangleCount);
  const finishes = regions.map((region) => FINISH_ORDER.indexOf(region.finish));
  const cornerCount = corners.length;
  const mesh = {
    positions: new Float32Array(cornerCount * 3),
    bones: new Uint8Array(cornerCount),
    finishes: new Uint8Array(triangleCount),
    skinIndices: new Uint8Array(cornerCount * 4),
    skinWeights: new Float32Array(cornerCount * 4),
  } satisfies RiggedMesh;

  for (let t = 0; t < triangleCount; t++) {
    const region = triangleRegions[t] ?? -1;
    const finish = finishes[region];
    if (finish === undefined) {
      throw new Error(`Triangle ${t} names the region ${region}, which does not exist.`);
    }

    mesh.finishes[t] = finish;
    for (let k = 0; k < 3; k++) {
      const corner = t * 3 + k;
      const vertex = corners[corner] ?? -1;
      if (vertex < 0 || vertex >= vertexCount) {
        throw new Error(`Triangle ${t} names the vertex ${vertex}, which does not exist.`);
      }

      for (let axis = 0; axis < 3; axis++) {
        mesh.positions[corner * 3 + axis] = positions[vertex * 3 + axis] ?? 0;
      }
      for (let slot = 0; slot < 4; slot++) {
        mesh.skinIndices[corner * 4 + slot] = bones[vertex * 4 + slot] ?? 0;
        mesh.skinWeights[corner * 4 + slot] = weights[vertex * 4 + slot] ?? 0;
      }
      mesh.bones[corner] = bones[vertex * 4] ?? 0;
    }
  }
  return mesh;
}
