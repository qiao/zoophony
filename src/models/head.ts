import { Vector3 } from 'three';
import { toVec3 } from './tuples.ts';
import type { Vec3 } from './tuples.ts';
import { triangleNormal } from './mesh.ts';
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

/** The corner list of the head, in H, with the head center at the origin. */
export const HEAD_CORNERS: readonly number[] = loft(HEAD_RINGS, HEAD_SEGMENTS);

/** The corner lists of the heads of the species, by their cheeks and their brow. */
const HEADS_BY_FORM = new Map<string, readonly number[]>([[`${DEFAULT_CHEEKS},0`, HEAD_CORNERS]]);

/**
 * Gives the rings of the head of a species: the rings of {@link HEAD_RINGS}, with the cheek rings
 * wider or narrower ({@link DEFAULT_CHEEKS}), and the rings above the eyes forward by the brow.
 *
 * @param species The species parameters.
 * @returns The rings.
 */
export function headRings(species: SpeciesParams): LoftRing[] {
  const cheeks = species.form?.cheeks ?? DEFAULT_CHEEKS;
  const brow = Math.min(MAX_BROW, species.form?.brow ?? 0);

  return HEAD_RINGS.map((ring, i) =>
    Object.assign({}, ring, {
      halfWidth: ring.halfWidth + (cheeks - DEFAULT_CHEEKS) * (CHEEK_SHARES[i] ?? 0),
      front: ring.front + brow * (BROW_SHARES[i] ?? 0),
    }),
  );
}

/**
 * Gives the corner list of the head of a species, in H, with the head center at the origin.
 *
 * @param species The species parameters.
 * @returns The corner list. Species with equal cheeks and brows share one list.
 */
export function headCorners(species: SpeciesParams): readonly number[] {
  const key = `${species.form?.cheeks ?? DEFAULT_CHEEKS},${Math.min(MAX_BROW, species.form?.brow ?? 0)}`;
  let corners = HEADS_BY_FORM.get(key);
  if (!corners) {
    corners = loft(headRings(species), HEAD_SEGMENTS);
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
