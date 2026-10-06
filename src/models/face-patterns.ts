import { MathUtils, Matrix4, Quaternion, Vector3 } from 'three';
import { MIRROR_X, placeCorners, unknownValue } from './body-parts.ts';
import type { BodyColors } from './body-parts.ts';
import { transform } from './mesh.ts';
import { toQuat, toVec3 } from './tuples.ts';
import type { Vec3 } from './tuples.ts';
import type { MeshBuilder, Rgb } from './mesh.ts';
import { EYE_DIRECTION, headSurface } from './head.ts';
import type { SurfacePoint } from './head.ts';
import { box, icosphere } from './primitives.ts';
import { boneIndex } from './rig.ts';
import type { SpeciesParams } from './species.ts';

/** The thickness of a face patch or a stripe, in H. Half of it is above the head surface. */
const PATTERN_THICKNESS = 0.05;

/**
 * Makes a flat oval patch on the head surface.
 *
 * @param h The head height `H`.
 * @param headCenter The center of the head.
 * @param direction The direction of the patch center from the head center.
 * @param size The width and the height of the patch, in H.
 * @param tilt The turn of the patch on the surface. On the right side of the head, a positive
 *   tilt turns its outer end down.
 * @returns The corners of the patch.
 */
function patchCorners(
  h: number,
  headCenter: Vec3,
  direction: Vec3,
  size: readonly [number, number],
  tilt: number,
): number[] {
  const { point, normal } = headSurface(h, headCenter, direction);
  const n = new Vector3(...normal);
  const up = new Vector3(0, 1, 0).projectOnPlane(n).normalize();
  // x × up is the normal, so the thin axis of the patch is normal to the surface.
  const across = new Vector3().crossVectors(up, n);
  const basis = new Matrix4().makeBasis(across, up, new Vector3().crossVectors(across, up));
  const turn = new Quaternion()
    .setFromAxisAngle(n, -tilt)
    .multiply(new Quaternion().setFromRotationMatrix(basis));
  return placeCorners(
    icosphere(0.5, 0),
    transform(point, toQuat(turn), [size[0] * h, size[1] * h, PATTERN_THICKNESS * h]),
  );
}

/**
 * Adds a patch on the right side of the head, and its mirror image on the left side.
 *
 * @param builder The mesh that gets the parts.
 * @param color The color of the patches.
 * @param h The head height `H`.
 * @param headCenter The center of the head. It is on the middle plane (x = 0).
 * @param direction The direction of the right patch from the head center.
 * @param size The width and the height of a patch, in H.
 * @param tilt The turn of the right patch on the surface.
 */
function addPatches(
  builder: MeshBuilder,
  color: Rgb,
  h: number,
  headCenter: Vec3,
  direction: Vec3,
  size: readonly [number, number],
  tilt: number,
): void {
  const corners = patchCorners(h, headCenter, direction, size, tilt);
  builder.add(corners, { color, bone: boneIndex('head') });
  builder.add(corners, { color, bone: boneIndex('head'), at: MIRROR_X });
}

/**
 * Adds a stripe along the head, from the front over the top to the back. The stripe is a chain of
 * flat boxes on the surface.
 *
 * @param builder The mesh that gets the parts.
 * @param color The color of the stripe.
 * @param h The head height `H`.
 * @param headCenter The center of the head.
 * @param side The place across the head, from -1 (left) to 1 (right), in the axes of a unit sphere.
 * @param width The width of the stripe, in H.
 * @param from The start angle above the front direction.
 * @param to The end angle above the front direction. 90° is the top of the head.
 * @param steps The number of boxes.
 */
function addStripe(
  builder: MeshBuilder,
  color: Rgb,
  h: number,
  headCenter: Vec3,
  side: number,
  width: number,
  from: number,
  to: number,
  steps: number,
): void {
  const across = Math.sqrt(1 - side * side);
  const at = (angle: number): SurfacePoint =>
    headSurface(h, headCenter, [side, across * Math.sin(angle), -across * Math.cos(angle)]);
  for (let i = 0; i < steps; i++) {
    const a = at(from + ((to - from) * i) / steps);
    const b = at(from + ((to - from) * (i + 1)) / steps);
    const start = new Vector3(...a.point);
    const end = new Vector3(...b.point);
    const along = end.clone().sub(start);
    const normal = new Vector3(...a.normal).add(new Vector3(...b.normal)).normalize();
    const y = along.clone().projectOnPlane(normal).normalize();
    const x = new Vector3().crossVectors(y, normal);
    const basis = new Matrix4().makeBasis(x, y, new Vector3().crossVectors(x, y));
    // The middle of a chord is inside the curved surface. The box moves out by half of the gap,
    // so that its ends do not stand far above the surface.
    const middle = start.clone().add(end).multiplyScalar(0.5);
    const center = new Vector3(...headCenter);
    const gap = 0.5 * Math.abs(start.distanceTo(center) - middle.distanceTo(center));
    builder.add(box(width * h, along.length(), PATTERN_THICKNESS * h), {
      color,
      bone: boneIndex('head'),
      at: transform(
        toVec3(middle.addScaledVector(normal, gap)),
        toQuat(new Quaternion().setFromRotationMatrix(basis)),
      ),
    });
  }
}

/**
 * Adds the face pattern of a species to the head (design 4.3, 4.5). The pattern has the accent
 * color, except the middle stripe of `stripe`, the face disc, and the eye rings, which have the
 * belly color.
 *
 * @param builder The mesh that gets the parts.
 * @param species The species parameters.
 * @param colors The colors of the species.
 * @param h The head height `H`, in meters.
 * @param headCenter The center of the head.
 */
export function addFacePattern(
  builder: MeshBuilder,
  species: SpeciesParams,
  colors: BodyColors,
  h: number,
  headCenter: Vec3,
): void {
  const color = species.accentParts.includes('face-pattern') ? colors.accent : colors.fur;
  switch (species.facePattern) {
    case 'none':
      return;
    case 'eye-patches':
      // An oval patch around each eye, with its lower end out.
      addPatches(builder, color, h, headCenter, EYE_DIRECTION, [0.3, 0.4], -35 * MathUtils.DEG2RAD);
      return;
    case 'eye-patch':
      // One round patch around the left eye, which the default camera sees (the dog).
      builder.add(
        patchCorners(
          h,
          headCenter,
          [-EYE_DIRECTION[0], EYE_DIRECTION[1], EYE_DIRECTION[2]],
          [0.32, 0.34],
          0,
        ),
        {
          color,
          bone: boneIndex('head'),
        },
      );
      return;
    case 'stripe':
      // A stripe of the belly color from the nose over the head, between two accent stripes
      // that run over the eyes.
      addStripe(
        builder,
        colors.belly,
        h,
        headCenter,
        0,
        0.18,
        -5 * MathUtils.DEG2RAD,
        150 * MathUtils.DEG2RAD,
        7,
      );
      for (const side of [-0.36, 0.36]) {
        addStripe(
          builder,
          color,
          h,
          headCenter,
          side,
          0.14,
          -5 * MathUtils.DEG2RAD,
          150 * MathUtils.DEG2RAD,
          7,
        );
      }
      return;
    case 'forehead-stripes':
      // Two thin short stripes on the forehead. Three wide stripes looked like a grille.
      for (const side of [-0.14, 0.14]) {
        addStripe(
          builder,
          color,
          h,
          headCenter,
          side,
          0.03,
          35 * MathUtils.DEG2RAD,
          65 * MathUtils.DEG2RAD,
          2,
        );
      }
      return;
    case 'face-disc':
      // A large face of the belly color around the eyes, which joins the face below the eyes.
      addPatches(builder, colors.belly, h, headCenter, [0.3, 0.22, -0.93], [0.36, 0.38], 0);
      return;
    case 'eye-rings':
      // A ring of the belly color around each eye, as the white eye ring of a penguin. The
      // black eyes on the black head of the penguin did not show (UX audit 2026-10-06, N8). The
      // eyes of this pattern stand out of the head, above the ring (`buildBiped()`).
      addPatches(builder, colors.belly, h, headCenter, EYE_DIRECTION, [0.22, 0.32], 0);
      return;
    default:
      throw unknownValue('face pattern', species.facePattern);
  }
}
