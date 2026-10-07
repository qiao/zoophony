import { Matrix4, Quaternion, Vector3 } from 'three';
import type { BodyColors } from './body-parts.ts';
import { EYE_DIRECTION, headCorners, headSurface } from './head.ts';
import type { SurfacePoint } from './head.ts';
import { toQuat, toVec3 } from './tuples.ts';
import type { Vec3 } from './tuples.ts';
import { transform } from './mesh.ts';
import type { MeshBuilder } from './mesh.ts';
import { ball } from './primitives.ts';
import { boneIndex } from './rig.ts';
import type { SpeciesParams } from './species.ts';

/** The face patterns with a patch around each eye, over which the eyes stand out. */
const PATCHED_EYES: ReadonlySet<SpeciesParams['facePattern']> = new Set([
  'eye-rings',
  'eye-patches',
  'face-disc',
] as const);

/** The size of an eye on x, y, and z, in H (design 4.5). */
const EYE = [0.13, 0.18, 0.06] as const;

/** The number of faces around the axis of an eye. */
const EYE_SEGMENTS = 8;

/** The diameter of the white light on an eye, in H. */
const EYE_LIGHT = 0.04;

/** The height of the light above the middle of the eye, in H. */
const EYE_LIGHT_UP = 0.035;

/**
 * Adds the eyes to the head: two black upright ovals of 0.13 × 0.18 H, wide apart, half in the
 * head surface, with a wet finish and a small white light above the middle, as the eyes of the
 * polished images. The light follows the eye bone, so it closes with the eye. On a patch around
 * the eyes (the eye rings of the penguin, the eye patches, and the face disc), the eyes stand
 * 0.02 H further out, so that they show above the patch.
 *
 * @param builder The mesh that gets the parts.
 * @param species The species parameters.
 * @param colors The colors of the species.
 * @param h The head height, in meters.
 * @param headCenter The center of the head.
 * @returns The bind positions of the left and the right eye bone: the middle of each eye.
 */
export function addEyes(
  builder: MeshBuilder,
  species: SpeciesParams,
  colors: BodyColors,
  h: number,
  headCenter: Vec3,
): [Vec3, Vec3] {
  const eyeDepth = PATCHED_EYES.has(species.facePattern) ? 0.01 : -0.01;
  const head = headCorners(species);
  const eyeAt = (side: number): SurfacePoint => {
    const { point, normal } = headSurface(
      h,
      headCenter,
      [side * EYE_DIRECTION[0], EYE_DIRECTION[1], EYE_DIRECTION[2]],
      head,
    );
    return {
      point: toVec3(new Vector3(...point).addScaledVector(new Vector3(...normal), eyeDepth * h)),
      normal,
    };
  };
  const eyeSurfaces = [eyeAt(-1), eyeAt(1)] as const;

  for (const [i, { point, normal }] of eyeSurfaces.entries()) {
    const bone = boneIndex(i === 0 ? 'eyeL' : 'eyeR');
    // The oval lies on the face: its thin axis is the normal of the surface, and its long axis
    // points up along the surface.
    const n = new Vector3(...normal);
    const up = new Vector3(0, 1, 0).projectOnPlane(n).normalize();
    const across = new Vector3().crossVectors(up, n);
    const onFace = toQuat(
      new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(across, up, n)),
    );
    builder.add(ball(0.5, EYE_SEGMENTS, 4), {
      color: colors.eye,
      bone,
      at: transform(point, onFace, [EYE[0] * h, EYE[1] * h, EYE[2] * h]),
      finish: 'lacquer',
    });

    const light = new Vector3(...point)
      .addScaledVector(new Vector3(...normal), 0.5 * EYE[2] * h)
      .add(new Vector3(0, EYE_LIGHT_UP * h, 0));
    builder.add(ball(0.5, 6, 3), {
      color: colors.eyeLight,
      bone,
      at: transform(toVec3(light), undefined, [EYE_LIGHT * h, EYE_LIGHT * h, 0.5 * EYE_LIGHT * h]),
      finish: 'lacquer',
    });
  }

  return [eyeSurfaces[0].point, eyeSurfaces[1].point];
}
