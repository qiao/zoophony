import { Matrix4, Quaternion, Vector3 } from 'three';
import type { BodyColors } from './body-parts.ts';
import { eyePlace, headCorners, headSurface } from './head.ts';
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
const EYE = [0.18, 0.21, 0.06] as const;

/** The number of faces around the axis of an eye. */
const EYE_SEGMENTS = 8;

/** One white light on an eye: its diameter, and the place of its middle on the eye. */
interface EyeLight {
  /** The diameter of the light, in H. */
  readonly size: number;
  /** The distance of the middle to the outer side of the face, in H. Negative: to the nose. */
  readonly out: number;
  /** The distance of the middle above the middle of the eye, in H. */
  readonly up: number;
}

/**
 * The two white lights of each eye (design 4.5): a large light at the upper outer side and a
 * small light at the lower inner side, as the glossy eyes of the polished images. The first eyes
 * had one light of 0.04 H above the middle.
 */
const EYE_LIGHTS: readonly EyeLight[] = [
  { size: 0.075, out: 0.032, up: 0.045 },
  { size: 0.032, out: -0.04, up: -0.059 },
];

/**
 * Adds the eyes to the head: two black upright ovals of 0.18 × 0.21 H at the place of
 * {@link eyePlace}, half in the head surface, with a wet finish and two white lights, as the eyes of the polished images.
 * The lights follow the eye bone, so they close with the eye. On a patch around the eyes (the
 * eye rings of the penguin, the eye patches, and the face disc), the eyes stand 0.02 H further
 * out, so that they show above the patch.
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
  const [dx, dy, dz] = eyePlace(species.snout).direction;
  const head = headCorners(species);
  const eyeAt = (side: number): SurfacePoint => {
    const { point, normal } = headSurface(h, headCenter, [side * dx, dy, dz], head);
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

    // `across` points to the middle of the face on the right eye, and out on the left eye.
    const outward = across.clone().multiplyScalar(i === 0 ? 1 : -1);
    for (const light of EYE_LIGHTS) {
      builder.add(ball(0.5, 6, 3), {
        color: colors.eyeLight,
        bone,
        at: transform(lightPlace(point, n, up, outward, light, h), onFace, [
          light.size * h,
          light.size * h,
          0.5 * light.size * h,
        ]),
        finish: 'lacquer',
      });
    }
  }

  return [eyeSurfaces[0].point, eyeSurfaces[1].point];
}

/**
 * Gives the middle of a light on an eye. The middle lies on the front of the oval, so that the
 * light neither floats in front of the eye nor sinks into it.
 *
 * @param eye The middle of the eye.
 * @param normal The unit normal of the face at the eye.
 * @param up The unit direction up along the face.
 * @param outward The unit direction to the outer side of the face.
 * @param light The light.
 * @param h The head height, in meters.
 * @returns The middle of the light.
 */
function lightPlace(
  eye: Vec3,
  normal: Vector3,
  up: Vector3,
  outward: Vector3,
  light: EyeLight,
  h: number,
): Vec3 {
  // The front of the oval at (out, up) is sqrt(1 - e) of its half depth from the middle plane.
  const e = (light.out / (0.5 * EYE[0])) ** 2 + (light.up / (0.5 * EYE[1])) ** 2;
  const front = 0.5 * EYE[2] * Math.sqrt(Math.max(0, 1 - e));

  return toVec3(
    new Vector3(...eye)
      .addScaledVector(normal, front * h)
      .addScaledVector(outward, light.out * h)
      .addScaledVector(up, light.up * h),
  );
}
