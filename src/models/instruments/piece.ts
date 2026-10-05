import {
  IDENTITY,
  add,
  applyTransform,
  length,
  rotationBetween,
  scale,
  sub,
  transform,
} from '../math.ts';
import type { Transform, Vec3 } from '../math.ts';
import type { MaterialGroup, Rgb } from '../mesh.ts';
import { box, cylinder } from '../primitives.ts';
import type {
  HoldAnchor,
  InstrumentBone,
  InstrumentPart,
  InstrumentPiece,
  PieceHold,
} from './types.ts';

/**
 * Applies a transform to each corner of a corner list. A mirror scale turns the faces inside out,
 * so then the corner order of each triangle changes to keep the faces outside.
 *
 * @param corners The corner list, 9 numbers for each triangle.
 * @param at The transform.
 * @returns The new corner list.
 */
export function placeCorners(corners: readonly number[], at: Transform): number[] {
  const mirrored = at.scale[0] * at.scale[1] * at.scale[2] < 0;
  const order = mirrored ? [0, 2, 1] : [0, 1, 2];
  const out: number[] = [];
  for (let t = 0; t < corners.length / 9; t++) {
    for (const k of order) {
      const i = t * 9 + k * 3;
      out.push(...applyTransform(at, [corners[i] ?? 0, corners[i + 1] ?? 0, corners[i + 2] ?? 0]));
    }
  }
  return out;
}

/**
 * Makes a hold.
 *
 * @param anchor The body point of the hold.
 * @param offsetH The offset from the anchor in head heights.
 * @param rotation The rotation of the piece axes.
 * @param offset A further offset in meters.
 * @returns The hold.
 */
export function hold(
  anchor: HoldAnchor,
  offsetH: Vec3 = [0, 0, 0],
  rotation = IDENTITY,
  offset: Vec3 = [0, 0, 0],
): PieceHold {
  return { anchor, offsetH, offset, rotation };
}

/** Collects the parts of one piece in the axes of the piece. */
export class PieceBuilder {
  readonly #parts: InstrumentPart[] = [];
  readonly #size: number;

  /**
   * Creates an empty piece.
   *
   * @param size A scale for all parts. It applies after the placement of each part.
   */
  constructor(size = 1) {
    this.#size = size;
  }

  /**
   * Adds one part.
   *
   * @param corners The corner list of the part in its own axes.
   * @param color The color.
   * @param at The placement of the part in the piece axes, before the size scale.
   * @param group The material group.
   */
  add(
    corners: readonly number[],
    color: Rgb,
    at: Transform = transform(),
    group: MaterialGroup = 'matte',
  ): void {
    const s = this.#size;
    const placed = placeCorners(corners, at);
    this.#parts.push({ corners: s === 1 ? placed : placed.map((c) => c * s), color, group });
  }

  /**
   * Adds a closed cylinder from one point to another.
   *
   * @param from The center of the first end.
   * @param to The center of the second end.
   * @param radius The radius.
   * @param segments The number of side faces.
   * @param color The color.
   * @param group The material group.
   */
  rod(
    from: Vec3,
    to: Vec3,
    radius: number,
    segments: number,
    color: Rgb,
    group: MaterialGroup = 'matte',
  ): void {
    const axis = sub(to, from);
    this.add(
      cylinder(radius, radius, length(axis), segments),
      color,
      transform(from, rotationBetween([0, 1, 0], axis)),
      group,
    );
  }

  /**
   * Adds a box from one point to another. The box keeps its x axis when the segment lies in the
   * y-z plane.
   *
   * @param from The center of the first end.
   * @param to The center of the second end.
   * @param width The size on x.
   * @param depth The size normal to x and to the segment.
   * @param color The color.
   * @param group The material group.
   */
  bar(
    from: Vec3,
    to: Vec3,
    width: number,
    depth: number,
    color: Rgb,
    group: MaterialGroup = 'matte',
  ): void {
    const axis = sub(to, from);
    this.add(
      box(width, length(axis), depth),
      color,
      transform(add(from, scale(axis, 0.5)), rotationBetween([0, 1, 0], axis)),
      group,
    );
  }

  /**
   * Makes the piece of all parts so far.
   *
   * @param bone The bone that carries the piece.
   * @param pieceHold The place of the piece in the bind pose.
   * @returns The piece.
   */
  build(bone: InstrumentBone, pieceHold: PieceHold): InstrumentPiece {
    return { bone, parts: [...this.#parts], hold: pieceHold };
  }
}

/** The box around a set of points. */
export interface Bounds {
  readonly min: Vec3;
  readonly max: Vec3;
}

/**
 * Calculates the box around all corners of a piece.
 *
 * @param piece The piece.
 * @returns The box in the axes of the piece.
 */
export function pieceBounds(piece: InstrumentPiece): Bounds {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const part of piece.parts) {
    for (let i = 0; i < part.corners.length; i++) {
      const c = part.corners[i] ?? 0;
      const axis = i % 3;
      min[axis] = Math.min(min[axis] ?? Infinity, c);
      max[axis] = Math.max(max[axis] ?? -Infinity, c);
    }
  }
  return {
    min: [min[0] ?? 0, min[1] ?? 0, min[2] ?? 0],
    max: [max[0] ?? 0, max[1] ?? 0, max[2] ?? 0],
  };
}

/**
 * Calculates the size of the box around a piece.
 *
 * @param piece The piece.
 * @returns The extent on each axis of the piece, in meters.
 */
export function pieceSize(piece: InstrumentPiece): Vec3 {
  const { min, max } = pieceBounds(piece);
  return [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
}

/**
 * Counts the triangles of all pieces.
 *
 * @param pieces The pieces.
 * @returns The number of triangles.
 */
export function triangleCount(pieces: readonly InstrumentPiece[]): number {
  let count = 0;
  for (const piece of pieces) {
    for (const part of piece.parts) {
      count += part.corners.length / 9;
    }
  }
  return count;
}
