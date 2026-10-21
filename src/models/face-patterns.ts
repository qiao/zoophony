import { Matrix4, Quaternion, Vector3 } from 'three';
import { MIRROR_X, placeCorners, unknownValue } from './body-parts.ts';
import type { BodyColors } from './body-parts.ts';
import { transform } from './mesh.ts';
import { toQuat } from './tuples.ts';
import type { Vec3 } from './tuples.ts';
import type { MeshBuilder, Rgb } from './mesh.ts';
import { EYE_DIRECTION, headSurface } from './head.ts';
import { icosphere } from './primitives.ts';
import { boneIndex } from './rig.ts';
import type { BipedParams } from './species.ts';

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
 * Adds the face pattern of a species to the head (design 4.3, 4.5). The face disc has the belly
 * color.
 *
 * @param builder The mesh that gets the parts.
 * @param species The species parameters.
 * @param colors The colors of the species.
 * @param h The head height `H`, in meters.
 * @param headCenter The center of the head.
 */
export function addFacePattern(
  builder: MeshBuilder,
  species: BipedParams,
  colors: BodyColors,
  h: number,
  headCenter: Vec3,
): void {
  switch (species.facePattern) {
    case 'none':
      return;
    case 'face-disc':
      // A large face of the belly color around each eye, which joins the face below the eyes.
      addPatches(builder, colors.belly, h, headCenter, EYE_DIRECTION, [0.4, 0.44], 0);
      return;
    default:
      throw unknownValue('face pattern', species.facePattern);
  }
}
