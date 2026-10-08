import { Vector3 } from 'three';
import { toVec3 } from './tuples.ts';
import type { Vec3 } from './tuples.ts';
import { convexHull } from './hull.ts';
import { splitByField, triangleNormal } from './mesh.ts';
import { loft } from './primitives.ts';
import type { LoftRing } from './primitives.ts';
import type { SpeciesParams } from './species.ts';

/**
 * The rings of the sculpted head, in head heights `H` from the head center (design 4.5). The head
 * is 1.0 H tall and 1.32 H wide at the cheeks. It is the cute head of the polished images
 * (`mockup.png`, `scene.png`): a round crown, and full low cheeks that are widest 0.12 H below the
 * head center. The face is a little flat, and the cheeks reach forward below the eyes to carry
 * the muzzle. The rings stand at the chin, the jaw, the face below the eyes, the cheeks, the
 * brow, and three rings of the crown, so that the facets are 0.23 H across in the default view,
 * as the heads of `mockup.png` (`docs/research/2026-10-07-facet-look.md`). The ring 0.02 H above
 * the head center went away. Every second ring turns by half a segment, out from the widest ring,
 * so that the head has triangle facets. The widest ring has no turn, so its corners at the sides
 * give the full width.
 */
export const HEAD_RINGS: readonly LoftRing[] = [
  { y: -0.5, halfWidth: 0, front: 0, back: 0, z: -0.08 },
  { y: -0.46, halfWidth: 0.3, front: 0.42, back: 0.26, z: -0.05, turn: 0.5 },
  // The back of the jaw ring and of the face ring stays deep, so that the back of the head goes
  // down to the neck ring as a nearly upright wall, with no dark faces that point down.
  { y: -0.37, halfWidth: 0.5, front: 0.58, back: 0.46 },
  { y: -0.25, halfWidth: 0.62, front: 0.63, back: 0.5, turn: 0.5 },
  { y: -0.12, halfWidth: 0.66, front: 0.61, back: 0.5 },
  { y: 0.16, halfWidth: 0.6, front: 0.52, back: 0.53, turn: 0.5 },
  { y: 0.28, halfWidth: 0.54, front: 0.45, back: 0.49, z: 0.01 },
  { y: 0.38, halfWidth: 0.45, front: 0.36, back: 0.41, z: 0.02, turn: 0.5 },
  { y: 0.46, halfWidth: 0.3, front: 0.24, back: 0.29, z: 0.03 },
  { y: 0.5, halfWidth: 0, front: 0, back: 0, z: 0.03 },
];

/**
 * The number of corners of each ring of the head and of the trunk grid (design 4.5, facets). 12
 * corners give facets of the size of `mockup.png` (`docs/research/2026-10-07-facet-look.md`).
 * The rings had 16 corners before.
 */
export const HEAD_SEGMENTS = 12;

/**
 * The extra half width of the cheeks of {@link HEAD_RINGS}, in H (spec 2.5): the widest ring is
 * 0.66 H, against 0.63 H with no cheeks. A species can give its own value (`form.cheeks`).
 */
export const DEFAULT_CHEEKS = 0.03;

/**
 * The share of the cheeks on each ring of {@link HEAD_RINGS}: all of it on the widest ring, and
 * less on the rings above and below it, so that the cheeks stay round.
 */
const CHEEK_SHARES: readonly number[] = [0, 0, 0.3, 0.7, 1, 0.2, 0, 0, 0, 0];

/**
 * The share of the brow of a species (`form.brow`) on the front of each ring of
 * {@link HEAD_RINGS}: all of it on the ring 0.16 H above the head center, above the low eyes, and
 * less on the rings above and below it.
 */
const BROW_SHARES: readonly number[] = [0, 0, 0, 0, 0, 1, 0.6, 0.2, 0, 0];

/**
 * The height of the jaw ring of {@link HEAD_RINGS}, in H from the head center: the lowest ring of
 * the head in the trunk grid. The two rings below it are inside the neck ring.
 */
export const JAW_RING = -0.37;

/**
 * The faceted heads (design 4.5): heads of a few large face planes, as the heads of
 * `lowpoly-animals.png` and `orchestra-latest.png`, in place of the round head of the rings.
 */
export type HeadFacets = 'canine' | 'feline';

/**
 * The points of each faceted head on its right half (x ≥ 0), in H from the head center, for a
 * head width factor of 1 ({@link headWidthFactor}). The head above the jaw ring is the convex hull
 * of these points, their mirror images, and the corners of the jaw ring. Points on one plane
 * make one large face plane.
 */
export const HEAD_FACETS: Readonly<Record<HeadFacets, readonly Vec3[]>> = {
  /**
   * The foxes and the wolf: a flat crown, a forehead in two planes, close eyes, and wide white
   * cheeks.
   */
  canine: [
    [0, 0.5, -0.06],
    [0, 0.49, 0.22],
    [0.306, 0.46, -0.04],
    [0.34, 0.44, 0.25],
    [0, 0.36, -0.36],
    [0, 0.18, -0.57],
    [0.374, 0.19, -0.47],
    [0.159, -0.1, -0.64],
    [0.34, -0.18, -0.55],
    [0.68, -0.22, -0.2],
    [0.589, 0.12, -0.18],
    [0.589, 0, 0.25],
    [0, 0.15, 0.5],
    [0.363, 0.18, 0.42],
    [0.601, -0.33, 0],
    [0.623, -0.33, -0.22],
    [0.34, -0.3, -0.5],
    [0, -0.28, -0.6],
  ],
  /**
   * The cat: a broad flat crown and forehead, and full cheeks low on the face.
   */
  feline: [
    [0, 0.5, -0.1],
    [0, 0.49, 0.2],
    [0.372, 0.49, -0.06],
    [0.372, 0.45, 0.24],
    [0, 0.15, -0.6],
    [0.422, 0.17, -0.48],
    [0, -0.08, -0.66],
    [0.323, -0.15, -0.58],
    [0.67, -0.16, -0.22],
    [0.62, -0.33, -0.22],
    [0.596, -0.33, 0],
    [0.596, 0.15, -0.2],
    [0.62, 0, 0.22],
    [0, 0.15, 0.5],
    [0.372, 0.2, 0.42],
    [0.347, -0.3, -0.52],
    [0, -0.28, -0.62],
  ],
};

/** The largest brow of a species, in H (plan 2.5). */
export const MAX_BROW = 0.08;

/** The place of the eyes on the head, and the edge of the lower face below them (design 4.5). */
export interface EyePlace {
  /**
   * The direction of the right eye from the head center. The eyes sit on the faces between the
   * front and the sides, so that the side view shows them too, as in `animals.webp`.
   */
  readonly direction: Vec3;
  /**
   * The height of the lower face from the head center, in H. The triangles below it get the
   * belly color: the cheeks, the jaw, and the face up to the eyes.
   */
  readonly faceTop: number;
}

/**
 * The low eyes of the cute face: 0.57 H below the head top and 0.39 of the head width apart, as
 * the eyes of the polished images (0.51 to 0.57 below the top). The edge of the lower face is
 * the ring 0.12 H below the head center, 0.045 H below the middle of the eyes. The first eyes
 * were 0.44 H below the top, and the faces looked old.
 */
export const LOW_EYES: EyePlace = { direction: [0.215, -0.06, -0.45], faceTop: -0.08 };

/**
 * The high eyes above a muzzle that starts high on the face: 0.43 H below the head top, as the
 * fox (0.40) and the beagle of the polished images. The low eyes sat on the top of the long
 * muzzle, which hid their lower half.
 */
export const HIGH_EYES: EyePlace = { direction: [0.25, 0.06, -0.45], faceTop: 0 };

/** The snouts that start high on the face, so that their species keep {@link HIGH_EYES}. */
const HIGH_EYE_SNOUTS: ReadonlySet<SpeciesParams['snout']> = new Set([
  'long',
  'blunt',
  'roman',
  'broad',
] as const);

/**
 * Gives the place of the eyes for a snout.
 *
 * @param snout The snout type of the species.
 * @returns {@link HIGH_EYES} above a muzzle that starts high on the face, else {@link LOW_EYES}.
 */
export function eyePlace(snout: SpeciesParams['snout']): EyePlace {
  return HIGH_EYE_SNOUTS.has(snout) ? HIGH_EYES : LOW_EYES;
}

/**
 * Gives the direction of the right eye of a species from the head center: the direction of
 * {@link eyePlace}, turned around the vertical axis to the turn of the species (`eyes.out`). The
 * angle above the horizontal stays, so the eye keeps nearly its height.
 *
 * @param species The species parameters.
 * @returns The direction. The left eye has the mirror image.
 */
export function eyeDirection(species: SpeciesParams): Vec3 {
  const [x, y, z] = eyePlace(species.snout).direction;
  const out = species.eyes.out;
  if (out === undefined) {
    return [x, y, z];
  }

  const flat = Math.hypot(x, z);
  const angle = (out * Math.PI) / 180;
  return [flat * Math.sin(angle), y, -flat * Math.cos(angle)];
}

/** The corner list of the head, in H, with the head center at the origin. */
export const HEAD_CORNERS: readonly number[] = loft(HEAD_RINGS, HEAD_SEGMENTS);

/** The corner lists of the heads of the species, by their cheeks, their head width, and their brow. */
const HEADS_BY_FORM = new Map<string, readonly number[]>([
  [`${DEFAULT_CHEEKS},1,0,round`, HEAD_CORNERS],
]);

/**
 * Gives the factor of the width of the head of a species: its `form.headWidth` over the width
 * that its cheeks give. The rings of the head and the places of the ears scale by it.
 *
 * @param species The species parameters.
 * @returns The factor. It is 1 for a species with no `form.headWidth`.
 */
export function headWidthFactor(species: SpeciesParams): number {
  const width = species.form?.headWidth;
  if (width === undefined) {
    return 1;
  }

  const cheeks = species.form?.cheeks ?? DEFAULT_CHEEKS;
  const widest = Math.max(
    ...HEAD_RINGS.map(
      (ring, i) => ring.halfWidth + (cheeks - DEFAULT_CHEEKS) * (CHEEK_SHARES[i] ?? 0),
    ),
  );
  return width / (2 * widest);
}

/**
 * Gives the rings of the head of a species: the rings of {@link HEAD_RINGS}, with the cheek rings
 * wider or narrower ({@link DEFAULT_CHEEKS}), all rings scaled to the head width of the species
 * ({@link headWidthFactor}), and the rings above the eyes forward by the brow.
 *
 * @param species The species parameters.
 * @returns The rings.
 */
export function headRings(species: SpeciesParams): LoftRing[] {
  const cheeks = species.form?.cheeks ?? DEFAULT_CHEEKS;
  const brow = Math.min(MAX_BROW, species.form?.brow ?? 0);
  const width = headWidthFactor(species);

  const rings = HEAD_RINGS.map((ring, i) =>
    Object.assign({}, ring, {
      halfWidth: (ring.halfWidth + (cheeks - DEFAULT_CHEEKS) * (CHEEK_SHARES[i] ?? 0)) * width,
      front: ring.front + brow * (BROW_SHARES[i] ?? 0),
    }),
  );
  return species.form?.facets === undefined
    ? rings
    : rings.filter((ring) => ring.y <= JAW_RING + 1e-9);
}

/**
 * Gives the corners of a ring, in the order of `loft()` with {@link HEAD_SEGMENTS} segments.
 *
 * @param ring The ring.
 * @returns The corners.
 */
function ringCorners(ring: LoftRing): Vec3[] {
  return Array.from({ length: HEAD_SEGMENTS }, (_, i): Vec3 => {
    const angle = ((i + (ring.turn ?? 0)) / HEAD_SEGMENTS) * 2 * Math.PI;
    const cos = Math.cos(angle);
    const depth = cos >= 0 ? ring.back : ring.front;
    return [ring.halfWidth * Math.sin(angle), ring.y, (ring.z ?? 0) + depth * cos];
  });
}

/**
 * Removes the triangles that lie flat at one height, such as the end fan of a loft at its top
 * ring.
 *
 * @param corners The corner list.
 * @param y The height.
 * @returns The other triangles.
 */
export function withoutFlat(corners: readonly number[], y: number): number[] {
  const out: number[] = [];
  for (let t = 0; t < corners.length; t += 9) {
    const flat = [1, 4, 7].every((k) => Math.abs((corners[t + k] ?? 0) - y) < 1e-9);
    if (!flat) {
      out.push(...corners.slice(t, t + 9));
    }
  }
  return out;
}

/** The faceted head above the jaw ring of each species, by its key. */
const CAPS = new Map<string, readonly number[]>();

/**
 * Gives the faceted head of a species above the jaw ring (design 4.5): the convex hull of the
 * points of its {@link HEAD_FACETS}, their mirror images, and the corners of the jaw ring, less
 * the flat bottom at the jaw ring. The right half comes from the hull, and the left half is its
 * mirror image, so that the two halves have the same triangles.
 *
 * @param species The species parameters.
 * @returns The corner list, in H from the head center, or `null` for a round head.
 */
export function headCap(species: SpeciesParams): readonly number[] | null {
  const facets = species.form?.facets;
  if (facets === undefined) {
    return null;
  }

  const width = headWidthFactor(species);
  // The cheeks change the jaw ring, so they are part of the key.
  const key = `${facets},${width},${species.form?.cheeks ?? DEFAULT_CHEEKS}`;
  const cached = CAPS.get(key);
  if (cached) {
    return cached;
  }

  const jaw = headRings(species).at(-1);
  const points: Vec3[] = [...(jaw ? ringCorners(jaw) : [])];
  for (const [x, y, z] of HEAD_FACETS[facets]) {
    points.push([x * width, y, z]);
    if (x > 0) {
      points.push([-x * width, y, z]);
    }
  }
  const hull = withoutFlat(convexHull(points), JAW_RING);
  const [, right] = splitByField(hull, ([x]) => -x);
  const left: number[] = [];
  for (let t = 0; t < right.length; t += 9) {
    // The mirror image reverses the order of the corners, so that they stay counterclockwise.
    for (const k of [0, 2, 1]) {
      const x = right[t + k * 3] ?? 0;
      left.push(x === 0 ? 0 : -x, right[t + k * 3 + 1] ?? 0, right[t + k * 3 + 2] ?? 0);
    }
  }
  const cap = [...right, ...left];
  CAPS.set(key, cap);
  return cap;
}

/**
 * Gives the corner list of the head of a species, in H, with the head center at the origin.
 *
 * @param species The species parameters.
 * @returns The corner list. Species with equal cheeks, head widths, and brows share one list.
 */
export function headCorners(species: SpeciesParams): readonly number[] {
  const key = [
    species.form?.cheeks ?? DEFAULT_CHEEKS,
    headWidthFactor(species),
    Math.min(MAX_BROW, species.form?.brow ?? 0),
    species.form?.facets ?? 'round',
  ].join(',');
  let corners = HEADS_BY_FORM.get(key);
  if (!corners) {
    const rings = headRings(species);
    const cap = headCap(species);
    corners = cap
      ? [...withoutFlat(loft(rings, HEAD_SEGMENTS), JAW_RING), ...cap]
      : loft(rings, HEAD_SEGMENTS);
    HEADS_BY_FORM.set(key, corners);
  }

  return corners;
}

/** A point on the surface of the head, and the unit normal of the surface there. */
export interface SurfacePoint {
  readonly point: Vec3;
  readonly normal: Vec3;
}

/**
 * Finds the point of the head surface in a direction from the head center: the place where a ray
 * from the center leaves the head.
 *
 * @param h The head height `H`, in meters.
 * @param headCenter The center of the head.
 * @param direction The direction from the head center. It does not need a unit length.
 * @param corners The corner list of the head ({@link headCorners}). Default: the head with
 *   {@link DEFAULT_CHEEKS}.
 * @returns The point and the normal of the face that the ray goes through.
 * @throws Error if the ray misses all faces, which cannot happen for a closed head.
 */
export function headSurface(
  h: number,
  headCenter: Vec3,
  direction: Vec3,
  corners: readonly number[] = HEAD_CORNERS,
): SurfacePoint {
  const d = new Vector3(...direction).normalize();
  for (let t = 0; t < corners.length / 9; t++) {
    const at = (k: number): Vector3 =>
      new Vector3(
        corners[t * 9 + k * 3] ?? 0,
        corners[t * 9 + k * 3 + 1] ?? 0,
        corners[t * 9 + k * 3 + 2] ?? 0,
      );
    const a = at(0);
    const n = new Vector3(...triangleNormal(corners, t));
    const facing = n.dot(d);
    if (facing <= 0) {
      continue;
    }
    // The ray from the origin meets the plane of the face at the distance s.
    const s = n.dot(a) / facing;
    const p = d.clone().multiplyScalar(s);
    const inside = [0, 1, 2].every((k) => {
      const from = at(k);
      const edge = at((k + 1) % 3).sub(from);
      return new Vector3().crossVectors(edge, p.clone().sub(from)).dot(n) >= -1e-12;
    });
    if (inside) {
      return {
        point: toVec3(new Vector3(...headCenter).addScaledVector(p, h)),
        normal: toVec3(n.normalize()),
      };
    }
  }
  throw new Error('The ray misses the head.');
}
