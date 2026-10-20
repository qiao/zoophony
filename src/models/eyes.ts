import { Matrix4, Quaternion, Vector3 } from 'three';
import type { BodyColors } from './body-parts.ts';
import { EYE_DIRECTION, headSurface } from './head.ts';
import type { SurfacePoint } from './head.ts';
import { toQuat, toVec3 } from './tuples.ts';
import type { Vec3 } from './tuples.ts';
import { transform } from './mesh.ts';
import type { MeshBuilder } from './mesh.ts';
import { ball } from './primitives.ts';
import { boneIndex } from './rig.ts';
import type { BipedParams } from './species.ts';

/** The face patterns with a patch around each eye, over which the eyes stand out. */
const PATCHED_EYES: ReadonlySet<BipedParams['facePattern']> = new Set([
  'eye-patches',
  'face-disc',
] as const);

/** The size of an eye on x, y, and z, in H (design 4.5). */
export const EYE = [0.13, 0.18, 0.06] as const;

/** The number of faces around the axis of an eye. */
const EYE_SEGMENTS = 8;

/** The diameter of the white light on an eye, in H. */
const EYE_LIGHT = 0.04;

/** The height of the light above the middle of the eye, in H. */
const EYE_LIGHT_UP = 0.035;

/** The depth of the light on a bent eye, in H: a thin disc that lies flat on the oval. */
const EYE_LIGHT_DEPTH = 0.008;

/** The colors of an eye: the black oval and its small white light. */
export type EyeColors = Pick<BodyColors, 'eye' | 'eyeLight'>;

/**
 * The bend of an eye: the move of each point of the oval along the axis of the eye, as a function
 * of its place `u` (across) and `v` (up) in the plane of the eye, from the middle:
 * `k0 u + k1 v + k2 u² + k3 u v + k4 v²`. The places and the move are in `H`. A studio body bends
 * each eye to the form of its head surface, so that the rim of the oval lies in the fur (design
 * 4.5, `StudioEyes.bends` of `models/studio-format.ts`).
 */
export type EyeBend = readonly [u: number, v: number, uu: number, uv: number, vv: number];

/**
 * Gives the move of a bend at a place in the plane of an eye.
 *
 * @param bend The bend.
 * @param u The place across the eye, from the middle, in `H`.
 * @param v The place up the eye, from the middle, in `H`.
 * @returns The move along the axis of the eye, in `H`.
 */
export function bendAt(bend: EyeBend, u: number, v: number): number {
  return bend[0] * u + bend[1] * v + bend[2] * u * u + bend[3] * u * v + bend[4] * v * v;
}

/**
 * Gives the depth of the front of the oval in front of its middle, at a place up the oval.
 *
 * @param v The place up the oval, from the middle, in `H`.
 * @returns The depth along the axis of the eye, in `H`.
 */
function frontDepth(v: number): number {
  const share = v / (0.5 * EYE[1]);
  return 0.5 * EYE[2] * Math.sqrt(Math.max(0, 1 - share * share));
}

/**
 * Bends the corners of the unit ball of an eye along its z axis, the axis of the eye.
 *
 * @param corners The corners of the ball of radius 0.5, 9 numbers for each triangle.
 * @param bend The bend.
 * @returns The bent corners, in the units of the ball before its scale to the size of the eye.
 */
function bentBall(corners: readonly number[], bend: EyeBend): number[] {
  const out = [...corners];
  for (let c = 0; c < out.length; c += 3) {
    const u = (out[c] ?? 0) * EYE[0];
    const v = (out[c + 1] ?? 0) * EYE[1];
    out[c + 2] = (out[c + 2] ?? 0) + bendAt(bend, u, v) / EYE[2];
  }
  return out;
}

/**
 * Gives the middle of an eye from the point of the head surface under it: 0.01 H into the head,
 * so that the eye lies half in the head surface. On a patch around the eyes (the eye patches and
 * the face disc), the middle is 0.01 H out of the surface, so that the eye shows above the patch.
 *
 * @param surface The point of the head surface and the unit normal of the surface there.
 * @param h The head height, in meters.
 * @param patched True when a patch around the eye covers the head surface.
 * @returns The middle of the eye, with the normal of the surface.
 */
export function eyeMiddle(surface: SurfacePoint, h: number, patched: boolean): SurfacePoint {
  const depth = patched ? 0.01 : -0.01;
  return {
    point: toVec3(
      new Vector3(...surface.point).addScaledVector(new Vector3(...surface.normal), depth * h),
    ),
    normal: surface.normal,
  };
}

/**
 * Adds one eye on an eye bone: a black upright oval of 0.13 × 0.18 H, with a wet finish and a
 * small white light above the middle, as the eyes of the polished images. The thin axis of the
 * oval is the normal of the head surface, and its long axis points up along the surface. The light
 * follows the eye bone, so it closes with the eye. A bend moves each point of the oval along the
 * axis, so that the oval follows a curved or a sloped head surface, and the light of a bent eye
 * lies on the front of the oval.
 *
 * @param builder The mesh that gets the parts.
 * @param colors The colors of the eye.
 * @param eye The middle of the eye ({@link eyeMiddle}) and the normal of the head surface there.
 * @param h The head height that sizes the eye, in meters.
 * @param bone The eye bone.
 * @param bend The bend of the oval. A flat face of a parametric head needs none.
 */
export function addEye(
  builder: MeshBuilder,
  colors: EyeColors,
  eye: SurfacePoint,
  h: number,
  bone: number,
  bend?: EyeBend,
): void {
  const { point, normal } = eye;
  // The oval lies on the face: its thin axis is the normal of the surface, and its long axis
  // points up along the surface.
  const n = new Vector3(...normal);
  const up = new Vector3(0, 1, 0).projectOnPlane(n).normalize();
  const across = new Vector3().crossVectors(up, n);
  const onFace = toQuat(
    new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(across, up, n)),
  );
  const oval = ball(0.5, EYE_SEGMENTS, 4);
  builder.add(bend ? bentBall(oval, bend) : oval, {
    color: colors.eye,
    bone,
    at: transform(point, onFace, [EYE[0] * h, EYE[1] * h, EYE[2] * h]),
    finish: 'lacquer',
  });

  if (bend) {
    addBentLight(builder, colors, { point, normal }, h, bone, bend);
    return;
  }
  const light = new Vector3(...point)
    .addScaledVector(n, 0.5 * EYE[2] * h)
    .add(new Vector3(0, EYE_LIGHT_UP * h, 0));
  builder.add(ball(0.5, 6, 3), {
    color: colors.eyeLight,
    bone,
    at: transform(toVec3(light), undefined, [EYE_LIGHT * h, EYE_LIGHT * h, 0.5 * EYE_LIGHT * h]),
    finish: 'lacquer',
  });
}

/**
 * Adds the light of a bent eye: a thin disc on the front of the oval, 0.035 H up the oval from the
 * middle, so that it stays on an oval that faces up or to the side. The disc lies flat on the front
 * of the bent oval there, so that it stands only half its depth out of the oval in each view.
 *
 * @param builder The mesh that gets the light.
 * @param colors The colors of the eye.
 * @param eye The middle of the eye and the axis of the eye.
 * @param h The head height that sizes the eye, in meters.
 * @param bone The eye bone.
 * @param bend The bend of the oval.
 */
function addBentLight(
  builder: MeshBuilder,
  colors: EyeColors,
  eye: SurfacePoint,
  h: number,
  bone: number,
  bend: EyeBend,
): void {
  const n = new Vector3(...eye.normal);
  const up = new Vector3(0, 1, 0).projectOnPlane(n).normalize();
  const across = new Vector3().crossVectors(up, n);
  const v = EYE_LIGHT_UP;
  const dv = 1e-4;
  // The slopes of the front of the bent oval at the light, along the axes of the eye.
  const slopeU = bend[0] + bend[3] * v;
  const slopeV = (frontDepth(v + dv) - frontDepth(v - dv)) / (2 * dv) + bend[1] + 2 * bend[4] * v;
  const facing = new Vector3()
    .addScaledVector(across, -slopeU)
    .addScaledVector(up, -slopeV)
    .add(n)
    .normalize();
  const discUp = up.clone().projectOnPlane(facing).normalize();
  const discAcross = new Vector3().crossVectors(discUp, facing);
  const onOval = toQuat(
    new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(discAcross, discUp, facing)),
  );
  const light = new Vector3(...eye.point)
    .addScaledVector(up, v * h)
    .addScaledVector(n, (frontDepth(v) + bendAt(bend, 0, v)) * h);
  builder.add(ball(0.5, 6, 3), {
    color: colors.eyeLight,
    bone,
    at: transform(toVec3(light), onOval, [EYE_LIGHT * h, EYE_LIGHT * h, EYE_LIGHT_DEPTH * h]),
    finish: 'lacquer',
  });
}

/**
 * Adds the eyes to the head of the parametric biped: two eyes of {@link addEye}, wide apart, half
 * in the head surface between the front and the sides (`EYE_DIRECTION` of `head.ts`). On a patch
 * around the eyes (the eye patches and the face disc), the eyes stand 0.02 H further out, so that
 * they show above the patch ({@link eyeMiddle}).
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
  species: BipedParams,
  colors: BodyColors,
  h: number,
  headCenter: Vec3,
): [Vec3, Vec3] {
  const patched = PATCHED_EYES.has(species.facePattern);
  const eyeAt = (side: number): SurfacePoint =>
    eyeMiddle(
      headSurface(h, headCenter, [side * EYE_DIRECTION[0], EYE_DIRECTION[1], EYE_DIRECTION[2]]),
      h,
      patched,
    );
  const eyes = [eyeAt(-1), eyeAt(1)] as const;

  addEye(builder, colors, eyes[0], h, boneIndex('eyeL'));
  addEye(builder, colors, eyes[1], h, boneIndex('eyeR'));

  return [eyes[0].point, eyes[1].point];
}
