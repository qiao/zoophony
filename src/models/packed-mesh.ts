import type { Vec3 } from './tuples.ts';

/**
 * The size of one step of a packed coordinate, in meters. The rounding is the same on each side of
 * 0, so the left half of a symmetric mesh stays the mirror image of its right half.
 */
export const PACKED_STEP = 2.5e-4;

/** The largest weight of the second bone of a vertex, as in `MeshData.blendWeights`. */
export const MAX_BLEND = 0.5;

/** The largest packed weight: one byte. */
export const WEIGHT_STEPS = 255;

/** One vertex for {@link packMesh}: its place in packed steps and its skin of two bones. */
export interface PackedVertex {
  /** The place, in steps of {@link PACKED_STEP} ({@link packCoordinate}). */
  readonly steps: Vec3;
  /** The main bone: the index of the bone with the larger weight. */
  readonly bone: number;
  /** The second bone, or `bone` for a rigid vertex. */
  readonly blendBone: number;
  /** The weight of the second bone, in steps of {@link MAX_BLEND} / {@link WEIGHT_STEPS}. */
  readonly blendStep: number;
}

/** A packed mesh read back by {@link unpackMesh}: one entry for each vertex and each triangle. */
export interface UnpackedMesh {
  /** The place of each vertex: x, y, and z, in meters. */
  readonly positions: Float64Array;
  /** The main bone of each vertex. */
  readonly bones: Uint8Array;
  /** The second bone of each vertex. */
  readonly blendBones: Uint8Array;
  /** The weight of the second bone of each vertex, from 0 to {@link MAX_BLEND}. */
  readonly blendWeights: Float32Array;
  /** The three vertices of each triangle, in the order of their corners. */
  readonly corners: Uint32Array;
  /** The region of each triangle: the index of its color. */
  readonly regions: Uint8Array;
}

/** The cursor of a read of packed bytes. */
interface Reader {
  /** The bytes. */
  readonly bytes: Uint8Array;
  /** The index of the next byte. */
  at: number;
}

/**
 * Packs a coordinate in steps of {@link PACKED_STEP}, with the same rounding on each side of 0.
 *
 * @param value The coordinate, in meters.
 * @returns The number of steps.
 */
export function packCoordinate(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value) / PACKED_STEP) + 0;
}

/**
 * Packs the vertices and the triangles of a mesh as base64 text.
 *
 * The packed bytes:
 *
 * 1. The vertex count and the triangle count, as LEB128 numbers.
 * 2. The place of each vertex, in the order of the first use by a corner: for each axis, the
 *    difference from the vertex before, in steps of {@link PACKED_STEP}, as a zigzag LEB128
 *    number.
 * 3. The skin of each vertex: the main bone, the second bone, and the weight of the second bone in
 *    steps of {@link MAX_BLEND} / {@link WEIGHT_STEPS}, one byte each.
 * 4. The three corners of each triangle: 0 for the next new vertex, else the new vertex count
 *    minus the vertex, as a LEB128 number.
 * 5. The region of each triangle, one byte each.
 *
 * The vertices go in the order of their first use, so that the corners and the differences of the
 * places are small numbers. A vertex that no triangle uses goes away.
 *
 * @param vertices The vertices.
 * @param triangles The three vertices of each triangle.
 * @param regions The region of each triangle.
 * @returns The packed mesh as base64.
 * @throws Error if a triangle names a vertex that does not exist, or if a count of regions does
 *   not fit the triangles.
 */
export function packMesh(
  vertices: readonly PackedVertex[],
  triangles: readonly number[],
  regions: readonly number[],
): string {
  if (triangles.length !== regions.length * 3) {
    throw new Error(`${triangles.length / 3} triangles have ${regions.length} regions.`);
  }

  const order: number[] = [];
  const newIndex = new Map<number, number>();
  for (const vertex of triangles) {
    if (!vertices[vertex]) {
      throw new Error(`A triangle names the vertex ${vertex}, which does not exist.`);
    }
    if (!newIndex.has(vertex)) {
      newIndex.set(vertex, order.length);
      order.push(vertex);
    }
  }

  const out: number[] = [];
  writeVarint(out, order.length);
  writeVarint(out, regions.length);
  const last = [0, 0, 0];
  for (const vertex of order) {
    const steps = vertices[vertex]?.steps ?? [0, 0, 0];
    for (let axis = 0; axis < 3; axis++) {
      writeVarint(out, zigzag((steps[axis] ?? 0) - (last[axis] ?? 0)));
      last[axis] = steps[axis] ?? 0;
    }
  }
  for (const vertex of order) {
    const packed = vertices[vertex];
    out.push(packed?.bone ?? 0, packed?.blendBone ?? 0, packed?.blendStep ?? 0);
  }
  let next = 0;
  for (const vertex of triangles) {
    const index = newIndex.get(vertex) ?? 0;
    writeVarint(out, index === next ? 0 : next - index);
    if (index === next) {
      next += 1;
    }
  }
  out.push(...regions);

  // A call of fromCharCode takes a limited number of arguments, so the bytes go in parts.
  let text = '';
  for (let i = 0; i < out.length; i += 0x8000) {
    text += String.fromCharCode(...out.slice(i, i + 0x8000));
  }
  return btoa(text);
}

/**
 * Reads a mesh of {@link packMesh} back.
 *
 * @param packed The packed mesh as base64.
 * @returns The vertices, their skins, the corners, and the regions.
 * @throws Error if the bytes end early, or if a triangle names a vertex that does not exist.
 */
export function unpackMesh(packed: string): UnpackedMesh {
  const reader: Reader = { bytes: Uint8Array.from(atob(packed), (c) => c.charCodeAt(0)), at: 0 };
  const vertexCount = readVarint(reader);
  const triangleCount = readVarint(reader);

  const positions = new Float64Array(vertexCount * 3);
  const last = [0, 0, 0];
  for (let v = 0; v < vertexCount; v++) {
    for (let axis = 0; axis < 3; axis++) {
      last[axis] = (last[axis] ?? 0) + unzigzag(readVarint(reader));
      positions[v * 3 + axis] = (last[axis] ?? 0) * PACKED_STEP;
    }
  }

  const bones = new Uint8Array(vertexCount);
  const blendBones = new Uint8Array(vertexCount);
  const blendWeights = new Float32Array(vertexCount);
  for (let v = 0; v < vertexCount; v++) {
    bones[v] = readByte(reader);
    blendBones[v] = readByte(reader);
    blendWeights[v] = (readByte(reader) / WEIGHT_STEPS) * MAX_BLEND;
  }

  const corners = new Uint32Array(triangleCount * 3);
  let next = 0;
  for (let c = 0; c < corners.length; c++) {
    const code = readVarint(reader);
    const vertex = code === 0 ? next : next - code;
    if (vertex < 0 || vertex >= vertexCount) {
      throw new Error(`The corner ${c} names the vertex ${vertex}, which does not exist.`);
    }
    corners[c] = vertex;
    if (code === 0) {
      next += 1;
    }
  }

  const regions = new Uint8Array(triangleCount);
  for (let t = 0; t < triangleCount; t++) {
    regions[t] = readByte(reader);
  }
  return { positions, bones, blendBones, blendWeights, corners, regions };
}

/**
 * Adds an unsigned LEB128 number to a byte list: 7 bits in each byte, the low bits first, and the
 * high bit set on each byte except the last.
 *
 * @param out The bytes.
 * @param value The number, an integer of at least 0.
 * @throws Error if the number is not an integer of at least 0.
 */
function writeVarint(out: number[], value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`The number ${value} is not an integer of at least 0.`);
  }

  let rest = value;
  while (rest >= 0x80) {
    out.push((rest % 0x80) | 0x80);
    rest = Math.floor(rest / 0x80);
  }
  out.push(rest);
}

/**
 * Gives the zigzag number of a signed number: 0, -1, 1, -2 give 0, 1, 2, 3.
 *
 * @param value The signed integer.
 * @returns The zigzag number.
 */
function zigzag(value: number): number {
  return value < 0 ? -2 * value - 1 : 2 * value;
}

/**
 * Reads one byte.
 *
 * @param reader The cursor. The read moves it.
 * @returns The byte.
 * @throws Error if the bytes end.
 */
function readByte(reader: Reader): number {
  const byte = reader.bytes[reader.at];
  if (byte === undefined) {
    throw new Error('The packed mesh ends early.');
  }

  reader.at += 1;
  return byte;
}

/**
 * Reads an unsigned LEB128 number ({@link writeVarint}).
 *
 * @param reader The cursor. The read moves it.
 * @returns The number.
 * @throws Error if the bytes end in the number.
 */
function readVarint(reader: Reader): number {
  let value = 0;
  let scale = 1;
  for (;;) {
    const byte = readByte(reader);
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
function unzigzag(value: number): number {
  return value % 2 === 0 ? value / 2 : -(value + 1) / 2;
}
