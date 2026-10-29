import { Matrix4, Quaternion, Vector3 } from 'three';
import { toQuat, toVec3 } from './tuples.ts';
import type { Vec3 } from './tuples.ts';
import { transform } from './mesh.ts';
import type { MeshBuilder, Rgb } from './mesh.ts';
import { ball } from './primitives.ts';

/** A point on the surface of the head, and the unit normal of the surface there. */
export interface SurfacePoint {
  /** The point. */
  readonly point: Vec3;
  /** The unit normal of the surface at the point. */
  readonly normal: Vec3;
}

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

/**
 * The place of the light of each eye to the +x side of the visible middle of the eye, in H. With
 * it, both lights show on the upper left of each eye seen from the front, as the reflection of one
 * lamp does on two real eyes. The eyes face to the sides, so a light in the middle of each oval
 * showed on the outer side of each eye, and the two lights pointed away from each other (user,
 * 2026-10-21).
 */
const EYE_LIGHT_SIDE = 0.02;

/** The largest place of the light across the oval from its middle, in H, so it stays on the oval. */
const EYE_LIGHT_ACROSS = 0.04;

/** The colors of an eye, in linear values. */
export interface EyeColors {
  /** The black oval. */
  readonly eye: Rgb;
  /** The small white light on the oval. */
  readonly eyeLight: Rgb;
}

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
function bendAt(bend: EyeBend, u: number, v: number): number {
  return bend[0] * u + bend[1] * v + bend[2] * u * u + bend[3] * u * v + bend[4] * v * v;
}

/**
 * Gives the depth of the front of the oval in front of its middle, at a place on the oval.
 *
 * @param u The place across the oval, from the middle, in `H`.
 * @param v The place up the oval, from the middle, in `H`.
 * @returns The depth along the axis of the eye, in `H`.
 */
function frontDepth(u: number, v: number): number {
  const across = u / (0.5 * EYE[0]);
  const share = v / (0.5 * EYE[1]);
  return 0.5 * EYE[2] * Math.sqrt(Math.max(0, 1 - across * across - share * share));
}

/**
 * Gives the place of the light across an eye: the place at which the light, on the front of the
 * oval, stands {@link EYE_LIGHT_SIDE} to the right of the middle of the eye, seen from the front.
 *
 * @param across The axis across the eye.
 * @param n The axis of the eye.
 * @param front The depth of the front of the oval at a place across and up the oval, in `H`.
 * @returns The place across the oval, from the middle, in `H`.
 */
function lightAcross(across: Vector3, n: Vector3, front: (u: number) => number): number {
  let u = 0;
  // An eye that faces fully to the side has no place for the light to the right of its middle.
  if (Math.abs(across.x) < 0.2) {
    return u;
  }
  // Seen from the front, the cheek covers the outer side of an eye that faces to the side, so the
  // visible middle of the eye lies on its inner side, as far from the middle of the oval as the
  // front of the oval lies on its outer side. The depth changes little with the place, so a few
  // steps reach the place.
  const target = -n.x * front(0) + EYE_LIGHT_SIDE;
  for (let step = 0; step < 4; step++) {
    u = (target - n.x * front(u)) / across.x;
    u = Math.min(EYE_LIGHT_ACROSS, Math.max(-EYE_LIGHT_ACROSS, u));
  }
  return u;
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
 * Adds one eye on an eye bone: a black upright oval of 0.13 × 0.18 H, with a wet finish and a
 * small white light above the middle, as the eyes of the polished images. The thin axis of the
 * oval is the normal of the head surface, and its long axis points up along the surface. The light
 * follows the eye bone, so it closes with the eye. A bend moves each point of the oval along the
 * axis, so that the oval follows a curved or a sloped head surface, and the light of a bent eye
 * lies on the front of the oval.
 *
 * @param builder The mesh that gets the parts.
 * @param colors The colors of the eye.
 * @param eye The middle of the eye and the normal of the head surface there.
 * @param h The head height that sizes the eye, in meters.
 * @param bone The eye bone.
 * @param bend The bend of the oval, or none for a flat face.
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
  const u = lightAcross(across, n, () => 0.5 * EYE[2]);
  const light = new Vector3(...point)
    .addScaledVector(n, 0.5 * EYE[2] * h)
    .addScaledVector(across, u * h)
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
 * middle and to the right of the middle seen from the front ({@link lightAcross}), so that it
 * stays on an oval that faces up or to the side. The disc lies flat on the front of the bent oval
 * there, so that it stands only half its depth out of the oval in each view.
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
  const front = (u: number, at: number): number => frontDepth(u, at) + bendAt(bend, u, at);
  const u = lightAcross(across, n, (place) => front(place, v));
  const d = 1e-4;
  // The slopes of the front of the bent oval at the light, along the axes of the eye.
  const slopeU = (front(u + d, v) - front(u - d, v)) / (2 * d);
  const slopeV = (front(u, v + d) - front(u, v - d)) / (2 * d);
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
    .addScaledVector(across, u * h)
    .addScaledVector(n, front(u, v) * h);
  builder.add(ball(0.5, 6, 3), {
    color: colors.eyeLight,
    bone,
    at: transform(toVec3(light), onOval, [EYE_LIGHT * h, EYE_LIGHT * h, EYE_LIGHT_DEPTH * h]),
    finish: 'lacquer',
  });
}
