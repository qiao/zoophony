import { Quaternion, Vector3 } from 'three';
import { alongAxis } from './body-parts.ts';
import type { Vec3 } from './tuples.ts';

/** One ring of a swept tube: a place on its path, the direction of the path there, and a size. */
export interface SweepRing {
  /** The middle of the ring. */
  readonly at: Vec3;
  /** The direction of the path at the ring, from the first ring to the last. Any length. */
  readonly axis: Vec3;
  /** The radius of the ring. 0 makes a point, which closes an end of the tube. */
  readonly radius: number;
  /**
   * The turn of the ring around the path, in parts of one side: 0 or 0.5. Neighbor rings with
   * different turns make triangle facets in place of flat quads, as the limbs of `animals.webp`.
   */
  readonly turn: number;
  /**
   * The scale of the ring across the path and across the side direction of the sweep. 1 gives a
   * circle. Default 1.
   */
  readonly flat?: number;
}

/** How a swept tube ends at its first or its last ring. */
export type SweepEnd =
  /** A flat cap closes the end. A point ring needs no cap. */
  | 'cap'
  /** The end stays open, so that the next part continues the tube from the same ring. */
  | 'open';

/** The options of a swept tube. */
export interface SweepOptions {
  /** The number of corners of each ring. */
  readonly sides: number;
  /**
   * The side direction of the sweep. The first corner of a ring with the turn 0 lies across the
   * path from it, and `flat` scales the rings across the path and this direction. It must not be
   * parallel to the path at a ring. A path in a plane with the side direction normal to the
   * plane gives rings with no twist.
   */
  readonly side: Vec3;
  /** The end at the first ring. Default `cap`. */
  readonly start?: SweepEnd;
  /** The end at the last ring. Default `cap`. */
  readonly end?: SweepEnd;
}

/** Scratch rotation of {@link ringCorners}. Each call writes it before it reads it. */
const scratchRotation = new Quaternion();

/** Scratch corner of {@link ringCorners}. Each call writes it before it reads it. */
const scratchCorner = new Vector3();

/**
 * Gives the corners of one ring of a swept tube.
 *
 * @param ring The ring.
 * @param sides The number of corners.
 * @param side The side direction of the sweep.
 * @returns The corners, in the order of their angles around the path.
 */
function ringCorners(ring: SweepRing, sides: number, side: Vec3): Vec3[] {
  scratchRotation.set(...alongAxis(ring.axis, side));
  const flat = ring.flat ?? 1;
  const corners: Vec3[] = [];

  for (let i = 0; i < sides; i++) {
    // The local axes: x toward the side direction, y along the path, and z across both. The
    // corner angle starts at z, as in `tube()`.
    const angle = ((i + ring.turn) / sides) * 2 * Math.PI;
    scratchCorner
      .set(ring.radius * Math.sin(angle), 0, ring.radius * flat * Math.cos(angle))
      .applyQuaternion(scratchRotation);
    corners.push([
      ring.at[0] + scratchCorner.x,
      ring.at[1] + scratchCorner.y,
      ring.at[2] + scratchCorner.z,
    ]);
  }
  return corners;
}

/**
 * Makes a faceted tube through rings along a bent path (design 4.5, facets), such as a leg from
 * the hip through the knee to the ankle. The corners of each ring follow the turn of the path,
 * so a bend gives one smooth surface with no ball at the joint. The triangles go from the first
 * ring to the last, with the same pattern as `tube()`, so a tube that splits at a ring into two
 * sweeps gives the same triangles as one sweep.
 *
 * @param rings The rings from the first to the last. Only an end ring can have the radius 0.
 * @param options The sides, the side direction, and the ends.
 * @returns 2 triangles for each side of each step between two rings, less the triangles at a
 *   point, plus `sides` triangles for each end with a cap. The corners go counterclockwise when
 *   seen from outside.
 */
export function sweep(rings: readonly SweepRing[], options: SweepOptions): number[] {
  const { sides, side } = options;
  const corners = rings.map((ring) => ringCorners(ring, sides, side));
  const out: number[] = [];

  for (let j = 0; j + 1 < rings.length; j++) {
    const lower = rings[j];
    const upper = rings[j + 1];
    const from = corners[j];
    const to = corners[j + 1];
    if (!lower || !upper || !from || !to) {
      continue;
    }

    // The upper corner i lies between the lower corners i and i + 1 when it turns by half a side
    // more.
    const ahead = upper.turn > lower.turn;
    for (let i = 0; i < sides; i++) {
      const a = from[i] ?? lower.at;
      const b = from[(i + 1) % sides] ?? lower.at;
      const c = to[(i + 1) % sides] ?? upper.at;
      const d = to[i] ?? upper.at;
      // At a point, the corners of the point ring are one corner, so one triangle remains.
      if (lower.radius === 0) {
        out.push(...a, ...c, ...d);
      } else if (upper.radius === 0) {
        out.push(...a, ...b, ...c);
      } else if (ahead) {
        out.push(...a, ...b, ...d, ...b, ...c, ...d);
      } else {
        out.push(...a, ...b, ...c, ...a, ...c, ...d);
      }
    }
  }

  const first = rings[0];
  const last = rings.at(-1);
  const firstCorners = corners[0];
  const lastCorners = corners.at(-1);
  for (let i = 0; i < sides; i++) {
    if ((options.start ?? 'cap') === 'cap' && first && firstCorners && first.radius > 0) {
      out.push(
        ...first.at,
        ...(firstCorners[(i + 1) % sides] ?? first.at),
        ...(firstCorners[i] ?? first.at),
      );
    }
    if ((options.end ?? 'cap') === 'cap' && last && lastCorners && last.radius > 0) {
      out.push(
        ...last.at,
        ...(lastCorners[i] ?? last.at),
        ...(lastCorners[(i + 1) % sides] ?? last.at),
      );
    }
  }
  return out;
}
