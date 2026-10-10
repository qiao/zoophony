import { FINISH_ORDER, srgb } from '../src/models/mesh.ts';
import type { Finish, MeshData } from '../src/models/mesh.ts';
import type { Vec3 } from '../src/models/tuples.ts';

/**
 * The size of one step of a packed coordinate, in meters. The rounding is the same on each side of
 * the middle plane, so the left half of a sculpt stays the mirror image of its right half.
 */
export const SCULPT_STEP = 2.5e-4;

/** The largest weight of the second bone of a corner, as in `MeshData.blendWeights`. */
export const MAX_BLEND = 0.5;

/** The largest packed weight: one byte. */
export const WEIGHT_STEPS = 255;

/** One color region of a sculpt: the color and the finish of its triangles. */
export interface SculptRegion {
  /** The base color as a CSS hex color in sRGB (design 4.5). */
  readonly color: string;
  /** The finish of the triangles of the region. */
  readonly finish: Finish;
}

/**
 * The stance of the legs of a sculpt. Seated legs hang from a seat of `seatHeight` to the floor.
 */
export type SculptStance =
  | {
      /** The kind of the stance: on a seat. */
      readonly kind: 'seated';
      /** The height of the seat, in meters. */
      readonly seatHeight: number;
    }
  | {
      /** The kind of the stance: on the floor. */
      readonly kind: 'standing';
    };

/** The legs of a sculpt in one stance, and the place of the body above them. */
export interface SculptLegs {
  /** The stance of the legs. */
  readonly stance: SculptStance;
  /**
   * The body bones that the Blender build used, in the axes of the model: the bind positions of
   * `buildBiped()` for the species in this stance.
   */
  readonly bones: Readonly<Record<string, Vec3>>;
  /** The move of the body of the sculpt ({@link Sculpt.body}) to this stance, in meters. */
  readonly bodyOffset: Vec3;
  /** The packed mesh of the legs and the feet ({@link decodePacked}). */
  readonly legs: string;
}

/**
 * A sculpt: the body of a species from the Blender build of `tools/blender/` (design 4.4). The
 * Blender build makes it around the bones and the body points of the parametric body
 * (`buildBiped()`). The parts above the legs are the same in each stance, and only move with the
 * hips. Each stance has its own legs. The app reads no sculpt.
 */
export interface Sculpt {
  /** The head height `H` that the sculpt was built for, in meters. */
  readonly h: number;
  /** The color regions. A triangle holds the index of its region. */
  readonly regions: readonly SculptRegion[];
  /**
   * The packed mesh of the parts above the legs ({@link decodePacked}): the trunk with the head,
   * the tail, the arms, the hands, the ears, and the eyes, in the axes of the first stance.
   */
  readonly body: string;
  /** The legs of each stance. */
  readonly stances: readonly SculptLegs[];
}

/** The cursor of a read of packed bytes. */
export interface Reader {
  /** The bytes. */
  readonly bytes: Uint8Array;
  /** The index of the next byte. */
  at: number;
}

/**
 * Reads an unsigned LEB128 number: 7 bits in each byte, the low bits first, and the high bit set
 * on each byte except the last.
 *
 * @param reader The cursor. The read moves it.
 * @returns The number.
 * @throws Error if the bytes end in the number.
 */
export function readVarint(reader: Reader): number {
  let value = 0;
  let scale = 1;
  for (;;) {
    const byte = reader.bytes[reader.at];
    if (byte === undefined) {
      throw new Error('The packed mesh ends in a number.');
    }

    reader.at += 1;
    value += (byte & 0x7f) * scale;
    if (byte < 0x80) {
      return value;
    }
    scale *= 0x80;
  }
}

/**
 * Turns a zigzag number back into a signed number: 0, 1, 2, 3 give 0, -1, 1, -2.
 *
 * @param value The zigzag number.
 * @returns The signed number.
 */
export function unzigzag(value: number): number {
  return value % 2 === 0 ? value / 2 : -(value + 1) / 2;
}

/**
 * Decodes one packed mesh into mesh data: three corners for each triangle, each with its own copy
 * of the position, the color, and the skin (design 4.4, 4.7). The tests of the packer read the
 * packed mesh back with it.
 *
 * The packed bytes, as base64:
 *
 * 1. The vertex count and the triangle count, as LEB128 numbers.
 * 2. The position of each vertex, in the order of the first use by a corner: for each axis, the
 *    difference from the vertex before, in steps of {@link SCULPT_STEP}, as a zigzag LEB128
 *    number.
 * 3. The skin of each vertex: the main bone, the second bone, and the weight of the second bone in
 *    steps of 0.5 / 255, one byte each.
 * 4. The three corners of each triangle: 0 for the next new vertex, else the new vertex count
 *    minus the vertex, as a LEB128 number.
 * 5. The region of each triangle, one byte each.
 *
 * @param packed The packed mesh.
 * @param regions The color regions of the sculpt.
 * @returns The mesh data.
 * @throws Error if a triangle names a region or a vertex that does not exist.
 */
export function decodePacked(packed: string, regions: readonly SculptRegion[]): MeshData {
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

  const skins = reader.bytes.subarray(reader.at, reader.at + vertexCount * 3);
  reader.at += vertexCount * 3;

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
  const data = {
    positions: new Float32Array(corners.length * 3),
    colors: new Float32Array(corners.length * 3),
    bones: new Uint8Array(corners.length),
    blendBones: new Uint8Array(corners.length),
    blendWeights: new Float32Array(corners.length),
    finishes: new Uint8Array(triangleCount),
    fillers: new Uint8Array(triangleCount),
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
      data.bones[corner] = skins[vertex * 3] ?? 0;
      data.blendBones[corner] = skins[vertex * 3 + 1] ?? 0;
      data.blendWeights[corner] = ((skins[vertex * 3 + 2] ?? 0) / WEIGHT_STEPS) * MAX_BLEND;
    }
  }
  return data;
}
