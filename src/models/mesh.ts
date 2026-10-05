import { add, cross, dot, rotate, sub } from './math.ts';
import { IDENTITY } from './tuples.ts';
import type { Quat, Vec3 } from './tuples.ts';

/** A color as linear (r, g, b), each 0 to 1. three.js reads vertex colors in this space. */
export type Rgb = readonly [number, number, number];

/** The material group of a triangle (design 4.5, materials). */
export type MaterialGroup = 'matte' | 'metal';

/**
 * The geometry data of one mesh. The arrays hold no index: each triangle has its own three
 * vertices, so that the flat faces need no vertex split. The matte triangles come first, then
 * the metal triangles.
 */
export interface MeshData {
  /** x, y, z of each vertex, in meters. Three vertices for each triangle, counterclockwise from outside. */
  readonly positions: Float32Array;
  /** Linear r, g, b of each vertex. */
  readonly colors: Float32Array;
  /** The bone of each vertex. Each vertex follows exactly one bone (design 4.4). 0 for a static mesh. */
  readonly bones: Uint8Array;
  /** The number of triangles in the matte group. The other triangles are in the metal group. */
  readonly matteTriangles: number;
}

/** A placement of a part: scale first, then rotation, then translation. */
export interface Transform {
  readonly position: Vec3;
  readonly rotation: Quat;
  readonly scale: Vec3;
}

/**
 * Makes a transform. The arguments that are left out change nothing.
 *
 * @param position The translation.
 * @param rotation The rotation.
 * @param scaleBy The scale on each axis.
 * @returns The transform.
 */
export function transform(
  position: Vec3 = [0, 0, 0],
  rotation: Quat = IDENTITY,
  scaleBy: Vec3 = [1, 1, 1],
): Transform {
  return { position, rotation, scale: scaleBy };
}

/**
 * Applies a transform to a point.
 *
 * @param t The transform.
 * @param p The point.
 * @returns The point after the scale, the rotation, and the translation.
 */
export function applyTransform(t: Transform, p: Vec3): Vec3 {
  const scaled: Vec3 = [p[0] * t.scale[0], p[1] * t.scale[1], p[2] * t.scale[2]];
  return add(rotate(t.rotation, scaled), t.position);
}

/** The placement and the look of one part of a mesh. */
export interface PartOptions {
  readonly color: Rgb;
  /** The index of the bone that the part follows. Default 0. */
  readonly bone?: number;
  /** The placement of the part. Default: no change. */
  readonly at?: Transform;
  /** Default `matte`. */
  readonly group?: MaterialGroup;
}

/**
 * Converts a CSS hex color in sRGB to linear r, g, b.
 *
 * @param hex A color such as `#a8a090`.
 * @returns The linear color.
 */
export function srgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16);
  const channel = (byte: number): number => {
    const c = byte / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return [channel((value >> 16) & 0xff), channel((value >> 8) & 0xff), channel(value & 0xff)];
}

/**
 * Calculates the normal of a triangle of a flat corner list.
 *
 * @param corners The corner list, 9 numbers for each triangle.
 * @param triangle The index of the triangle.
 * @returns The normal, not normalized. Its length is two times the area.
 */
export function triangleNormal(corners: readonly number[], triangle: number): Vec3 {
  const at = (k: number): Vec3 => {
    const i = triangle * 9 + k * 3;
    return [corners[i] ?? 0, corners[i + 1] ?? 0, corners[i + 2] ?? 0];
  };
  const a = at(0);
  return cross(sub(at(1), a), sub(at(2), a));
}

/**
 * Splits the triangles of a corner list by the direction of their faces.
 *
 * @param corners The corner list, 9 numbers for each triangle.
 * @param direction A unit direction.
 * @param minDot The smallest cosine between the face normal and `direction` that matches.
 * @returns The matching triangles, then the other triangles.
 */
export function splitByFacing(
  corners: readonly number[],
  direction: Vec3,
  minDot: number,
): [number[], number[]] {
  const matching: number[] = [];
  const others: number[] = [];
  for (let t = 0; t < corners.length / 9; t++) {
    const n = triangleNormal(corners, t);
    const cosine = dot(n, direction) / Math.hypot(n[0], n[1], n[2]);
    (cosine >= minDot ? matching : others).push(...corners.slice(t * 9, t * 9 + 9));
  }
  return [matching, others];
}

/**
 * Splits the triangles of a corner list by the place of their centroids.
 *
 * @param corners The corner list, 9 numbers for each triangle.
 * @param match The test of a centroid.
 * @returns The matching triangles, then the other triangles.
 */
export function splitByCentroid(
  corners: readonly number[],
  match: (centroid: Vec3) => boolean,
): [number[], number[]] {
  const matching: number[] = [];
  const others: number[] = [];
  for (let t = 0; t < corners.length / 9; t++) {
    const mean = (axis: number): number =>
      ((corners[t * 9 + axis] ?? 0) +
        (corners[t * 9 + 3 + axis] ?? 0) +
        (corners[t * 9 + 6 + axis] ?? 0)) /
      3;
    (match([mean(0), mean(1), mean(2)]) ? matching : others).push(
      ...corners.slice(t * 9, t * 9 + 9),
    );
  }
  return [matching, others];
}

class GroupBuffer {
  readonly positions: number[] = [];
  readonly colors: number[] = [];
  readonly bones: number[] = [];
}

/** Collects the parts of one mesh, and makes its {@link MeshData}. */
export class MeshBuilder {
  readonly #matte = new GroupBuffer();
  readonly #metal = new GroupBuffer();

  /**
   * Adds the triangles of one part.
   *
   * @param corners The corner list of the part in its own axes, 9 numbers for each triangle.
   * @param options The color, the bone, the placement, and the material group.
   */
  add(corners: readonly number[], options: PartOptions): void {
    const buffer = options.group === 'metal' ? this.#metal : this.#matte;
    const at = options.at ?? transform();
    const bone = options.bone ?? 0;
    // A mirror scale turns the faces inside out. Then the corner order changes to keep them outside.
    const mirrored = at.scale[0] * at.scale[1] * at.scale[2] < 0;
    const order = mirrored ? [0, 2, 1] : [0, 1, 2];
    for (let t = 0; t < corners.length / 9; t++) {
      for (const k of order) {
        const i = t * 9 + k * 3;
        const p = applyTransform(at, [corners[i] ?? 0, corners[i + 1] ?? 0, corners[i + 2] ?? 0]);
        buffer.positions.push(p[0], p[1], p[2]);
        buffer.colors.push(options.color[0], options.color[1], options.color[2]);
        buffer.bones.push(bone);
      }
    }
  }

  /**
   * Adds all triangles of a built mesh at a placement. Each triangle keeps its color, its bone,
   * and its material group. Thus many static props merge into one mesh (design 4.4).
   *
   * @param data The mesh data.
   * @param at The placement. It has no mirror scale.
   */
  addMesh(data: MeshData, at: Transform): void {
    const matteVertices = data.matteTriangles * 3;
    for (let v = 0; v < data.bones.length; v++) {
      const buffer = v < matteVertices ? this.#matte : this.#metal;
      const i = v * 3;
      const p = applyTransform(at, [
        data.positions[i] ?? 0,
        data.positions[i + 1] ?? 0,
        data.positions[i + 2] ?? 0,
      ]);
      buffer.positions.push(p[0], p[1], p[2]);
      buffer.colors.push(data.colors[i] ?? 0, data.colors[i + 1] ?? 0, data.colors[i + 2] ?? 0);
      buffer.bones.push(data.bones[v] ?? 0);
    }
  }

  /** The number of triangles added so far. */
  get triangleCount(): number {
    return (this.#matte.bones.length + this.#metal.bones.length) / 3;
  }

  /**
   * Makes the mesh data of all parts.
   *
   * @returns The data, with the matte triangles first.
   */
  build(): MeshData {
    const matte = this.#matte;
    const metal = this.#metal;
    return {
      positions: new Float32Array([...matte.positions, ...metal.positions]),
      colors: new Float32Array([...matte.colors, ...metal.colors]),
      bones: new Uint8Array([...matte.bones, ...metal.bones]),
      matteTriangles: matte.bones.length / 3,
    };
  }
}
