import { BufferAttribute, BufferGeometry, StaticDrawUsage } from 'three';
import type { TypedArray } from 'three';

/** The keys of the morph attributes of a geometry. */
const MORPH_KEYS = ['position', 'normal', 'color'] as const;

/** The bits of the values of one attribute, so that two values compare by their bits. */
interface Channel {
  /** The bits of each value, as 32-bit integers. */
  readonly bits: Uint32Array;
  /** The values of each vertex. */
  readonly size: number;
}

/**
 * Gives the values of an attribute as 32-bit integers for a compare by bits: a float array as
 * its bits, so that `-0` differs from `0`, and an integer array as a copy. One array type keeps
 * the loops of the compare fast.
 *
 * @param array The array of the attribute.
 * @returns The values to compare, or `null` for another array type, such as 64-bit floats.
 */
function bitsOf(array: TypedArray): Uint32Array | null {
  if (array instanceof Float32Array) {
    return new Uint32Array(array.buffer, array.byteOffset, array.length);
  }
  const integers =
    array instanceof Uint8Array ||
    array instanceof Uint8ClampedArray ||
    array instanceof Int8Array ||
    array instanceof Uint16Array ||
    array instanceof Int16Array ||
    array instanceof Uint32Array ||
    array instanceof Int32Array;
  return integers ? Uint32Array.from(array) : null;
}

/**
 * Tells if two vertices have the same bits in each channel.
 *
 * @param channels The channels.
 * @param a The first vertex.
 * @param b The second vertex.
 * @returns True if each value is the same.
 */
function sameVertex(channels: readonly Channel[], a: number, b: number): boolean {
  for (const { bits, size } of channels) {
    const from = a * size;
    const to = b * size;
    for (let k = 0; k < size; k++) {
      if (bits[from + k] !== bits[to + k]) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Gives the hash of the first values of a vertex: the position and the next attribute.
 *
 * @param channels The channels. The first one holds the positions.
 * @param v The vertex.
 * @returns The hash, a 32-bit integer.
 */
function vertexHash(channels: readonly Channel[], v: number): number {
  let hash = 0x811c9dc5;
  for (let c = 0; c < Math.min(2, channels.length); c++) {
    const { bits, size } = channels[c] ?? { bits: [], size: 0 };
    for (let k = 0; k < size; k++) {
      hash = Math.imul(hash ^ (bits[v * size + k] ?? 0), 0x01000193);
    }
  }
  return hash >>> 0;
}

/**
 * Copies the values of the kept vertices of an attribute into a new attribute.
 *
 * @param attribute The attribute.
 * @param kept The first corner of each kept vertex, in the new order.
 * @returns The new attribute, with the same array type, item size, and normalization.
 */
function keptAttribute(attribute: BufferAttribute, kept: Uint32Array): BufferAttribute {
  const size = attribute.itemSize;
  const from = attribute.array;
  // A slice of the array gives an array of the same type and of the new length.
  const to = from.slice(0, kept.length * size);
  for (let i = 0; i < kept.length; i++) {
    const v = kept[i] ?? 0;
    for (let k = 0; k < size; k++) {
      to[i * size + k] = from[v * size + k] ?? 0;
    }
  }
  const copy = new BufferAttribute(to, size, attribute.normalized);
  copy.setUsage(attribute.usage);
  return copy;
}

/**
 * Gives the corners of a geometry with no index one vertex each when all their values are the
 * same: each attribute and each morph attribute (design 4.5, 9.7). The geometry gets an index,
 * and the draws keep each triangle and the order of the triangles. A vertex shader gives the same
 * result for the same values, so the pixels do not change, and the GPU runs the vertex shader
 * one time for each kept vertex in place of each corner. The groups count the corners, which the
 * index keeps.
 *
 * @param geometry A geometry with no index, with a plain attribute for each name.
 * @returns The same geometry. A geometry with an index, an interleaved attribute, or an array of
 *   64-bit floats does not change.
 */
export function shareCorners(geometry: BufferGeometry): BufferGeometry {
  const position = geometry.getAttribute('position');
  if (geometry.index || !(position instanceof BufferAttribute)) {
    return geometry;
  }
  const names = ['position', ...Object.keys(geometry.attributes).filter((n) => n !== 'position')];
  const attributes: BufferAttribute[] = [];
  for (const name of names) {
    const attribute = geometry.getAttribute(name);
    if (!(attribute instanceof BufferAttribute)) {
      return geometry;
    }
    attributes.push(attribute);
  }
  const morphs: BufferAttribute[] = [];
  for (const key of MORPH_KEYS) {
    for (const attribute of geometry.morphAttributes[key] ?? []) {
      if (!(attribute instanceof BufferAttribute)) {
        return geometry;
      }
      morphs.push(attribute);
    }
  }
  const channels: Channel[] = [];
  for (const attribute of [...attributes, ...morphs]) {
    const bits = bitsOf(attribute.array);
    if (!bits) {
      return geometry;
    }
    channels.push({ bits, size: attribute.itemSize });
  }

  const count = position.count;
  let slots = 1;
  while (slots < count * 2) {
    slots *= 2;
  }
  const table = new Int32Array(slots).fill(-1);
  const index = new Uint32Array(count);
  const kept = new Uint32Array(count);
  let keptCount = 0;
  for (let v = 0; v < count; v++) {
    let slot = vertexHash(channels, v) & (slots - 1);
    for (;;) {
      const id = table[slot] ?? -1;
      if (id < 0) {
        table[slot] = keptCount;
        kept[keptCount] = v;
        index[v] = keptCount;
        keptCount += 1;
        break;
      }
      if (sameVertex(channels, kept[id] ?? 0, v)) {
        index[v] = id;
        break;
      }
      slot = (slot + 1) & (slots - 1);
    }
  }

  const keptCorners = kept.subarray(0, keptCount);
  for (const [i, name] of names.entries()) {
    const attribute = attributes[i];
    if (attribute) {
      geometry.setAttribute(name, keptAttribute(attribute, keptCorners));
    }
  }
  for (const key of MORPH_KEYS) {
    const list = geometry.morphAttributes[key];
    if (list) {
      geometry.morphAttributes[key] = list.map((attribute) =>
        attribute instanceof BufferAttribute ? keptAttribute(attribute, keptCorners) : attribute,
      );
    }
  }
  geometry.setIndex(new BufferAttribute(keptCount <= 0xffff ? new Uint16Array(index) : index, 1));
  return geometry;
}

/** The attributes that a depth pass reads: the place of each vertex. */
const DEPTH_ATTRIBUTES = ['position', 'skinIndex', 'skinWeight'] as const;

/** The depth geometry of each player geometry ({@link createDepthGeometry}). */
const depthGeometries = new WeakMap<BufferGeometry, BufferGeometry>();

/**
 * Creates the geometry of the depth passes and of the shadow maps of a geometry, and keeps it for
 * {@link depthGeometryOf} (design 4.5, 9.7): only the attributes that move a vertex, the
 * positions, the skin, and the morph positions, with the groups of the geometry. A depth pass
 * writes no color, so the normals, the colors, and the finish coordinates are not needed, and
 * more corners share one vertex ({@link shareCorners}). The corners of a dynamic position
 * attribute, such as the positions of a keyboard, keep one vertex each.
 *
 * @param geometry A geometry with no index.
 * @returns The depth geometry. It shares the attributes of the geometry that it does not change.
 */
export function createDepthGeometry(geometry: BufferGeometry): BufferGeometry {
  const depth = new BufferGeometry();
  for (const name of DEPTH_ATTRIBUTES) {
    if (geometry.hasAttribute(name)) {
      depth.setAttribute(name, geometry.getAttribute(name));
    }
  }
  const moves = geometry.morphAttributes.position;
  if (moves) {
    depth.morphAttributes.position = moves;
  }
  depth.morphTargetsRelative = geometry.morphTargetsRelative;
  for (const group of geometry.groups) {
    depth.addGroup(group.start, group.count, group.materialIndex);
  }
  const position = geometry.getAttribute('position');
  if (position instanceof BufferAttribute && position.usage === StaticDrawUsage) {
    shareCorners(depth);
  }
  depthGeometries.set(geometry, depth);
  return depth;
}

/**
 * Gives the depth geometry of a geometry from {@link createDepthGeometry}.
 *
 * @param geometry The geometry.
 * @returns The depth geometry, or `null` for a geometry with none.
 */
export function depthGeometryOf(geometry: BufferGeometry): BufferGeometry | null {
  return depthGeometries.get(geometry) ?? null;
}
