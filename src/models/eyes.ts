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
import type { EyeForm, SpeciesParams } from './species.ts';

/** The face patterns with a patch around each eye, over which the eyes stand out. */
const PATCHED_EYES: ReadonlySet<SpeciesParams['facePattern']> = new Set([
  'eye-rings',
  'eye-patches',
  'face-disc',
] as const);

/** The size of an eye of one form (design 4.5), in H. */
export interface EyeSize {
  /** The width of the eye along the face. */
  readonly width: number;
  /** The height of the eye along the face. */
  readonly height: number;
  /** The depth of the eye, normal to the face. */
  readonly depth: number;
  /** The turn of the eye on the face, in radians. A positive tilt lifts the outer end. */
  readonly tilt: number;
}

/**
 * The size of each eye form (design 4.5), as the eyes of `mockup.png`: 0.07 to 0.17 H high. The
 * almond of the cat, the fox, and the wolf is wider than high, and its outer end is 14° up. The
 * oval of the rabbit and the dog is a little higher than wide. The bead of the large species is
 * 0.04 to 0.08 of the head width. All species had round eyes of 0.18 × 0.21 H before (the cute
 * spec of 2026-10-06), 1.2 to 3 times the eyes of `mockup.png`.
 */
export const EYE_SIZES = {
  almond: { width: 0.17, height: 0.095, depth: 0.05, tilt: (14 * Math.PI) / 180 },
  oval: { width: 0.12, height: 0.135, depth: 0.055, tilt: 0 },
  bead: { width: 0.08, height: 0.08, depth: 0.045, tilt: 0 },
} as const satisfies Readonly<Record<EyeForm, EyeSize>>;

/** The number of faces around the axis of an eye. */
const EYE_SEGMENTS = 8;

/**
 * The one white light of each eye (design 4.5): its diameter as a part of the eye height, and
 * the place of its middle at the upper outer side, as parts of the eye width and height. The
 * cute eyes had two lights: 0.075 H at the upper outer side and 0.032 H at the lower inner side.
 */
const EYE_LIGHT = { size: 0.34, out: 0.2, up: 0.22 } as const;

/** The smallest diameter of the light, in H, so that the light of a bead still shows. */
const MIN_LIGHT = 0.026;

/**
 * Adds the eyes to the head: two black eyes of the form of the species ({@link EYE_SIZES}) at the
 * place of {@link eyePlace}, half in the head surface, with a wet finish and one white light. The
 * light follows the eye bone, so it closes with the eye. On a patch around the eyes (the eye
 * rings of the penguin, the eye patches, and the face disc), the eyes stand 0.02 H further out,
 * so that they show above the patch.
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
  const size = EYE_SIZES[species.eyes.form];
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

    // The eye lies on the face: its thin axis is the normal of the surface. Its height axis
    // points up along the surface, turned by the tilt so that the outer end of an almond is up.
    // `across` points to the middle of the face on the right eye, and out on the left eye.
    const n = new Vector3(...normal);
    const sideSign = i === 0 ? -1 : 1;
    const up = new Vector3(0, 1, 0)
      .projectOnPlane(n)
      .normalize()
      .applyAxisAngle(n, -sideSign * size.tilt);
    const across = new Vector3().crossVectors(up, n);
    const onFace = toQuat(
      new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(across, up, n)),
    );
    builder.add(ball(0.5, EYE_SEGMENTS, 4), {
      color: colors.eye,
      bone,
      at: transform(point, onFace, [size.width * h, size.height * h, size.depth * h]),
      finish: 'lacquer',
    });

    const outward = across.clone().multiplyScalar(-sideSign);
    const light = Math.max(MIN_LIGHT, EYE_LIGHT.size * size.height);
    builder.add(ball(0.5, 6, 3), {
      color: colors.eyeLight,
      bone,
      at: transform(lightPlace(point, n, up, outward, size, h), onFace, [
        light * h,
        light * h,
        0.5 * light * h,
      ]),
      finish: 'lacquer',
    });
  }

  return [eyeSurfaces[0].point, eyeSurfaces[1].point];
}

/**
 * Gives the middle of the light on an eye. The middle lies on the front of the eye, so that the
 * light neither floats in front of the eye nor sinks into it.
 *
 * @param eye The middle of the eye.
 * @param normal The unit normal of the face at the eye.
 * @param up The unit direction of the height of the eye along the face.
 * @param outward The unit direction to the outer side of the face.
 * @param size The size of the eye.
 * @param h The head height, in meters.
 * @returns The middle of the light.
 */
function lightPlace(
  eye: Vec3,
  normal: Vector3,
  up: Vector3,
  outward: Vector3,
  size: EyeSize,
  h: number,
): Vec3 {
  // The front of the oval at (out, up) is sqrt(1 - e) of its half depth from the middle plane.
  const out = EYE_LIGHT.out * size.width;
  const rise = EYE_LIGHT.up * size.height;
  const e = (out / (0.5 * size.width)) ** 2 + (rise / (0.5 * size.height)) ** 2;
  const front = 0.5 * size.depth * Math.sqrt(Math.max(0, 1 - e));

  return toVec3(
    new Vector3(...eye)
      .addScaledVector(normal, front * h)
      .addScaledVector(outward, out * h)
      .addScaledVector(up, rise * h),
  );
}
