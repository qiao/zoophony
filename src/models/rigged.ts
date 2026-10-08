import { FINISH_ORDER, srgb } from './mesh.ts';
import type { MeshData } from './mesh.ts';
import type { BoneName } from './rig.ts';
import { SCULPT_STEP, readVarint, unzigzag } from './sculpt.ts';
import type { Reader, SculptRegion } from './sculpt.ts';
import type { Vec3 } from './tuples.ts';

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
 * side is -x, and the origin is on the floor under the middle of the seat.
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

/**
 * Decodes the packed mesh of a rigged body into mesh data: three corners for each triangle, each
 * with its own copy of the position, the color, and the skin of four bones (design 4.4, 4.7).
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
 * The main bone of a corner is its first bone. The second bone is its second bone, with the
 * share of the second weight in the sum of the first two weights.
 *
 * @param packed The packed mesh.
 * @param regions The color regions of the body.
 * @returns The mesh data, with {@link MeshData.skin}.
 * @throws Error if a triangle names a region or a vertex that does not exist, or if the weights
 *   of a vertex add up to more than 1.
 */
export function decodeRigged(packed: string, regions: readonly SculptRegion[]): MeshData {
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
  const colors = regions.map((region) => srgb(region.color));
  const finishes = regions.map((region) => FINISH_ORDER.indexOf(region.finish));
  const cornerCount = corners.length;
  const data = {
    positions: new Float32Array(cornerCount * 3),
    colors: new Float32Array(cornerCount * 3),
    bones: new Uint8Array(cornerCount),
    blendBones: new Uint8Array(cornerCount),
    blendWeights: new Float32Array(cornerCount),
    finishes: new Uint8Array(triangleCount),
    fillers: new Uint8Array(triangleCount),
    skin: { indices: new Uint8Array(cornerCount * 4), weights: new Float32Array(cornerCount * 4) },
  } satisfies MeshData;

  for (let t = 0; t < triangleCount; t++) {
    const region = triangleRegions[t] ?? -1;
    const color = colors[region];
    const finish = finishes[region];
    if (!color || finish === undefined) {
      throw new Error(`Triangle ${t} names the region ${region}, which does not exist.`);
    }

    data.finishes[t] = finish;
    for (let k = 0; k < 3; k++) {
      const corner = t * 3 + k;
      const vertex = corners[corner] ?? -1;
      if (vertex < 0 || vertex >= vertexCount) {
        throw new Error(`Triangle ${t} names the vertex ${vertex}, which does not exist.`);
      }

      for (let axis = 0; axis < 3; axis++) {
        data.positions[corner * 3 + axis] = positions[vertex * 3 + axis] ?? 0;
        data.colors[corner * 3 + axis] = color[axis] ?? 0;
      }
      for (let slot = 0; slot < 4; slot++) {
        data.skin.indices[corner * 4 + slot] = bones[vertex * 4 + slot] ?? 0;
        data.skin.weights[corner * 4 + slot] = weights[vertex * 4 + slot] ?? 0;
      }
      const first = weights[vertex * 4] ?? 1;
      const second = weights[vertex * 4 + 1] ?? 0;
      data.bones[corner] = bones[vertex * 4] ?? 0;
      data.blendBones[corner] = second > 0 ? (bones[vertex * 4 + 1] ?? 0) : data.bones[corner];
      data.blendWeights[corner] = second / (first + second);
    }
  }
  return data;
}
