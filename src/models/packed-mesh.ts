import {
  byteReader,
  readByte,
  readVarint,
  toBase64,
  unzigzag,
  writeVarint,
  zigzag,
} from './packed-bytes.ts';
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

/** The number of steps of a packed skin coordinate from 0 to 1: a quarter texel of 2048. */
export const UV_STEPS = 8192;

/**
 * One vertex for {@link packMesh}: its place in packed steps, its skin of two bones, and its skin
 * coordinates.
 */
export interface PackedVertex {
  /** The place, in steps of {@link PACKED_STEP} ({@link packCoordinate}). */
  readonly steps: Vec3;
  /** The main bone: the index of the bone with the larger weight. */
  readonly bone: number;
  /** The second bone, or `bone` for a rigid vertex. */
  readonly blendBone: number;
  /** The weight of the second bone, in steps of {@link MAX_BLEND} / {@link WEIGHT_STEPS}. */
  readonly blendStep: number;
  /** u and v in the skin texture, in steps of 1 / {@link UV_STEPS}. */
  readonly uv: readonly [number, number];
}

/** A packed mesh read back by {@link unpackMesh}: one entry for each vertex and each triangle. */
interface UnpackedMesh {
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
  /** u, v of each vertex in the skin texture, from 0 to 1. */
  readonly uvs: Float32Array;
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
 * 5. The skin coordinates of each vertex: for u and v, the difference from the vertex before, in
 *    steps of 1 / {@link UV_STEPS}, as a zigzag LEB128 number.
 *
 * The vertices go in the order of their first use, so that the corners and the differences of the
 * places are small numbers. A vertex that no triangle uses goes away.
 *
 * @param vertices The vertices.
 * @param triangles The three vertices of each triangle.
 * @returns The packed mesh as base64.
 * @throws Error if a triangle names a vertex that does not exist, or if the corner count is not
 *   a multiple of 3.
 */
export function packMesh(vertices: readonly PackedVertex[], triangles: readonly number[]): string {
  if (triangles.length % 3 !== 0) {
    throw new Error(`${triangles.length} corners do not make whole triangles.`);
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
  writeVarint(out, triangles.length / 3);
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
  const lastUv = [0, 0];
  for (const vertex of order) {
    const uv = vertices[vertex]?.uv ?? [0, 0];
    for (let axis = 0; axis < 2; axis++) {
      writeVarint(out, zigzag((uv[axis] ?? 0) - (lastUv[axis] ?? 0)));
      lastUv[axis] = uv[axis] ?? 0;
    }
  }

  return toBase64(out);
}

/**
 * Reads a mesh of {@link packMesh} back.
 *
 * @param packed The packed mesh as base64.
 * @returns The vertices, their skins, the corners, and the skin coordinates.
 * @throws Error if the bytes end early, or if a triangle names a vertex that does not exist.
 */
export function unpackMesh(packed: string): UnpackedMesh {
  const reader = byteReader(packed);
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

  const uvs = new Float32Array(vertexCount * 2);
  const lastUv = [0, 0];
  for (let v = 0; v < vertexCount; v++) {
    for (let axis = 0; axis < 2; axis++) {
      lastUv[axis] = (lastUv[axis] ?? 0) + unzigzag(readVarint(reader));
      uvs[v * 2 + axis] = (lastUv[axis] ?? 0) / UV_STEPS;
    }
  }
  return { positions, bones, blendBones, blendWeights, corners, uvs };
}
